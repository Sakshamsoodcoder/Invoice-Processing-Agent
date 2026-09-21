import pytest
from app.services.invoice_validator import validator

def test_valid_invoice_math():
    clean_data = {
        "invoice_number": "INV-1001",
        "vendor_name": "Acme Corp",
        "invoice_date": "2026-03-01",
        "subtotal": 100.0,
        "tax": 10.0,
        "total": 110.0,
        "currency": "USD",
        "line_items": [
            {"description": "Item A", "quantity": 2.0, "unit_price": 50.0, "amount": 100.0}
        ]
    }
    res = validator.validate(clean_data)
    assert res.is_valid is True
    assert res.status == "Valid"
    assert len(res.issues) == 0

def test_total_mismatch():
    mismatched_data = {
        "invoice_number": "INV-1002",
        "vendor_name": "Beta LLC",
        "invoice_date": "2026-03-01",
        "subtotal": 100.0,
        "tax": 10.0,
        "total": 125.0,  # Expected 110
        "currency": "USD",
        "line_items": [
            {"description": "Service B", "quantity": 1.0, "unit_price": 100.0, "amount": 100.0}
        ]
    }
    res = validator.validate(mismatched_data)
    assert res.is_valid is False
    assert res.status == "Needs Review"
    assert any("Mathematical Mismatch" in issue for issue in res.issues)

def test_missing_mandatory_fields():
    missing_data = {
        "invoice_number": "",
        "vendor_name": None,
        "invoice_date": "",
        "subtotal": 50.0,
        "tax": 5.0,
        "total": 55.0,
        "line_items": [
            {"description": "Pen", "quantity": 1.0, "unit_price": 50.0, "amount": 50.0}
        ]
    }
    res = validator.validate(missing_data)
    assert res.is_valid is False
    assert any("Invoice Number" in issue for issue in res.issues)
    assert any("Vendor Name" in issue for issue in res.issues)
    assert any("Invoice Date" in issue for issue in res.issues)

def test_line_item_math_discrepancy():
    bad_line_math = {
        "invoice_number": "INV-1003",
        "vendor_name": "Gamma Inc",
        "invoice_date": "2026-03-02",
        "subtotal": 100.0,
        "tax": 10.0,
        "total": 110.0,
        "currency": "USD",
        "line_items": [
            {"description": "Flawed Item", "quantity": 2.0, "unit_price": 40.0, "amount": 100.0}  # 2 * 40 != 100
        ]
    }
    res = validator.validate(bad_line_math)
    assert res.is_valid is False
    assert any("Line Item Mismatch" in issue for issue in res.issues)
