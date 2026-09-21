from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

class InvoiceItemBase(BaseModel):
    description: str
    quantity: float = 1.0
    unit_price: float = 0.0
    amount: float = 0.0

class InvoiceItemCreate(InvoiceItemBase):
    pass

class InvoiceItemResponse(InvoiceItemBase):
    id: int
    invoice_id: int

    model_config = ConfigDict(from_attributes=True)

class InvoiceIssueResponse(BaseModel):
    id: int
    invoice_id: int
    issue_type: str
    severity: str
    description: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class InvoiceBase(BaseModel):
    invoice_number: Optional[str] = None
    vendor_name: Optional[str] = None
    vendor_address: Optional[str] = None
    customer_name: Optional[str] = None
    invoice_date: Optional[str] = None
    due_date: Optional[str] = None
    subtotal: Optional[float] = 0.0
    tax: Optional[float] = 0.0
    total: Optional[float] = 0.0
    currency: Optional[str] = "USD"
    payment_terms: Optional[str] = None
    status: Optional[str] = "Processing"
    confidence: Optional[float] = 0.0
    summary: Optional[str] = None
    blob_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = 0
    content_type: Optional[str] = None
    is_mock: Optional[bool] = False

class InvoiceResponse(InvoiceBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    items: List[InvoiceItemResponse] = []
    issues: List[InvoiceIssueResponse] = []

    model_config = ConfigDict(from_attributes=True)

class InvoiceListResponse(BaseModel):
    invoices: List[InvoiceResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class ValidationCheckResult(BaseModel):
    name: str
    passed: bool
    expected: Optional[str] = None
    actual: Optional[str] = None
    message: str

class ValidationResult(BaseModel):
    is_valid: bool
    status: str  # Valid or Needs Review
    checks: List[ValidationCheckResult] = []
    issues: List[str] = []

class AnomalyResult(BaseModel):
    has_anomalies: bool
    anomalies: List[str] = []

class AIAnalysisResult(BaseModel):
    summary: str
    status: str  # valid or needs_review
    confidence: float
    issues: List[str] = []
    anomalies: List[str] = []
    recommendations: List[str] = []

class ProcessInvoiceResponse(BaseModel):
    invoice: InvoiceResponse
    validation: ValidationResult
    ai_analysis: AIAnalysisResult
    anomalies: AnomalyResult
    mode: str  # "production" or "development_mock"
