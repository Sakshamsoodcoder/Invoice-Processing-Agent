import logging
from typing import Dict, Any, List, Tuple
from app.schemas.invoice import ValidationResult, ValidationCheckResult

logger = logging.getLogger("invoice_ai.services.validator")

TOLERANCE = 0.05

class InvoiceValidator:
    @staticmethod
    def validate(invoice_data: Dict[str, Any]) -> ValidationResult:
        """
        Executes deterministic rules against extracted invoice data:
        1. subtotal + tax = total
        2. quantity * unit_price = line item amount
        3. sum(line_items) = subtotal
        4. invoice number exists
        5. vendor name exists
        6. invoice date exists
        7. total exists
        8. tax >= 0
        9. quantity >= 0 for all items
        """
        checks: List[ValidationCheckResult] = []
        issues: List[str] = []

        subtotal = invoice_data.get("subtotal") or 0.0
        tax = invoice_data.get("tax") or 0.0
        total = invoice_data.get("total") or 0.0
        line_items = invoice_data.get("line_items") or []
        currency = invoice_data.get("currency") or "USD"
        invoice_number = invoice_data.get("invoice_number")
        vendor_name = invoice_data.get("vendor_name")
        invoice_date = invoice_data.get("invoice_date")

        # 1. Total Math Check: subtotal + tax = total
        expected_total = round(subtotal + tax, 2)
        total_mismatch = abs(expected_total - total) > TOLERANCE
        if total_mismatch:
            msg = f"Mathematical Mismatch: Subtotal ({currency} {subtotal:.2f}) + Tax ({currency} {tax:.2f}) = {currency} {expected_total:.2f}, but extracted Total is {currency} {total:.2f} (diff: {currency} {abs(expected_total - total):.2f})"
            issues.append(msg)
            checks.append(ValidationCheckResult(
                name="Total Math (Subtotal + Tax = Total)",
                passed=False,
                expected=f"{currency} {expected_total:.2f}",
                actual=f"{currency} {total:.2f}",
                message=msg
            ))
        else:
            checks.append(ValidationCheckResult(
                name="Total Math (Subtotal + Tax = Total)",
                passed=True,
                expected=f"{currency} {expected_total:.2f}",
                actual=f"{currency} {total:.2f}",
                message=f"Subtotal + Tax matches Total within tolerance ({currency} {total:.2f})."
            ))

        # 2. Line items math: quantity * unit_price = amount
        item_math_passed = True
        for idx, item in enumerate(line_items, 1):
            qty = item.get("quantity") or 0.0
            price = item.get("unit_price") or 0.0
            amt = item.get("amount") or 0.0
            expected_amt = round(qty * price, 2)
            if abs(expected_amt - amt) > TOLERANCE:
                item_math_passed = False
                desc = item.get("description", f"Item #{idx}")
                msg = f"Line Item Mismatch on '{desc}': {qty} × {currency} {price:.2f} = {currency} {expected_amt:.2f}, but line amount is {currency} {amt:.2f}"
                issues.append(msg)

        checks.append(ValidationCheckResult(
            name="Line Item Calculations (Qty × Unit Price = Amount)",
            passed=item_math_passed,
            expected="All line calculations correct",
            actual="Discrepancies found" if not item_math_passed else "All items verified",
            message="All line item quantities and prices match amounts." if item_math_passed else "One or more line items have mathematical calculation discrepancies."
        ))

        # 3. Sum of Line items vs Subtotal
        if line_items:
            items_sum = round(sum(item.get("amount", 0.0) for item in line_items), 2)
            sum_mismatch = abs(items_sum - subtotal) > TOLERANCE
            if sum_mismatch:
                msg = f"Subtotal Discrepancy: Sum of line items ({currency} {items_sum:.2f}) does not match invoice Subtotal ({currency} {subtotal:.2f})"
                issues.append(msg)
                checks.append(ValidationCheckResult(
                    name="Line Items Sum vs Subtotal",
                    passed=False,
                    expected=f"{currency} {subtotal:.2f}",
                    actual=f"{currency} {items_sum:.2f}",
                    message=msg
                ))
            else:
                checks.append(ValidationCheckResult(
                    name="Line Items Sum vs Subtotal",
                    passed=True,
                    expected=f"{currency} {subtotal:.2f}",
                    actual=f"{currency} {items_sum:.2f}",
                    message=f"Sum of line items matches Subtotal ({currency} {subtotal:.2f})."
                ))
        else:
            checks.append(ValidationCheckResult(
                name="Line Items Presence",
                passed=False,
                expected="At least 1 item",
                actual="0 items",
                message="No individual line items were extracted."
            ))
            issues.append("No line items found on invoice.")

        # 4. Mandatory Field: Invoice Number
        has_inv_num = bool(invoice_number and str(invoice_number).strip())
        checks.append(ValidationCheckResult(
            name="Invoice Number Field",
            passed=has_inv_num,
            expected="Present",
            actual=str(invoice_number) if has_inv_num else "Missing",
            message="Invoice number is present." if has_inv_num else "Invoice number is missing from document."
        ))
        if not has_inv_num:
            issues.append("Missing mandatory field: Invoice Number")

        # 5. Mandatory Field: Vendor Name
        has_vendor = bool(vendor_name and str(vendor_name).strip())
        checks.append(ValidationCheckResult(
            name="Vendor Name Field",
            passed=has_vendor,
            expected="Present",
            actual=str(vendor_name) if has_vendor else "Missing",
            message="Vendor name is present." if has_vendor else "Vendor name could not be identified."
        ))
        if not has_vendor:
            issues.append("Missing mandatory field: Vendor Name")

        # 6. Mandatory Field: Invoice Date
        has_date = bool(invoice_date and str(invoice_date).strip())
        checks.append(ValidationCheckResult(
            name="Invoice Date Field",
            passed=has_date,
            expected="Present",
            actual=str(invoice_date) if has_date else "Missing",
            message="Invoice date is present." if has_date else "Invoice issue date is missing."
        ))
        if not has_date:
            issues.append("Missing mandatory field: Invoice Date")

        # 7. Mandatory Field: Total Amount
        has_total = total is not None and total > 0
        checks.append(ValidationCheckResult(
            name="Total Amount Field",
            passed=has_total,
            expected="Positive number",
            actual=f"{currency} {total:.2f}" if total is not None else "Missing",
            message="Total amount is positive." if has_total else "Total invoice amount is zero or missing."
        ))
        if not has_total:
            issues.append("Total amount must be greater than zero.")

        # 8. Tax sign check: tax >= 0
        tax_non_negative = tax >= 0
        checks.append(ValidationCheckResult(
            name="Tax Non-Negative Check",
            passed=tax_non_negative,
            expected=">= 0",
            actual=f"{currency} {tax:.2f}",
            message="Tax amount is valid (non-negative)." if tax_non_negative else f"Tax amount cannot be negative ({currency} {tax:.2f})."
        ))
        if not tax_non_negative:
            issues.append("Tax amount is negative.")

        # 9. Quantity sign check: all quantity >= 0
        negative_qty_items = [item for item in line_items if item.get("quantity", 0.0) < 0]
        qty_passed = len(negative_qty_items) == 0
        checks.append(ValidationCheckResult(
            name="Line Item Quantities Non-Negative",
            passed=qty_passed,
            expected="All quantities >= 0",
            actual=f"{len(negative_qty_items)} negative items" if not qty_passed else "All >= 0",
            message="All item quantities are non-negative." if qty_passed else f"Found {len(negative_qty_items)} line items with negative quantities."
        ))
        if not qty_passed:
            issues.append("Negative quantities detected in line items.")

        # Final validity determination
        is_valid = len(issues) == 0
        status_str = "Valid" if is_valid else "Needs Review"

        return ValidationResult(
            is_valid=is_valid,
            status=status_str,
            checks=checks,
            issues=issues
        )

validator = InvoiceValidator()
