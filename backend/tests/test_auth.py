import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token

client = TestClient(app)

def test_password_hashing():
    raw = "SecureSecretPass123!"
    hashed = hash_password(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_token_flow():
    token = create_access_token({"sub": "99", "email": "test@example.com"})
    assert isinstance(token, str)
    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == "99"
    assert payload["email"] == "test@example.com"

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
    assert "services" in data
    assert "azure_document_intelligence" in data["services"]

def test_user_register_and_login():
    email = "testuser_unique_99@invoiceai.com"
    reg_payload = {
        "name": "Test Engineer",
        "email": email,
        "password": "Password123!"
    }
    # Register
    res = client.post("/api/auth/register", json=reg_payload)
    if res.status_code == 400:
        # Already exists
        pass
    else:
        assert res.status_code == 201
        assert "access_token" in res.json()

    # Login
    login_res = client.post("/api/auth/login", json={"email": email, "password": "Password123!"})
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    assert token is not None

    # Get Me
    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["email"] == email
