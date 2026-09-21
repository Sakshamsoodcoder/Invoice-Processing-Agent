import os
import re
import logging
from typing import Dict, Any, List, Optional
from app.core.config import settings

logger = logging.getLogger("invoice_ai.services.document_intelligence")

class InvoiceDocumentService:
    def __init__(self):
        self.is_azure = settings.is_azure_doc_intel_configured
        self.endpoint = settings.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT
        self.key = settings.AZURE_DOCUMENT_INTELLIGENCE_KEY

        if self.is_azure:
            try:
                from azure.core.credentials import AzureKeyCredential
                from azure.ai.documentintelligence import DocumentIntelligenceClient
                self.client = DocumentIntelligenceClient(
                    endpoint=self.endpoint,
                    credential=AzureKeyCredential(self.key)
                )
                logger.info("Initialized Azure Document Intelligence client.")
            except Exception as e:
                logger.error(f"Failed to initialize Azure Document Intelligence: {e}")
                self.is_azure = False
        else:
            logger.info("Azure Document Intelligence not configured. Using intelligent Mock/Dev Mode.")

    def extract_invoice(self, file_path: str, filename: str = "") -> Dict[str, Any]:
        """
        Extracts structured fields from invoice file.
        Returns normalized dictionary with is_mock flag.
        """
        if self.is_azure:
            try:
                return self._extract_with_azure(file_path)
            except Exception as e:
                logger.error(f"Azure Document Intelligence error: {e}. Falling back to mock extraction.", exc_info=True)

        return self._extract_with_mock(file_path, filename)

    def _extract_with_azure(self, file_path: str) -> Dict[str, Any]:
        """Calls Azure Document Intelligence prebuilt-invoice model."""
        with open(file_path, "rb") as f:
            file_bytes = f.read()

        logger.info(f"Analyzing invoice with Azure Document Intelligence ({len(file_bytes)} bytes)...")
        poller = self.client.begin_analyze_document(
            model_id="prebuilt-invoice",
            body=file_bytes,
            content_type="application/octet-stream"
        )
        result = poller.result()

        if not result.documents or len(result.documents) == 0:
            raise ValueError("No invoice document recognized by Azure Document Intelligence.")

        doc = result.documents[0]
        fields = doc.fields or {}

        def get_field(name: str, default=None):
            f = fields.get(name)
            if not f:
                return default
            return f.value_string or f.content or default

        def get_date_field(name: str, default=None):
            f = fields.get(name)
            if not f:
                return default
            if hasattr(f, "value_date") and f.value_date:
                return str(f.value_date)
            return f.value_string or f.content or default

        def get_currency_amount(name: str) -> Optional[float]:
            f = fields.get(name)
            if not f:
                return None
            if hasattr(f, "value_currency") and f.value_currency:
                return float(f.value_currency.amount)
            if hasattr(f, "value_number") and f.value_number is not None:
                return float(f.value_number)
            # Try parsing from content
            if f.content:
                clean = re.sub(r"[^\d.]", "", f.content)
                try:
                    return float(clean)
                except ValueError:
                    pass
            return None

        # Extract currency
        currency = "USD"
        total_field = fields.get("InvoiceTotal")
        if total_field and hasattr(total_field, "value_currency") and total_field.value_currency:
            currency = total_field.value_currency.currency_code or "USD"
        elif fields.get("CurrencyCode"):
            currency = get_field("CurrencyCode", "USD")

        # Line items
        items_list = []
        raw_items = fields.get("Items")
        if raw_items and hasattr(raw_items, "value_array") and raw_items.value_array:
            for item in raw_items.value_array:
                item_fields = getattr(item, "value_object", {}) or {}
                desc = item_fields.get("Description")
                qty = item_fields.get("Quantity")
                price = item_fields.get("UnitPrice")
                amt = item_fields.get("Amount")

                desc_val = getattr(desc, "content", "Line item") if desc else "Line item"

                try:
                    qty_val = float(qty.content) if qty and qty.content else 1.0
                except (ValueError, TypeError):
                    qty_val = 1.0

                try:
                    price_clean = re.sub(r"[^\d.]", "", price.content) if price and price.content else "0.0"
                    price_val = float(price_clean) if price_clean else 0.0
                except (ValueError, TypeError):
                    price_val = 0.0

                try:
                    amt_clean = re.sub(r"[^\d.]", "", amt.content) if amt and amt.content else str(qty_val * price_val)
                    amt_val = float(amt_clean) if amt_clean else round(qty_val * price_val, 2)
                except (ValueError, TypeError):
                    amt_val = round(qty_val * price_val, 2)

                # If quantity is 1 but description has explicit Qty: X or amt / price is integer
                if qty_val == 1.0 and price_val > 0 and amt_val > price_val:
                    qty_match = re.search(r"qty[:\s]*(\d+(\.\d+)?)", desc_val, re.IGNORECASE)
                    if qty_match:
                        try:
                            qty_val = float(qty_match.group(1))
                        except ValueError:
                            pass
                    elif abs(round(amt_val / price_val) * price_val - amt_val) < 0.05:
                        qty_val = round(amt_val / price_val, 2)

                # Clean item description
                clean_desc = re.sub(r"^[-*•\s]+", "", desc_val)
                clean_desc = re.sub(r"\|\s*Qty:.*$", "", clean_desc).strip()
                if not clean_desc:
                    clean_desc = desc_val

                items_list.append({
                    "description": clean_desc,
                    "quantity": qty_val,
                    "unit_price": price_val,
                    "amount": amt_val
                })

        subtotal = get_currency_amount("SubTotal")
        raw_tax = get_currency_amount("TotalTax")
        total = get_currency_amount("InvoiceTotal")

        # Determine tax amount source
        tax_amount_source = "MISSING"
        if raw_tax is not None:
            tax = raw_tax
            tax_amount_source = "EXPLICIT_ZERO" if raw_tax == 0.0 else "EXTRACTED"
        else:
            tax = None

        # Extract Tax Rate
        tax_rate = None
        tax_rate_field = fields.get("TaxRate") or fields.get("TotalTaxRate")
        if tax_rate_field:
            if hasattr(tax_rate_field, "value_number") and tax_rate_field.value_number is not None:
                tax_rate = float(tax_rate_field.value_number)
            elif hasattr(tax_rate_field, "value_string") and tax_rate_field.value_string:
                clean_r = re.sub(r"[^\d.]", "", tax_rate_field.value_string)
                if clean_r:
                    tax_rate = float(clean_r)

        if tax_rate is None and hasattr(result, "content") and result.content:
            rate_match = re.search(
                r'(?:tax\s*rate|vat\s*rate|gst\s*rate|sales\s*tax\s*rate|(?:sales\s*)?tax|vat|gst|cgst|sgst|igst)[\s:=()]*([0-9]+(?:\.[0-9]+)?)\s*%',
                result.content,
                re.IGNORECASE
            )
            if rate_match:
                try:
                    tax_rate = float(rate_match.group(1))
                except (ValueError, TypeError):
                    tax_rate = None

        # Extract Discount if present
        discount = get_currency_amount("TotalDiscount") or get_currency_amount("Discount")

        confidence = getattr(doc, "confidence", 0.95)

        logger.info(
            f"Azure Document Intelligence extracted: Invoice #{get_field('InvoiceId')}, "
            f"Vendor: {get_field('VendorName')}, Subtotal: {currency} {subtotal}, "
            f"Tax: {tax} (source: {tax_amount_source}), Tax Rate: {tax_rate}%, Total: {currency} {total}"
        )

        return {
            "invoice_number": get_field("InvoiceId"),
            "vendor_name": get_field("VendorName"),
            "vendor_address": get_field("VendorAddress"),
            "customer_name": get_field("CustomerName"),
            "invoice_date": get_date_field("InvoiceDate"),
            "due_date": get_date_field("DueDate"),
            "subtotal": subtotal,
            "tax": tax,
            "tax_rate": tax_rate,
            "discount": discount,
            "tax_amount_source": tax_amount_source,
            "total": total,
            "currency": currency,
            "payment_terms": get_field("PaymentTerm", "Net 30"),
            "line_items": items_list,
            "confidence": round(float(confidence), 2),
            "is_mock": False
        }

    def _extract_with_mock(self, file_path: str, filename: str) -> Dict[str, Any]:
        """
        Intelligent mock extractor for local development without Azure credentials.
        Extracts real text from PDF if possible or generates realistic invoice structure.
        """
        extracted_text = ""
        if file_path.lower().endswith(".pdf"):
            try:
                from pypdf import PdfReader
                reader = PdfReader(file_path)
                for page in reader.pages:
                    text = page.extract_text()
                    if text:
                        extracted_text += text + "\n"
            except Exception as e:
                logger.warning(f"Could not extract text with pypdf: {e}")

        # Check for stated tax rate in extracted PDF text
        pdf_tax_rate = None
        if extracted_text:
            rate_match = re.search(
                r'(?:tax\s*rate|vat\s*rate|gst\s*rate|sales\s*tax\s*rate|(?:sales\s*)?tax|vat|gst|cgst|sgst|igst)[\s:=()]*([0-9]+(?:\.[0-9]+)?)\s*%',
                extracted_text,
                re.IGNORECASE
            )
            if rate_match:
                try:
                    pdf_tax_rate = float(rate_match.group(1))
                except (ValueError, TypeError):
                    pdf_tax_rate = None

        text_lower = extracted_text.lower()

        # Template 1: Tech / Cloud Infrastructure
        if "cloud" in text_lower or "aws" in text_lower or "azure" in text_lower or "server" in text_lower or "compute" in text_lower:
            return {
                "invoice_number": "INV-2026-9042",
                "vendor_name": "Azure Enterprise Cloud Services",
                "vendor_address": "One Microsoft Way, Redmond, WA 98052, USA",
                "customer_name": "Acme Innovations Ltd",
                "invoice_date": "2026-03-01",
                "due_date": "2026-03-31",
                "subtotal": 1250.00,
                "tax": 125.00,
                "tax_rate": pdf_tax_rate or 10.0,
                "tax_amount_source": "EXTRACTED",
                "total": 1375.00,
                "currency": "USD",
                "payment_terms": "Net 30",
                "line_items": [
                    {"description": "Azure App Service Premium V3 (P1v3)", "quantity": 2.0, "unit_price": 280.00, "amount": 560.00},
                    {"description": "Azure OpenAI GPT-4o Token Consumption", "quantity": 1.0, "unit_price": 440.00, "amount": 440.00},
                    {"description": "Azure Blob Storage Standard GRS (5TB)", "quantity": 5.0, "unit_price": 50.00, "amount": 250.00}
                ],
                "confidence": 0.96,
                "is_mock": True
            }

        # Template 2: Hardware / Dell / Office
        if "dell" in text_lower or "hardware" in text_lower or "laptop" in text_lower or "workstation" in text_lower:
            return {
                "invoice_number": "DELL-882109",
                "vendor_name": "Dell Technologies Global",
                "vendor_address": "1 Dell Way, Round Rock, TX 78682, USA",
                "customer_name": "Apex Digital Labs",
                "invoice_date": "2026-02-18",
                "due_date": "2026-03-20",
                "subtotal": 4200.00,
                "tax": 378.00,
                "tax_rate": pdf_tax_rate or 9.0,
                "tax_amount_source": "EXTRACTED",
                "total": 4578.00,
                "currency": "USD",
                "payment_terms": "Net 30",
                "line_items": [
                    {"description": "Dell XPS 15 Workstation 32GB RAM", "quantity": 2.0, "unit_price": 1850.00, "amount": 3700.00},
                    {"description": "Dell UltraSharp 27 4K Monitor", "quantity": 1.0, "unit_price": 500.00, "amount": 500.00}
                ],
                "confidence": 0.98,
                "is_mock": True
            }

        # Template 3: Consulting / Services
        if "consulting" in text_lower or "service" in text_lower or "software" in text_lower or "development" in text_lower:
            return {
                "invoice_number": "SaaS-66120",
                "vendor_name": "Synthetix AI Solutions",
                "vendor_address": "450 7th Ave, New York, NY 10123, USA",
                "customer_name": "Enterprise Solutions Corp",
                "invoice_date": "2026-02-28",
                "due_date": "2026-03-15",
                "subtotal": 3500.00,
                "tax": 280.00,
                "tax_rate": pdf_tax_rate or 8.0,
                "tax_amount_source": "EXTRACTED",
                "total": 3780.00,
                "currency": "USD",
                "payment_terms": "Due on Receipt",
                "line_items": [
                    {"description": "AI Pipeline Optimization & Model Fine-Tuning", "quantity": 20.0, "unit_price": 150.00, "amount": 3000.00},
                    {"description": "Document Intelligence Custom Schema Setup", "quantity": 1.0, "unit_price": 500.00, "amount": 500.00}
                ],
                "confidence": 0.94,
                "is_mock": True
            }

        # Default fallback
        clean_name = os.path.splitext(filename)[0] if filename else "INV-2026-001"
        sanitized_inv_num = f"INV-{re.sub(r'[^A-Za-z0-9]', '', clean_name)[:8].upper() or '2026-4401'}"

        return {
            "invoice_number": sanitized_inv_num,
            "vendor_name": "Apex Enterprise Technologies",
            "vendor_address": "742 Evergreen Terrace, Suite 100, Seattle, WA 98101",
            "customer_name": "Global Systems Group",
            "invoice_date": "2026-03-05",
            "due_date": "2026-04-04",
            "subtotal": 1850.00,
            "tax": 148.00,
            "tax_rate": pdf_tax_rate or 8.0,
            "tax_amount_source": "EXTRACTED",
            "total": 1998.00,
            "currency": "USD",
            "payment_terms": "Net 30",
            "line_items": [
                {"description": "Enterprise Cloud Architecture Consulting", "quantity": 10.0, "unit_price": 120.00, "amount": 1200.00},
                {"description": "Data Ingestion Pipeline Maintenance", "quantity": 1.0, "unit_price": 650.00, "amount": 650.00}
            ],
            "confidence": 0.95,
            "is_mock": True
        }

document_service = InvoiceDocumentService()
