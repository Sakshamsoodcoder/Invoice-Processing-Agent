import pytest
from app.services.invoice_validator import InvoiceValidator, validator
from app.services.anomaly_detector import AnomalyDetector
from app.schemas.invoice import ReconciliationResult

def test_user_scenario_reconciliation():
    """
    User scenario:
    Line items: $2,500.00, $750.00, $250.00, $250.00 (Sum = $3,750.00)
    Stated Subtotal: $3,500.00
    Tax: $250.00
    Total: $3,750.00
    """
    line_items = [
        {"description": "Consulting Phase 1", "quantity": 1, "unit_price": 2500.0, "amount": 2500.0},
        {"description": "Infrastructure Setup", "quantity": 1, "unit_price": 750.0, "amount": 750.0},
        {"description": "Security Audit", "quantity": 1, "unit_price": 250.0, "amount": 250.0},
        {"description": "Deployment Verification", "quantity": 1, "unit_price": 250.0, "amount": 250.0},
    ]
    invoice_data = {
        "invoice_number": "INV-2026-001",
        "vendor_name": "Contoso Solutions",
        "invoice_date": "2026-09-20",
        "line_items": line_items,
        "subtotal": 3500.0,
        "tax": 250.0,
        "total": 3750.0,
        "currency": "USD"
    }

    recon: ReconciliationResult = InvoiceValidator.calculate_reconciliation(
        line_items=line_items,
        subtotal=3500.0,
        tax=250.0,
        total=3750.0,
        currency="USD"
    )

    # Verify independent values
    assert recon.line_items_total == 3750.00
    assert recon.invoice_subtotal == 3500.00
    assert recon.tax_and_other_charges == 250.00
    assert recon.invoice_total == 3750.00

    # Verify checks
    assert recon.checks.line_items_match_subtotal is False  # A == B -> False
    assert recon.checks.subtotal_plus_tax_matches_total is True  # B + C == D -> True
    assert recon.checks.line_items_plus_tax_matches_total is False  # A + C == D -> False

    # Verify single discrepancy
    assert recon.discrepancy.exists is True
    assert recon.discrepancy.amount == 250.00
    assert recon.discrepancy.type == "SUBTOTAL_LINE_ITEM_MISMATCH"
    assert recon.discrepancy.severity == "WARNING"
    assert "250.00" in recon.discrepancy.message

    # Validate full invoice validation output
    val_result = validator.validate(invoice_data)
    assert val_result.status == "Needs Review"
    # Should only have ONE reconciliation issue in issues list
    recon_issues = [iss for iss in val_result.issues if "Reconciliation Warning" in iss]
    assert len(recon_issues) == 1
    assert "Line-item total" in recon_issues[0]

def test_no_duplicate_anomalies_for_reconciliation():
    """Verify that calculation reconciliation issues are NOT duplicated in AnomalyDetector."""
    validation_issues = [
        "Reconciliation Warning: Line-item total (USD 3,750.00) does not match stated invoice subtotal (USD 3,500.00)."
    ]
    invoice_data = {
        "invoice_number": "INV-12345",
        "vendor_name": "Acme Corp",
        "subtotal": 3500.0,
        "tax": 250.0,
        "total": 3750.0,
        "currency": "USD"
    }

    # Pass mock or dummy DB session
    class DummyQuery:
        def filter(self, *args, **kwargs):
            return self
        def first(self):
            return None
        def scalar(self):
            return 1000.0

    class DummyDB:
        def query(self, *args, **kwargs):
            return DummyQuery()

    anomaly_res = AnomalyDetector.detect(
        db=DummyDB(),
        user_id=1,
        invoice_data=invoice_data,
        validation_issues=validation_issues
    )

    # AnomalyDetector should NOT have created "Calculation Anomaly: ..."
    calc_anomalies = [a for a in anomaly_res.anomalies if "Calculation Anomaly" in a]
    assert len(calc_anomalies) == 0

