import os
import shutil
import logging
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Response
from fastapi.responses import FileResponse, JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc, or_

from app.db.session import get_db
from app.models.user import User
from app.models.invoice import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.invoice_issue import InvoiceIssue
from app.schemas.invoice import (
    InvoiceResponse,
    InvoiceListResponse,
    ProcessInvoiceResponse,
    ValidationResult,
    AIAnalysisResult,
    AnomalyResult
)
from app.api.auth import get_current_user
from app.services.blob_storage import storage_service
from app.services.document_intelligence import document_service
from app.services.invoice_validator import validator
from app.services.anomaly_detector import anomaly_detector
from app.services.ai_analysis import ai_service
from app.core.config import settings

logger = logging.getLogger("invoice_ai.api.invoices")

router = APIRouter(prefix="/api/invoices", tags=["Invoices"])

ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

@router.post("/process", response_model=ProcessInvoiceResponse)
async def process_invoice(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Validate file extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: PDF, JPG, JPEG, PNG."
        )

    # 2. Upload file to Storage (Azure Blob + local cache)
    try:
        blob_url, stored_filename, file_size, extract_path = await storage_service.upload_file(file)
    except Exception as e:
        logger.error(f"Failed to upload file to storage: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload and store invoice file."
        )

    # 3. Document Intelligence Extraction
    try:
        extracted = document_service.extract_invoice(extract_path, file.filename)
    except Exception as e:
        logger.error(f"Document Intelligence extraction error: {e}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to extract text or data from invoice: {str(e)}"
        )

    # 4. Deterministic Validation
    validation = validator.validate(extracted)

    # 5. Anomaly Detection
    anomalies = anomaly_detector.detect(
        db=db,
        user_id=current_user.id,
        invoice_data=extracted,
        validation_issues=validation.issues
    )

    # 6. Microsoft Foundry / Azure OpenAI Analysis
    ai_analysis = await ai_service.analyze_invoice(
        invoice_data=extracted,
        validation_issues=validation.issues,
        anomalies=anomalies.anomalies
    )

    # Determine final overall status
    final_status = "Valid" if (validation.is_valid and not anomalies.has_anomalies) else "Needs Review"
    final_confidence = min(extracted.get("confidence", 0.95), ai_analysis.confidence)

    # 7. Save to Database
    invoice = Invoice(
        user_id=current_user.id,
        invoice_number=extracted.get("invoice_number"),
        vendor_name=extracted.get("vendor_name"),
        vendor_address=extracted.get("vendor_address"),
        customer_name=extracted.get("customer_name"),
        invoice_date=extracted.get("invoice_date"),
        due_date=extracted.get("due_date"),
        subtotal=extracted.get("subtotal") or 0.0,
        tax=extracted.get("tax") if extracted.get("tax") is not None else 0.0,
        tax_rate=extracted.get("tax_rate"),
        tax_amount_source=extracted.get("tax_amount_source"),
        total=extracted.get("total") or 0.0,
        currency=extracted.get("currency") or "USD",
        payment_terms=extracted.get("payment_terms"),
        status=final_status,
        confidence=final_confidence,
        summary=ai_analysis.summary,
        blob_url=blob_url,
        file_name=file.filename,
        file_size=file_size,
        content_type=file.content_type,
        is_mock=extracted.get("is_mock", False)
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    # Save Line Items
    for item in extracted.get("line_items", []):
        inv_item = InvoiceItem(
            invoice_id=invoice.id,
            description=item.get("description", "Line item"),
            quantity=item.get("quantity", 1.0),
            unit_price=item.get("unit_price", 0.0),
            amount=item.get("amount", 0.0)
        )
        db.add(inv_item)

    # Save Validation Issues & Anomalies
    for iss in validation.issues:
        db.add(InvoiceIssue(
            invoice_id=invoice.id,
            issue_type="validation",
            severity="high" if "Mismatch" in iss or "Mandatory" in iss else "medium",
            description=iss
        ))

    for anom in anomalies.anomalies:
        db.add(InvoiceIssue(
            invoice_id=invoice.id,
            issue_type="anomaly",
            severity="medium",
            description=anom
        ))

    db.commit()
    db.refresh(invoice)

    mode_label = "production" if (settings.is_azure_doc_intel_configured and settings.is_azure_openai_configured) else "development_mock"

    inv_response = InvoiceResponse.model_validate(invoice)
    inv_response.reconciliation = validation.reconciliation

    return ProcessInvoiceResponse(
        invoice=inv_response,
        validation=validation,
        ai_analysis=ai_analysis,
        anomalies=anomalies,
        mode=mode_label
    )

@router.get("", response_model=InvoiceListResponse)
def get_invoices(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    status: Optional[str] = Query(None),
    vendor: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Invoice).filter(Invoice.user_id == current_user.id)

    if status and status.lower() != "all":
        query = query.filter(Invoice.status.ilike(status))

    if vendor and vendor.lower() != "all":
        query = query.filter(Invoice.vendor_name.ilike(f"%{vendor}%"))

    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            or_(
                Invoice.invoice_number.ilike(search_fmt),
                Invoice.vendor_name.ilike(search_fmt),
                Invoice.summary.ilike(search_fmt)
            )
        )

    # Sorting
    sort_col = getattr(Invoice, sort_by, Invoice.created_at)
    if sort_order.lower() == "asc":
        query = query.order_by(asc(sort_col))
    else:
        query = query.order_by(desc(sort_col))

    total = query.count()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    offset = (page - 1) * page_size
    invoices = query.offset(offset).limit(page_size).all()

    return InvoiceListResponse(
        invoices=[InvoiceResponse.model_validate(inv) for inv in invoices],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )

