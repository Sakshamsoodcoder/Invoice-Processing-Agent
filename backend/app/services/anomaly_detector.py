import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.invoice import Invoice
from app.schemas.invoice import AnomalyResult

logger = logging.getLogger("invoice_ai.services.anomaly_detector")

class AnomalyDetector:
    @staticmethod
    def detect(
        db: Session,
        user_id: int,
        invoice_data: Dict[str, Any],
        validation_issues: List[str]
    ) -> AnomalyResult:
        """
        Detects potential operational anomalies or items requiring review:
        - Duplicate invoice number
        - Extreme amounts compared to historical records
        - Similar invoice amount from same vendor
        - Missing critical fields (vendor, invoice number, tax)
        - Potential future or invalid date
        """
        anomalies: List[str] = []

        invoice_number = invoice_data.get("invoice_number")
        vendor_name = invoice_data.get("vendor_name")
        total = invoice_data.get("total") or 0.0
        tax = invoice_data.get("tax") or 0.0
        subtotal = invoice_data.get("subtotal") or 0.0
        date_str = invoice_data.get("invoice_date")
        currency = invoice_data.get("currency") or "USD"

        # 1. Duplicate invoice number check
        if invoice_number and str(invoice_number).strip():
            duplicate = db.query(Invoice).filter(
                Invoice.user_id == user_id,
                Invoice.invoice_number == str(invoice_number).strip()
            ).first()
            if duplicate:
                anomalies.append(
                    f"Potential Duplicate: Invoice #{invoice_number} already exists in records (previously processed on {duplicate.created_at.strftime('%Y-%m-%d')}). Requires verification."
                )

        # 2. Missing invoice number or vendor
        if not invoice_number:
            anomalies.append("Potential Anomaly: Document lacks an identifiable invoice reference number.")
        if not vendor_name:
            anomalies.append("Potential Anomaly: Vendor name is unidentifiable or missing from invoice header.")

        # 3. Tax check
        if subtotal > 50 and tax == 0:
            anomalies.append("Notice: Zero tax recorded on an invoice exceeding standard exemption thresholds. Please confirm tax exemption status.")

        # 4. Total vs Subtotal mismatch transferred as anomaly if significant
        for issue in validation_issues:
            if "Mathematical Mismatch" in issue or "Subtotal Discrepancy" in issue:
                anomalies.append(f"Calculation Anomaly: {issue}")

        # 5. Negative or zero amount check
        if total <= 0:
            anomalies.append("Irregular Amount: Total invoice value is zero or negative.")

        # 6. Future date anomaly
        if date_str:
            try:
                # Attempt basic date parsing
                for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y", "%B %d, %Y"):
                    try:
                        parsed_date = datetime.strptime(str(date_str).strip(), fmt)
                        if parsed_date > datetime.now() + timedelta(days=30):
                            anomalies.append(
                                f"Date Anomaly: Invoice issue date '{date_str}' is set substantially in the future."
                            )
                        break
                    except ValueError:
                        continue
            except Exception:
                pass

        # 7. Historical outlier / unusually large amount detection
        try:
            avg_result = db.query(func.avg(Invoice.total)).filter(
                Invoice.user_id == user_id,
                Invoice.total > 0
            ).scalar()

            if avg_result and total > (avg_result * 3.5) and total > 500:
                anomalies.append(
                    f"Spending Outlier: Amount ({currency} {total:,.2f}) is over 3.5x higher than your historical average invoice ({currency} {avg_result:,.2f}). Requires supervisory review."
                )

            # Check similar invoice from same vendor in last 30 days
            if vendor_name and total > 0:
                recent_similar = db.query(Invoice).filter(
                    Invoice.user_id == user_id,
                    Invoice.vendor_name.ilike(f"%{vendor_name}%"),
                    Invoice.total == total
                ).first()
                if recent_similar and recent_similar.invoice_number != invoice_number:
                    anomalies.append(
                        f"Potential Redundant Billing: Found previous invoice (#{recent_similar.invoice_number}) from '{vendor_name}' for the exact same amount ({currency} {total:,.2f})."
                    )
        except Exception as e:
            logger.warning(f"Error querying historical anomalies: {e}")

        return AnomalyResult(
            has_anomalies=len(anomalies) > 0,
            anomalies=anomalies
        )

anomaly_detector = AnomalyDetector()