def test_clean_invoice_reconciliation():
    """Invoice where all figures match cleanly."""
    line_items = [
        {"description": "Item 1", "amount": 500.0},
        {"description": "Item 2", "amount": 500.0},
    ]
    recon = InvoiceValidator.calculate_reconciliation(
        line_items=line_items,
        subtotal=1000.0,
        tax=100.0,
        total=1100.0,
        currency="USD"
    )

    assert recon.checks.line_items_match_subtotal is True
    assert recon.checks.subtotal_plus_tax_matches_total is True
    assert recon.checks.line_items_plus_tax_matches_total is True
    assert recon.discrepancy.exists is False
    assert recon.discrepancy.type == "NONE"

def test_total_calculation_mismatch():
    """Invoice where line items match subtotal, but subtotal + tax != total."""
    line_items = [
        {"description": "Service", "amount": 1000.0}
    ]
    recon = InvoiceValidator.calculate_reconciliation(
        line_items=line_items,
        subtotal=1000.0,
        tax=100.0,
        total=1250.0,  # mismatch by 150
        currency="USD"
    )

    assert recon.checks.line_items_match_subtotal is True
    assert recon.checks.subtotal_plus_tax_matches_total is False
    assert recon.discrepancy.exists is True
    assert recon.discrepancy.amount == 150.0
    assert recon.discrepancy.type == "TOTAL_CALCULATION_MISMATCH"

def test_missing_subtotal_and_tax():
    """Verify that missing fields do not cause invented numbers or false assumptions."""
    recon = InvoiceValidator.calculate_reconciliation(
        line_items=[{"description": "Item", "amount": 100.0}],
        subtotal=None,
        tax=None,
        total=100.0,
        currency="USD"
    )

    assert recon.invoice_subtotal is None
    assert recon.tax_and_other_charges is None
    assert recon.line_items_total == 100.0
    assert recon.checks.line_items_match_subtotal is None
    assert recon.checks.subtotal_plus_tax_matches_total is None

def test_negative_values_and_discounts():
    """Verify negative line item values (credits, discounts) are summed properly."""
    line_items = [
        {"description": "Software License", "amount": 1200.0},
        {"description": "Promotional Discount", "amount": -200.0},
    ]
    recon = InvoiceValidator.calculate_reconciliation(
        line_items=line_items,
        subtotal=1000.0,
        tax=50.0,
        total=1050.0,
        currency="USD"
    )

    assert recon.line_items_total == 1000.0
    assert recon.checks.line_items_match_subtotal is True
    assert recon.checks.subtotal_plus_tax_matches_total is True
    assert recon.discrepancy.exists is False

def test_rounding_tolerance():
    """Verify that minor rounding difference within 0.01 tolerance does not flag discrepancy."""
    line_items = [
        {"description": "Fractional Item", "amount": 33.33},
        {"description": "Fractional Item", "amount": 33.33},
        {"description": "Fractional Item", "amount": 33.33},
    ]
    # sum is 99.99
    recon = InvoiceValidator.calculate_reconciliation(
        line_items=line_items,
        subtotal=100.00,  # 0.01 diff
        tax=10.00,
        total=110.00,
        currency="USD"
    )

    assert recon.checks.line_items_match_subtotal is True
    assert recon.discrepancy.exists is False

def test_line_items_plus_tax_matches_total_case():
    """Line items != subtotal, subtotal + tax != total, but line items + tax == total."""
    line_items = [
        {"description": "Item 1", "amount": 600.0},
        {"description": "Item 2", "amount": 400.0}
    ]
    # sum is 1000. Stated subtotal is wrong (e.g., 900), Tax is 100, Total is 1100 (1000 + 100).
    recon = InvoiceValidator.calculate_reconciliation(
        line_items=line_items,
        subtotal=900.0,
        tax=100.0,
        total=1100.0,
        currency="USD"
    )

    assert recon.checks.line_items_match_subtotal is False
    assert recon.checks.subtotal_plus_tax_matches_total is False
    assert recon.checks.line_items_plus_tax_matches_total is True
    assert recon.discrepancy.exists is True
    assert recon.discrepancy.type == "SUBTOTAL_LINE_ITEM_MISMATCH"