@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice_detail(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id
    ).first()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found."
        )

    inv_response = InvoiceResponse.model_validate(invoice)
    inv_response.reconciliation = validator.calculate_reconciliation(
        line_items=[
            {
                "description": item.description,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "amount": item.amount
            }
            for item in invoice.items
        ],
        subtotal=invoice.subtotal,
        tax=invoice.tax,
        total=invoice.total,
        currency=invoice.currency or "USD",
        tax_rate=invoice.tax_rate,
        tax_amount_source=invoice.tax_amount_source
    )
    return inv_response

@router.delete("/{invoice_id}")
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id
    ).first()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found."
        )

    # Attempt to cleanup file from storage
    if invoice.blob_url:
        filename = invoice.blob_url.split("/")[-1]
        storage_service.delete_file(filename)

    db.delete(invoice)
    db.commit()
    return {"message": "Invoice deleted successfully", "id": invoice_id}

@router.get("/files/{filename}")
def get_invoice_file(filename: str):
    """Serves file from storage (Azure Blob or local cache) with appropriate media type."""
    try:
        content, content_type = storage_service.get_file_content(filename)
        return Response(content=content, media_type=content_type)
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on server."
        )

@router.get("/{invoice_id}/report")
def export_invoice_report(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generates structured audit report for download."""
    invoice = db.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.user_id == current_user.id
    ).first()

    if not invoice:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Invoice not found."
        )

    recon = validator.calculate_reconciliation(
        line_items=[
            {
                "description": item.description,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "amount": item.amount
            }
            for item in invoice.items
        ],
        subtotal=invoice.subtotal,
        tax=invoice.tax,
        total=invoice.total,
        currency=invoice.currency or "USD",
        tax_rate=invoice.tax_rate,
        tax_amount_source=invoice.tax_amount_source
    )

    report = {
        "title": "Invoice Processing Audit Report",
        "app": "InvoiceAI – Intelligent Invoice Processing Assistant",
        "invoice_id": invoice.id,
        "invoice_number": invoice.invoice_number,
        "vendor": invoice.vendor_name,
        "vendor_address": invoice.vendor_address,
        "customer_name": invoice.customer_name,
        "date": invoice.invoice_date,
        "due_date": invoice.due_date,
        "subtotal": invoice.subtotal,
        "tax": invoice.tax,
        "tax_rate": invoice.tax_rate,
        "tax_amount_source": invoice.tax_amount_source,
        "total": invoice.total,
        "currency": invoice.currency,
        "status": invoice.status,
        "confidence": invoice.confidence,
        "ai_summary": invoice.summary,
        "reconciliation": recon.model_dump(),
        "line_items": [
            {
                "description": item.description,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "amount": item.amount
            }
            for item in invoice.items
        ],
        "issues_and_anomalies": [
            {
                "type": iss.issue_type,
                "severity": iss.severity,
                "description": iss.description
            }
            for iss in invoice.issues
        ],
        "created_at": invoice.created_at.isoformat()
    }
    return JSONResponse(content=report)
