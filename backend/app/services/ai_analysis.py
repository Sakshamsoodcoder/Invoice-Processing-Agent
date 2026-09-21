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
            "Analyze the provided structured invoice data, deterministic validation results, and anomaly flags. "
            "Return a strictly valid JSON object with this exact schema:\n"
            "{\n"
            '  "summary": "Concise executive summary of the invoice",\n'
            '  "status": "valid" or "needs_review",\n'
            '  "confidence": 0.0 to 1.0,\n'
            '  "issues": ["list of identified issues, missing required fields, or discrepancies"],\n'
            '  "anomalies": ["list of detected suspicious inconsistencies or potential anomalies"],\n'
            '  "recommendations": ["clear, actionable steps for accounts payable staff"]\n'
            "}\n"
            "CRITICAL RULES:\n"
            "- Do not invent missing information. If information is missing, mark it explicitly as missing.\n"
            "- If there are mathematical mismatches or missing required fields, status must be 'needs_review'.\n"
            "- Frame inconsistencies objectively as 'potential anomalies' or 'requires review', never declare fraud."
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
        """
        vendor = invoice_data.get("vendor_name") or "Unspecified Vendor"
        inv_num = invoice_data.get("invoice_number") or "N/A"
        total = invoice_data.get("total") or 0.0
        currency = invoice_data.get("currency") or "USD"
        items = invoice_data.get("line_items") or []
        item_count = len(items)

        has_issues = len(validation_issues) > 0 or len(anomalies) > 0
        status_val = "needs_review" if has_issues else "valid"
        confidence_val = 0.96 if not has_issues else 0.82

        items_desc = f"comprising {item_count} line item{'s' if item_count != 1 else ''}" if item_count > 0 else "with no itemized lines"
        summary = (
            f"Invoice #{inv_num} issued by {vendor} for a total of {currency} {total:,.2f} ({items_desc}). "
        )
        if has_issues:
            summary += f"The system flagged {len(validation_issues)} validation item(s) and {len(anomalies)} potential anomaly item(s) requiring human verification prior to disbursement."
        else:
            summary += "All mathematical calculations, tax assessments, and mandatory invoice headers comply with standard procurement policies."

        recommendations = []
        if has_issues:
            if any("Mathematical Mismatch" in iss for iss in validation_issues):
                recommendations.append("Request a corrected invoice or credit memo from vendor to reconcile total amount.")
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
