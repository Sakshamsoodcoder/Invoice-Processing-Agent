from datetime import datetime
from collections import defaultdict
from typing import List, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.models.user import User
from app.models.invoice import Invoice
from app.schemas.analytics import (
    AnalyticsSummaryResponse,
    StatusCount,
    VendorSpending,
    MonthlySpending
)
from app.api.auth import get_current_user

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/summary", response_model=AnalyticsSummaryResponse)
def get_analytics_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoices = db.query(Invoice).filter(Invoice.user_id == current_user.id).all()

    total_invoices = len(invoices)
    total_processed = sum(1 for inv in invoices if inv.status in ("Valid", "Needs Review"))
    valid_invoices = sum(1 for inv in invoices if inv.status == "Valid")
    needs_review_invoices = sum(1 for inv in invoices if inv.status == "Needs Review")
    processing_invoices = sum(1 for inv in invoices if inv.status == "Processing")
    failed_invoices = sum(1 for inv in invoices if inv.status == "Failed")

    total_amount = sum(inv.total or 0.0 for inv in invoices)
    total_subtotal = sum(inv.subtotal or 0.0 for inv in invoices)
    total_tax = sum(inv.tax or 0.0 for inv in invoices)

    avg_amount = (total_amount / total_invoices) if total_invoices > 0 else 0.0
    avg_confidence = (sum(inv.confidence or 0.0 for inv in invoices) / total_invoices) if total_invoices > 0 else 0.0

    # Status distribution
    status_distribution = []
    if total_invoices > 0:
        status_distribution = [
            StatusCount(
                status="Valid",
                count=valid_invoices,
                percentage=round((valid_invoices / total_invoices) * 100, 1)
            ),
            StatusCount(
                status="Needs Review",
                count=needs_review_invoices,
                percentage=round((needs_review_invoices / total_invoices) * 100, 1)
            ),
            StatusCount(
                status="Processing",
                count=processing_invoices,
                percentage=round((processing_invoices / total_invoices) * 100, 1)
            ),
            StatusCount(
                status="Failed",
                count=failed_invoices,
                percentage=round((failed_invoices / total_invoices) * 100, 1)
            ),
        ]

    # Vendor aggregation
    vendor_totals = defaultdict(lambda: {"amount": 0.0, "count": 0})
    for inv in invoices:
        v_name = inv.vendor_name or "Unknown Vendor"
        vendor_totals[v_name]["amount"] += (inv.total or 0.0)
        vendor_totals[v_name]["count"] += 1

    sorted_vendors = sorted(
        vendor_totals.items(),
        key=lambda x: x[1]["amount"],
        reverse=True
    )[:6]

    top_vendors = [
        VendorSpending(
            vendor_name=v,
            total_amount=round(data["amount"], 2),
            invoice_count=data["count"]
        )
        for v, data in sorted_vendors
    ]

    # Monthly trends
    month_data = defaultdict(lambda: {"amount": 0.0, "count": 0, "valid": 0, "needs_review": 0})
    for inv in invoices:
        dt = inv.created_at
        month_key = dt.strftime("%Y-%m")
        month_data[month_key]["amount"] += (inv.total or 0.0)
        month_data[month_key]["count"] += 1
        if inv.status == "Valid":
            month_data[month_key]["valid"] += 1
        elif inv.status == "Needs Review":
            month_data[month_key]["needs_review"] += 1

    monthly_trends = []
    for m_key in sorted(month_data.keys()):
        d_obj = datetime.strptime(m_key, "%Y-%m")
        label = d_obj.strftime("%b %Y")
        m_info = month_data[m_key]
        monthly_trends.append(
            MonthlySpending(
                month=m_key,
                label=label,
                total_amount=round(m_info["amount"], 2),
                count=m_info["count"],
                valid_count=m_info["valid"],
                needs_review_count=m_info["needs_review"]
            )
        )

    # Tax metrics
    tax_ratio = (total_tax / total_subtotal * 100) if total_subtotal > 0 else 0.0
    tax_distribution = {
        "total_subtotal": round(total_subtotal, 2),
        "total_tax": round(total_tax, 2),
        "tax_ratio_percentage": round(tax_ratio, 1)
    }

    return AnalyticsSummaryResponse(
        total_invoices=total_invoices,
        total_processed=total_processed,
        valid_invoices=valid_invoices,
        needs_review_invoices=needs_review_invoices,
        processing_invoices=processing_invoices,
        failed_invoices=failed_invoices,
        total_amount=round(total_amount, 2),
        average_amount=round(avg_amount, 2),
        average_confidence=round(avg_confidence, 2),
        status_distribution=status_distribution,
        top_vendors=top_vendors,
        monthly_trends=monthly_trends,
        tax_distribution=tax_distribution
    )

@router.get("/vendors")
def get_vendors_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoices = db.query(Invoice).filter(Invoice.user_id == current_user.id).all()
    vendor_totals = defaultdict(lambda: {"amount": 0.0, "count": 0})
    for inv in invoices:
        v_name = inv.vendor_name or "Unknown Vendor"
        vendor_totals[v_name]["amount"] += (inv.total or 0.0)
        vendor_totals[v_name]["count"] += 1

    return [
        {
            "vendor_name": v,
            "total_amount": round(data["amount"], 2),
            "invoice_count": data["count"]
        }
        for v, data in sorted(vendor_totals.items(), key=lambda x: x[1]["amount"], reverse=True)
    ]

@router.get("/monthly")
def get_monthly_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoices = db.query(Invoice).filter(Invoice.user_id == current_user.id).all()
    month_data = defaultdict(lambda: {"amount": 0.0, "count": 0})
    for inv in invoices:
        dt = inv.created_at
        month_key = dt.strftime("%Y-%m")
        month_data[month_key]["amount"] += (inv.total or 0.0)
        month_data[month_key]["count"] += 1

    return [
        {
            "month": m,
            "label": datetime.strptime(m, "%Y-%m").strftime("%b %Y"),
            "total_amount": round(data["amount"], 2),
            "count": data["count"]
        }
        for m, data in sorted(month_data.items())
    ]
