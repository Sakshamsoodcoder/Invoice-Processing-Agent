import logging
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any, List, Optional, Union
from app.schemas.invoice import (
    ValidationResult,
    ValidationCheckResult,
    ReconciliationResult,
    ReconciliationChecks,
    ReconciliationDiscrepancy,
)

logger = logging.getLogger("invoice_ai.services.validator")

# Configurable tolerance to absorb standard currency/rounding precision differences
TOLERANCE = 0.01

def calculate_tax(
    taxable_amount: Union[Decimal, float, int, str],
    tax_rate: Union[Decimal, float, int, str],
    precision: int = 2
) -> Decimal:
    """
    Deterministically computes tax = taxable_amount * tax_rate / 100
    using Decimal with ROUND_HALF_UP rounding to eliminate floating-point inaccuracies
    such as 111.34999999999999.
    """
    try:
        d_amount = Decimal(str(taxable_amount))
        d_rate = Decimal(str(tax_rate))
        raw_tax = (d_amount * d_rate) / Decimal("100")
        quantizer = Decimal("10") ** (-precision)
        return raw_tax.quantize(quantizer, rounding=ROUND_HALF_UP)
    except Exception as e:
        logger.error(f"Error calculating tax for amount {taxable_amount} and rate {tax_rate}: {e}")
        return Decimal("0.00")

def resolve_taxable_base(
    subtotal: Optional[float] = None,
    line_items: Optional[List[Dict[str, Any]]] = None,
    discount: Optional[float] = None,
    taxable_amount: Optional[float] = None
) -> Optional[float]:
    """
    Resolves the taxable base without blindly assuming subtotal:
    1. Explicitly stated taxable amount if present
    2. Subtotal - Discount if discount is present
    3. Stated subtotal
    4. Line items sum
    """
    if taxable_amount is not None:
        try:
            return round(float(taxable_amount), 2)
        except (ValueError, TypeError):
            pass

    disc_val = 0.0
    if discount is not None:
        try:
            disc_val = float(discount)
        except (ValueError, TypeError):
            disc_val = 0.0

    if subtotal is not None:
        try:
            base = float(subtotal) - disc_val
            return round(max(0.0, base), 2)
        except (ValueError, TypeError):
            pass

    if line_items:
        try:
            items_sum = sum(float(it.get("amount", 0.0) or 0.0) for it in line_items)
            base = items_sum - disc_val
            return round(max(0.0, base), 2)
        except (ValueError, TypeError):
            pass

    return None

