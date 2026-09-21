import os
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture
def auth_headers():
    # Login as demo user
    res = client.post("/api/auth/login", json={"email": "demo@invoiceai.com", "password": "Password123!"})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_get_invoices_list(auth_headers):
    res = client.get("/api/invoices", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "invoices" in data
    assert "total" in data
    assert data["total"] > 0

def test_get_invoice_detail(auth_headers):
    # First get an invoice ID
    list_res = client.get("/api/invoices", headers=auth_headers)
    invoices = list_res.json()["invoices"]
    assert len(invoices) > 0
    inv_id = invoices[0]["id"]

    detail_res = client.get(f"/api/invoices/{inv_id}", headers=auth_headers)
    assert detail_res.status_code == 200
    inv_data = detail_res.json()
    assert inv_data["id"] == inv_id
    assert "items" in inv_data
    assert "issues" in inv_data

def test_analytics_summary(auth_headers):
    res = client.get("/api/analytics/summary", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_invoices" in data
    assert "total_amount" in data
    assert "status_distribution" in data
    assert "top_vendors" in data
    assert "monthly_trends" in data

def test_invoice_process_upload(auth_headers):
    sample_pdf_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", "..", "sample_invoices", "sample_azure_cloud.pdf")
    )
    assert os.path.exists(sample_pdf_path)

    with open(sample_pdf_path, "rb") as f:
        files = {"file": ("test_upload_azure.pdf", f, "application/pdf")}
        res = client.post("/api/invoices/process", headers=auth_headers, files=files)

    assert res.status_code == 200
    data = res.json()
    assert "invoice" in data
    assert "validation" in data
    assert "ai_analysis" in data
    assert "mode" in data
    assert data["invoice"]["invoice_number"] is not None
