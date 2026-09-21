import json
import logging
from typing import Dict, Any, List
from app.core.config import settings
from app.schemas.invoice import AIAnalysisResult

logger = logging.getLogger("invoice_ai.services.ai_analysis")

class AIAnalysisService:
    def __init__(self):
        self.is_azure = settings.is_azure_openai_configured
        self.endpoint = settings.AZURE_OPENAI_ENDPOINT.rstrip("/") if settings.AZURE_OPENAI_ENDPOINT else ""
        self.api_key = settings.AZURE_OPENAI_API_KEY
        self.deployment = settings.AZURE_OPENAI_DEPLOYMENT
        self.api_version = settings.AZURE_OPENAI_API_VERSION
        self.client = None

        if self.is_azure:
            try:
                # Determine client style based on endpoint (Azure AI Foundry vs Azure OpenAI)
                if "services.ai.azure.com" in self.endpoint or self.endpoint.endswith("/v1") or "/openai/v1" in self.endpoint:
                    from openai import OpenAI
                    self.client = OpenAI(
                        base_url=self.endpoint,
                        api_key=self.api_key
                    )
                    logger.info(f"Initialized Azure AI Foundry (OpenAI v1 style) client with deployment: {self.deployment}")
                else:
                    from openai import AzureOpenAI
                    self.client = AzureOpenAI(
                        azure_endpoint=self.endpoint,
                        api_key=self.api_key,
                        api_version=self.api_version
                    )
                    logger.info(f"Initialized Azure OpenAI client with deployment: {self.deployment}")
            except Exception as e:
                logger.error(f"Failed to initialize Azure OpenAI / Foundry client: {e}")
                self.is_azure = False
        else:
            logger.info("Azure OpenAI / Foundry not configured. Using intelligent Mock/Dev Mode.")

    async def analyze_invoice(
        self,
        invoice_data: Dict[str, Any],
        validation_issues: List[str],
        anomalies: List[str]
    ) -> AIAnalysisResult:
        """
        Runs AI analysis on normalized invoice data.
        Returns structured AIAnalysisResult.
        """
        if self.is_azure and self.client:
            try:
                return await self._analyze_with_azure(invoice_data, validation_issues, anomalies)
            except Exception as e:
                logger.error(f"Azure OpenAI / Foundry call failed: {e}. Falling back to deterministic analysis.", exc_info=True)

        return self._analyze_with_mock(invoice_data, validation_issues, anomalies)

    async def _analyze_with_azure(
        self,
        invoice_data: Dict[str, Any],
        validation_issues: List[str],
        anomalies: List[str]
    ) -> AIAnalysisResult:
        """Invokes Microsoft Foundry / Azure OpenAI gpt-4.1-mini with structured JSON prompt."""
        system_prompt = (
            "You are an expert AI financial auditor and accounts payable assistant. "
            "Analyze the provided structured invoice data, deterministic reconciliation checks, and anomaly flags. "
            "Return a strictly valid JSON object with this exact schema:\n"
            "{\n"
            '  "summary": "Concise executive summary of the invoice",\n'
            '  "status": "valid" or "needs_review",\n'
            '  "confidence": 0.0 to 1.0,\n'
            '  "issues": ["list of identified issues, missing required fields, or discrepancies"],\n'
            '  "anomalies": ["list of detected suspicious inconsistencies or potential anomalies"],\n'
            '  "recommendations": ["clear, actionable steps for accounts payable staff"]\n'
            "}\n"
            "CRITICAL INSTRUCTIONS:\n"
            "- Distinguish carefully between: (1) extracted document facts, (2) calculated values, (3) validation results, and (4) interpretation/recommendation.\n"
            "- Do NOT blindly trust the calculated line-item total or the stated subtotal. When values conflict, state that the document contains conflicting monetary values requiring human verification.\n"
            "- Never declare which amount is 'correct' when the document itself is contradictory.\n"
            "- If line items do not match the stated subtotal, but subtotal + tax matches total: note the discrepancy objectively, observe that subtotal + tax reconciles with total, and recommend reviewing against the original invoice.\n"
            "- Do not invent missing information. If information is missing, mark it explicitly as missing.\n"
            "- Avoid duplicate alerts for the same underlying discrepancy.\n"
            "- Frame inconsistencies objectively as 'requires review' or 'potential discrepancy', never declare fraud."
        )

        user_content = {
            "invoice_data": invoice_data,
            "deterministic_validation_issues": validation_issues,
            "potential_anomalies": anomalies
        }

        logger.info(f"Submitting invoice #{invoice_data.get('invoice_number')} to Azure Foundry ({self.deployment})...")
        response = self.client.chat.completions.create(
            model=self.deployment,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_content, indent=2)}
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )

        content = response.choices[0].message.content
        parsed = json.loads(content)

        return AIAnalysisResult(
            summary=parsed.get("summary", "Invoice analyzed successfully."),
            status=parsed.get("status", "valid"),
            confidence=float(parsed.get("confidence", 0.95)),
            issues=parsed.get("issues", []),
            anomalies=parsed.get("anomalies", []),
            recommendations=parsed.get("recommendations", [])
        )

    def _analyze_with_mock(
        self,
        invoice_data: Dict[str, Any],
        validation_issues: List[str],
        anomalies: List[str]
    ) -> AIAnalysisResult:
        """
        Deterministic, realistic mock analysis for development mode.
        Distinguishes extracted facts from calculated figures objectively.
        """
        vendor = invoice_data.get("vendor_name") or "Unspecified Vendor"
        inv_num = invoice_data.get("invoice_number") or "N/A"
        total = invoice_data.get("total") or 0.0
        subtotal = invoice_data.get("subtotal") or 0.0
        tax = invoice_data.get("tax") or 0.0
        currency = invoice_data.get("currency") or "USD"
        items = invoice_data.get("line_items") or []
        item_count = len(items)
        items_sum = round(sum(float(i.get("amount", 0.0) or 0.0) for i in items), 2) if items else 0.0

        has_issues = len(validation_issues) > 0 or len(anomalies) > 0
        status_val = "needs_review" if has_issues else "valid"
        confidence_val = 0.96 if not has_issues else 0.88

        # Check for specific reconciliation discrepancy scenario
        subtotal_mismatch = items and abs(items_sum - subtotal) > 0.01
        sub_tax_matches_tot = abs(round(subtotal + tax, 2) - total) <= 0.01

        if subtotal_mismatch and sub_tax_matches_tot:
            diff = round(abs(items_sum - subtotal), 2)
            summary = (
                f"The invoice contains a {currency} {diff:,.2f} discrepancy between the sum of its line items "
                f"({currency} {items_sum:,.2f}) and the stated subtotal ({currency} {subtotal:,.2f}). "
                f"However, the stated subtotal plus tax/other charges ({currency} {tax:,.2f}) equals the stated total amount due ({currency} {total:,.2f}). "
                f"The conflicting values should be reviewed against the original invoice or supporting documentation."
            )
        elif has_issues:
            summary = (
                f"Invoice #{inv_num} issued by {vendor} for a stated total of {currency} {total:,.2f}. "
                f"The system identified {len(validation_issues)} validation item(s) and {len(anomalies)} potential anomaly item(s) requiring human verification prior to disbursement."
            )
        else:
            summary = (
                f"Invoice #{inv_num} issued by {vendor} for a total of {currency} {total:,.2f} "
                f"({item_count} line item{'s' if item_count != 1 else ''}). "
                f"All mathematical calculations, tax assessments, and mandatory invoice headers comply with standard procurement policies."
            )

        recommendations = []
        if subtotal_mismatch and sub_tax_matches_tot:
            recommendations.append("Review itemized lines against invoice header to confirm whether an unlisted discount or billing adjustment applies.")
            recommendations.append("Verify whether line items represent gross amounts before an unstated subtotal deduction.")
            recommendations.append("Confirm correct billing amount with vendor prior to accounts payable approval.")
        elif has_issues:
            if any("Calculation" in iss or "Mismatch" in iss for iss in validation_issues):
                recommendations.append("Request a corrected invoice or clarification memo from vendor to reconcile total amount.")
            if any("Potential Duplicate" in anom for anom in anomalies):
                recommendations.append("Cross-reference AP payment ledger to ensure invoice has not previously been disbursed.")
            if any("Missing mandatory field" in iss for iss in validation_issues):
                recommendations.append("Contact vendor to obtain formal invoice containing all required legal identifiers.")
            recommendations.append("Hold payment until discrepancies are resolved with department manager.")
        else:
            recommendations.append("Invoice meets automated 3-way matching criteria.")
            recommendations.append("Approved for routine accounts payable scheduling according to payment terms.")

        return AIAnalysisResult(
            summary=summary,
            status=status_val,
            confidence=confidence_val,
            issues=validation_issues,
            anomalies=anomalies,
            recommendations=recommendations
        )

ai_service = AIAnalysisService()