class InvoiceValidator:
    calculate_tax = staticmethod(calculate_tax)
    resolve_taxable_base = staticmethod(resolve_taxable_base)

    @classmethod
    def calculate_reconciliation(
        cls,
        line_items: Optional[List[Dict[str, Any]]] = None,
        subtotal: Optional[float] = None,
        tax: Optional[float] = None,
        total: Optional[float] = None,
        currency: str = "USD",
        tax_rate: Optional[float] = None,
        discount: Optional[float] = None,
        taxable_amount: Optional[float] = None,
        tax_amount_source: Optional[str] = None
    ) -> ReconciliationResult:
        """
        Independently calculates and reconciles monetary figures:
        A = sum(all line item amounts)
        B = invoice stated subtotal (minus discount if applicable)
        C = invoice tax (extracted or deterministically calculated from stated tax rate)
        D = invoice stated total amount due

        Checks:
        1. Line items match subtotal: A == B
        2. Subtotal + tax matches total: B + C == D
        3. Line items + tax matches total: A + C == D
        4. Tax calculation matches: Taxable base * tax_rate == stated tax
        """
        # A: Sum of line items
        line_items_total: Optional[float] = None
        if line_items is not None and len(line_items) > 0:
            try:
                line_items_total = round(
                    sum(float(item.get("amount", 0.0) or 0.0) for item in line_items), 2
                )
            except (ValueError, TypeError):
                line_items_total = None

        # B: Stated subtotal
        invoice_subtotal: Optional[float] = None
        if subtotal is not None:
            try:
                invoice_subtotal = round(float(subtotal), 2)
            except (ValueError, TypeError):
                invoice_subtotal = None

        # Discount
        disc_val = 0.0
        if discount is not None:
            try:
                disc_val = round(float(discount), 2)
            except (ValueError, TypeError):
                disc_val = 0.0

        # Taxable Base Resolution
        resolved_taxable_base = resolve_taxable_base(
            subtotal=invoice_subtotal,
            line_items=line_items,
            discount=disc_val if disc_val > 0 else None,
            taxable_amount=taxable_amount
        )

        # Tax rate parsing
        tax_rate_val: Optional[float] = None
        if tax_rate is not None:
            try:
                tax_rate_val = round(float(tax_rate), 4)
            except (ValueError, TypeError):
                tax_rate_val = None

        # Expected Tax calculation using Decimal
        expected_tax: Optional[float] = None
        if tax_rate_val is not None and resolved_taxable_base is not None:
            expected_tax = float(calculate_tax(resolved_taxable_base, tax_rate_val))

        # C: Stated tax vs Fallback calculation
        raw_tax_val: Optional[float] = None
        if tax is not None:
            try:
                raw_tax_val = round(float(tax), 2)
            except (ValueError, TypeError):
                raw_tax_val = None

        tax_and_other_charges: Optional[float] = raw_tax_val
        final_tax_source = tax_amount_source or "UNKNOWN"

        is_explicit_zero = (tax_amount_source == "EXPLICIT_ZERO") or (raw_tax_val == 0.0 and tax_rate_val == 0.0)

        if raw_tax_val is None or (raw_tax_val == 0.0 and not is_explicit_zero and tax_amount_source != "EXTRACTED"):
            # Tax amount missing or 0.0 due to default/missing extraction
            if tax_rate_val is not None and tax_rate_val > 0.0 and expected_tax is not None:
                # Deterministic fallback: invoice explicitly provided tax rate, so determine expected tax
                tax_and_other_charges = expected_tax
                final_tax_source = "CALCULATED_FROM_RATE"
            elif raw_tax_val == 0.0:
                final_tax_source = "EXPLICIT_ZERO" if is_explicit_zero else "MISSING"
            else:
                final_tax_source = "MISSING"
        else:
            final_tax_source = "EXPLICIT_ZERO" if raw_tax_val == 0.0 else (tax_amount_source or "EXTRACTED")

        # D: Stated total amount due
        invoice_total: Optional[float] = None
        if total is not None:
            try:
                invoice_total = round(float(total), 2)
            except (ValueError, TypeError):
                invoice_total = None

        # Tax calculation check
        tax_matches: Optional[bool] = None
        tax_diff = 0.0
        if tax_rate_val is not None and expected_tax is not None and tax_and_other_charges is not None:
            tax_diff = round(abs(tax_and_other_charges - expected_tax), 2)
            tax_matches = (tax_diff <= TOLERANCE)

        # Check 1: Line items match subtotal (A == B)
        check1: Optional[bool] = None
        if line_items_total is not None and invoice_subtotal is not None:
            check1 = round(abs(line_items_total - invoice_subtotal), 2) <= TOLERANCE

        # Check 2: Subtotal (- discount) + tax matches total
        check2: Optional[bool] = None
        if invoice_subtotal is not None and tax_and_other_charges is not None and invoice_total is not None:
            expected_total_from_sub = round((invoice_subtotal - disc_val) + tax_and_other_charges, 2)
            check2 = round(abs(expected_total_from_sub - invoice_total), 2) <= TOLERANCE

        # Check 3: Line items (- discount) + tax matches total
        check3: Optional[bool] = None
        if line_items_total is not None and tax_and_other_charges is not None and invoice_total is not None:
            expected_total_from_items = round((line_items_total - disc_val) + tax_and_other_charges, 2)
            check3 = round(abs(expected_total_from_items - invoice_total), 2) <= TOLERANCE

        checks = ReconciliationChecks(
            line_items_match_subtotal=check1,
            subtotal_plus_tax_matches_total=check2,
            line_items_plus_tax_matches_total=check3,
            tax_calculation_matches=tax_matches
        )

        # Discrepancy & Explanation Synthesis
        exists = False
        discrepancy_amount: Optional[float] = None
        discrepancy_type = "NONE"
        severity = "INFO"
        message: Optional[str] = None
        explanation: Optional[str] = None

        if tax_matches is False:
            # Stated tax does not match expected tax from rate
            exists = True
            discrepancy_amount = tax_diff
            discrepancy_type = "TAX_CALCULATION_MISMATCH"
            severity = "WARNING"
            message = (
                f"Tax Calculation Mismatch: Stated tax ({currency} {tax_and_other_charges:,.2f}) does not match "
                f"expected tax ({currency} {expected_tax:,.2f}) calculated from stated tax rate ({tax_rate_val:.2f}%). "
                f"Difference: {currency} {tax_diff:,.2f}."
            )
            explanation = (
                f"The invoice specifies a tax rate of {tax_rate_val:.2f}%. Applied to taxable base "
                f"({currency} {resolved_taxable_base:,.2f}), the expected tax is {currency} {expected_tax:,.2f}. "
                f"However, the document states a tax amount of {currency} {tax_and_other_charges:,.2f} "
                f"(difference: {currency} {tax_diff:,.2f})."
            )

        elif check1 is True and check2 is True:
            # Case 1: All primary calculations match
            exists = False
            discrepancy_type = "NONE"
            severity = "INFO"
            message = "All monetary calculations and reconciliation checks match."
            if final_tax_source == "CALCULATED_FROM_RATE":
                explanation = (
                    f"The line items, subtotal, and total amount due reconcile consistently across all checks. "
                    f"Tax ({currency} {tax_and_other_charges:,.2f}) was calculated from the stated {tax_rate_val:.2f}% tax rate."
                )
            else:
                explanation = "The line items, subtotal, tax, and total amount due reconcile consistently across all checks."

        elif check1 is False and check2 is True:
            # Case 2: Line items != Subtotal, but Subtotal + Tax == Total
            exists = True
            diff = round(abs(line_items_total - invoice_subtotal), 2)
            discrepancy_amount = diff
            discrepancy_type = "SUBTOTAL_LINE_ITEM_MISMATCH"
            severity = "WARNING"
            message = (
                f"Line-item total ({currency} {line_items_total:,.2f}) does not match "
                f"the stated invoice subtotal ({currency} {invoice_subtotal:,.2f}). "
                f"Difference: {currency} {diff:,.2f}."
            )
            explanation = (
                f"The invoice contains a {currency} {diff:,.2f} discrepancy between the sum of its line items "
                f"({currency} {line_items_total:,.2f}) and the stated subtotal ({currency} {invoice_subtotal:,.2f}). "
                f"However, the stated subtotal plus tax/other charges ({currency} {tax_and_other_charges:,.2f}) "
                f"equals the stated total amount due ({currency} {invoice_total:,.2f}). "
                f"The conflicting values should be reviewed against the original invoice or supporting documentation."
            )

        elif check1 is True and check2 is False:
            # Case 3: Line items == Subtotal, but Subtotal + Tax != Total
            exists = True
            expected_total = round((invoice_subtotal - disc_val) + (tax_and_other_charges or 0.0), 2)
            diff = round(abs(expected_total - invoice_total), 2)
            discrepancy_amount = diff
            discrepancy_type = "TOTAL_CALCULATION_MISMATCH"
            severity = "WARNING"
            message = (
                f"Mathematical Mismatch: Stated subtotal ({currency} {invoice_subtotal:,.2f}) plus tax "
                f"({currency} {tax_and_other_charges:,.2f}) equals {currency} {expected_total:,.2f}, "
                f"which does not match the stated total ({currency} {invoice_total:,.2f}). "
                f"Difference: {currency} {diff:,.2f}."
            )
            explanation = (
                f"The stated subtotal plus tax does not match the stated invoice total amount due. "
                f"Expected {currency} {expected_total:,.2f} but extracted {currency} {invoice_total:,.2f} (diff: {currency} {diff:,.2f}). "
                f"Please verify if additional fees, discounts, or withholding were omitted."
            )

        elif check1 is False and check2 is False:
            # Case 4: Line items != Subtotal AND Subtotal + Tax != Total
            exists = True
            if check3 is True:
                diff = round(abs(line_items_total - invoice_subtotal), 2)
                discrepancy_amount = diff
                discrepancy_type = "SUBTOTAL_LINE_ITEM_MISMATCH"
                severity = "WARNING"
                message = (
                    f"Line items + tax matches total ({currency} {invoice_total:,.2f}), "
                    f"but stated subtotal ({currency} {invoice_subtotal:,.2f}) differs by {currency} {diff:,.2f}."
                )
                explanation = (
                    f"The sum of line items ({currency} {line_items_total:,.2f}) plus tax "
                    f"({currency} {tax_and_other_charges:,.2f}) accurately equals the stated total ({currency} {invoice_total:,.2f}). "
                    f"However, the stated subtotal ({currency} {invoice_subtotal:,.2f}) conflicts by {currency} {diff:,.2f}. "
                    f"The printed subtotal may be inaccurate or exclude item discounts."
                )
            else:
                discrepancy_type = "MULTIPLE_CALCULATION_MISMATCHES"
                severity = "WARNING"
                diff1 = abs(line_items_total - invoice_subtotal) if (line_items_total is not None and invoice_subtotal is not None) else 0.0
                discrepancy_amount = round(diff1, 2)
                message = "Multiple calculation inconsistencies detected across line items, subtotal, and total."
                explanation = (
                    f"Multiple monetary figures conflict on this document. The sum of line items "
                    f"({currency} {line_items_total:,.2f if line_items_total is not None else 'N/A'}) does not match "
                    f"the subtotal ({currency} {invoice_subtotal:,.2f if invoice_subtotal is not None else 'N/A'}), "
                    f"and subtotal + tax does not equal the stated total ({currency} {invoice_total:,.2f if invoice_total is not None else 'N/A'}). "
                    f"Requires manual accounts payable review."
                )

        discrepancy = ReconciliationDiscrepancy(
            exists=exists,
            amount=discrepancy_amount,
            type=discrepancy_type,
            severity=severity,
            message=message
        )

        return ReconciliationResult(
            line_items_total=line_items_total,
            invoice_subtotal=invoice_subtotal,
            tax_and_other_charges=tax_and_other_charges,
            invoice_total=invoice_total,
            currency=currency,
            tax_rate=tax_rate_val,
            taxable_amount=resolved_taxable_base,
            expected_tax=expected_tax,
            tax_amount_source=final_tax_source,
            checks=checks,
            discrepancy=discrepancy,
            explanation=explanation
        )

    @classmethod
    def validate(cls, invoice_data: Dict[str, Any]) -> ValidationResult:
        """
        Executes deterministic validation and structured reconciliation rules:
        1. Monetary reconciliation (A: Line items, B: Subtotal, C: Tax, D: Total)
        2. Line item quantity * unit_price = amount calculations
        3. Mandatory invoice header presence (Invoice #, Vendor, Date, Total)
        4. Non-negative validation on tax & quantities
        """
        checks: List[ValidationCheckResult] = []
        issues: List[str] = []

        currency = invoice_data.get("currency") or "USD"
        line_items = invoice_data.get("line_items") or []
        subtotal = invoice_data.get("subtotal")
        tax = invoice_data.get("tax")
        total = invoice_data.get("total")
        tax_rate = invoice_data.get("tax_rate")
        discount = invoice_data.get("discount")
        taxable_amount = invoice_data.get("taxable_amount")
        tax_amount_source = invoice_data.get("tax_amount_source")
        invoice_number = invoice_data.get("invoice_number")
        vendor_name = invoice_data.get("vendor_name")
        invoice_date = invoice_data.get("invoice_date")

        # 1. Independent Monetary Reconciliation
        recon = cls.calculate_reconciliation(
            line_items=line_items,
            subtotal=subtotal,
            tax=tax,
            total=total,
            currency=currency,
            tax_rate=tax_rate,
            discount=discount,
            taxable_amount=taxable_amount,
            tax_amount_source=tax_amount_source
        )

        # Normalize invoice_data with calculated tax if fallback was applied
        if recon.tax_amount_source == "CALCULATED_FROM_RATE":
            invoice_data["tax"] = recon.tax_and_other_charges
            invoice_data["tax_amount_source"] = "CALCULATED_FROM_RATE"
            invoice_data["tax_calculation_note"] = f"Tax amount calculated from stated {recon.tax_rate:.2f}% tax rate."
        elif recon.tax_amount_source:
            invoice_data["tax_amount_source"] = recon.tax_amount_source
        if recon.tax_rate is not None and "tax_rate" not in invoice_data:
            invoice_data["tax_rate"] = recon.tax_rate

        # Line-item reconciliation check result
        if recon.checks.line_items_match_subtotal is not None:
            checks.append(ValidationCheckResult(
                name="Line Items Sum vs Subtotal",
                passed=recon.checks.line_items_match_subtotal,
                expected=f"{currency} {recon.invoice_subtotal:,.2f}",
                actual=f"{currency} {recon.line_items_total:,.2f}",
                message=(
                    f"Sum of line items matches Subtotal ({currency} {recon.invoice_subtotal:,.2f})."
                    if recon.checks.line_items_match_subtotal
                    else f"Line-item sum ({currency} {recon.line_items_total:,.2f}) does not match Subtotal ({currency} {recon.invoice_subtotal:,.2f})."
                )
            ))

        # Tax Rate Calculation check result
        if recon.checks.tax_calculation_matches is not None:
            checks.append(ValidationCheckResult(
                name="Tax Rate Calculation Check",
                passed=recon.checks.tax_calculation_matches,
                expected=f"{currency} {recon.expected_tax:,.2f}",
                actual=f"{currency} {recon.tax_and_other_charges:,.2f}",
                message=(
                    f"Tax calculation matches stated rate ({recon.taxable_amount:,.2f} × {recon.tax_rate:.2f}% = {currency} {recon.expected_tax:,.2f})."
                    if recon.checks.tax_calculation_matches
                    else f"Tax calculation mismatch: Expected {currency} {recon.expected_tax:,.2f} ({recon.tax_rate:.2f}% of {currency} {recon.taxable_amount:,.2f}), but stated tax is {currency} {recon.tax_and_other_charges:,.2f}."
                )
            ))
            if not recon.checks.tax_calculation_matches:
                issues.append(
                    f"Tax Calculation Mismatch: Stated tax ({currency} {recon.tax_and_other_charges:,.2f}) does not match expected tax ({currency} {recon.expected_tax:,.2f}) calculated from stated tax rate ({recon.tax_rate:.2f}%). Difference: {currency} {abs(recon.tax_and_other_charges - recon.expected_tax):,.2f}."
                )

        # Subtotal + Tax reconciliation check result
        if recon.checks.subtotal_plus_tax_matches_total is not None:
            expected_tot = round((recon.invoice_subtotal or 0.0) + (recon.tax_and_other_charges or 0.0), 2)
            checks.append(ValidationCheckResult(
                name="Total Math (Subtotal + Tax = Total)",
                passed=recon.checks.subtotal_plus_tax_matches_total,
                expected=f"{currency} {expected_tot:,.2f}",
                actual=f"{currency} {recon.invoice_total:,.2f}",
                message=(
                    f"Subtotal + Tax matches Total within tolerance ({currency} {recon.invoice_total:,.2f})."
                    if recon.checks.subtotal_plus_tax_matches_total
                    else f"Subtotal ({currency} {recon.invoice_subtotal:,.2f}) + Tax ({currency} {recon.tax_and_other_charges:,.2f}) != Total ({currency} {recon.invoice_total:,.2f})."
                )
            ))

        # Line items + Tax reconciliation check result
        if recon.checks.line_items_plus_tax_matches_total is not None:
            expected_tot_items = round((recon.line_items_total or 0.0) + (recon.tax_and_other_charges or 0.0), 2)
            checks.append(ValidationCheckResult(
                name="Line Items + Tax vs Total",
                passed=recon.checks.line_items_plus_tax_matches_total,
                expected=f"{currency} {expected_tot_items:,.2f}",
                actual=f"{currency} {recon.invoice_total:,.2f}",
                message=(
                    f"Line items + Tax matches Total ({currency} {recon.invoice_total:,.2f})."
                    if recon.checks.line_items_plus_tax_matches_total
                    else f"Line items + Tax ({currency} {expected_tot_items:,.2f}) != Total ({currency} {recon.invoice_total:,.2f})."
                )
            ))

        # Single underlying reconciliation issue (avoids multiple confusing alerts)
        if recon.discrepancy.exists and recon.discrepancy.message:
            issues.append(f"Reconciliation Warning: {recon.discrepancy.message}")

        # 2. Line Items Mathematics: Quantity * Unit Price = Amount
        item_math_passed = True
        for idx, item in enumerate(line_items, 1):
            qty = item.get("quantity")
            price = item.get("unit_price")
            amt = item.get("amount")
            if qty is not None and price is not None and amt is not None:
                expected_amt = round(float(qty) * float(price), 2)
                if abs(expected_amt - float(amt)) > TOLERANCE:
                    item_math_passed = False
                    desc = item.get("description", f"Item #{idx}")
                    issues.append(
                        f"Line Item Mismatch on '{desc}': "
                        f"{qty} × {currency} {price:.2f} = {currency} {expected_amt:.2f}, but line amount is {currency} {amt:.2f}"
                    )

        if line_items:
            checks.append(ValidationCheckResult(
                name="Line Item Calculations (Qty × Unit Price = Amount)",
                passed=item_math_passed,
                expected="All line calculations correct",
                actual="Discrepancies found" if not item_math_passed else "All items verified",
                message="All line item quantities and prices match amounts." if item_math_passed else "One or more line items have calculation discrepancies."
            ))
        else:
            checks.append(ValidationCheckResult(
                name="Line Items Presence",
                passed=False,
                expected="At least 1 item",
                actual="0 items",
                message="No individual line items were extracted."
            ))

        # 3. Mandatory Fields: Invoice Number, Vendor Name, Invoice Date, Total
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

        has_total = total is not None and float(total) > 0
        checks.append(ValidationCheckResult(
            name="Total Amount Field",
            passed=has_total,
            expected="Positive number",
            actual=f"{currency} {float(total):.2f}" if (total is not None and str(total).strip()) else "Missing",
            message="Total amount is positive." if has_total else "Total invoice amount is zero or missing."
        ))
        if not has_total:
            issues.append("Total amount must be greater than zero.")

        # 4. Sign Checks (tax non-negative, quantity non-negative)
        if tax is not None:
            tax_non_negative = float(tax) >= 0
            checks.append(ValidationCheckResult(
                name="Tax Non-Negative Check",
                passed=tax_non_negative,
                expected=">= 0",
                actual=f"{currency} {float(tax):.2f}",
                message="Tax amount is valid (non-negative)." if tax_non_negative else f"Tax amount cannot be negative ({currency} {float(tax):.2f})."
            ))
            if not tax_non_negative:
                issues.append("Tax amount is negative.")

        negative_qty_items = [item for item in line_items if float(item.get("quantity", 0.0) or 0.0) < 0]
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

        # Final validity determination:
        # A reconciliation mismatch requires review (status: "Needs Review"),
        # but the document is NOT completely invalid or rejected.
        is_valid = len(issues) == 0
        status_str = "Valid" if is_valid else "Needs Review"

        return ValidationResult(
            is_valid=is_valid,
            status=status_str,
            checks=checks,
            issues=issues,
            reconciliation=recon
        )

validator = InvoiceValidator()

