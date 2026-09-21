from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.db.base import Base

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_number = Column(String(100), nullable=True, index=True)
    vendor_name = Column(String(255), nullable=True, index=True)
    vendor_address = Column(Text, nullable=True)
    customer_name = Column(String(255), nullable=True)
    invoice_date = Column(String(50), nullable=True)
    due_date = Column(String(50), nullable=True)
    subtotal = Column(Float, nullable=True)
    tax = Column(Float, nullable=True)
    total = Column(Float, nullable=True)
    currency = Column(String(10), default="USD")
    payment_terms = Column(String(100), nullable=True)
    status = Column(String(50), default="Processing", index=True)  # Valid, Needs Review, Processing, Failed
    confidence = Column(Float, default=0.0)
    summary = Column(Text, nullable=True)
    blob_url = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, default=0)
    content_type = Column(String(100), nullable=True)
    is_mock = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="invoices")
    items = relationship("InvoiceItem", back_populates="invoice", cascade="all, delete-orphan")
    issues = relationship("InvoiceIssue", back_populates="invoice", cascade="all, delete-orphan")
