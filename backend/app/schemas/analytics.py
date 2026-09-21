from typing import List, Dict, Any
from pydantic import BaseModel

class StatusCount(BaseModel):
    status: str
    count: int
    percentage: float

class VendorSpending(BaseModel):
    vendor_name: str
    total_amount: float
    invoice_count: int

class MonthlySpending(BaseModel):
    month: str  # YYYY-MM
    label: str  # Jan 2026
    total_amount: float
    count: int
    valid_count: int
    needs_review_count: int

class AnalyticsSummaryResponse(BaseModel):
    total_invoices: int
    total_processed: int
    valid_invoices: int
    needs_review_invoices: int
    processing_invoices: int
    failed_invoices: int
    total_amount: float
    average_amount: float
    average_confidence: float
    status_distribution: List[StatusCount]
    top_vendors: List[VendorSpending]
    monthly_trends: List[MonthlySpending]
    tax_distribution: Dict[str, float]  # total_subtotal, total_tax, tax_ratio_percentage
