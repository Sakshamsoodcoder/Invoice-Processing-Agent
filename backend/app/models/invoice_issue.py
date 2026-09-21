from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class InvoiceIssue(Base):
    __tablename__ = "invoice_issues"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    issue_type = Column(String(50), default="validation")  # validation, anomaly, ai_review
    severity = Column(String(20), default="medium")        # high, medium, low, info
    description = Column(Text, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    invoice = relationship("Invoice", back_populates="issues")
