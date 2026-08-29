import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_idempotent_expense_creation():
    # 1. Create 2 users
    u1 = client.post("/api/v1/users", json={"name": "User Alpha", "email": "alpha@test.com"}).json()
    u2 = client.post("/api/v1/users", json={"name": "User Beta", "email": "beta@test.com"}).json()

    # 2. Create group
    g = client.post(
        "/api/v1/groups",
        json={"name": "Test Split Group", "currency": "USD", "member_user_ids": [u1["id"], u2["id"]]}
    ).json()

    # 3. Ingest expense with Idempotency-Key
    idempotency_key = "idemp-test-uuid-12345"
    payload = {
        "group_id": g["id"],
        "description": "Team Lunch",
        "category": "Food",
        "total_amount": 50.0,
        "paid_by_user_id": u1["id"],
        "splits": [
            {"user_id": u1["id"], "amount": 25.0},
            {"user_id": u2["id"], "amount": 25.0}
        ]
    }

    res1 = client.post("/api/v1/expenses/ingest", json=payload, headers={"Idempotency-Key": idempotency_key})
    assert res1.status_code == 201
    data1 = res1.json()

    # Repeat exact same request with same Idempotency-Key
    res2 = client.post("/api/v1/expenses/ingest", json=payload, headers={"Idempotency-Key": idempotency_key})
    assert res2.status_code == 201
    data2 = res2.json()

    # The expense ID and contents should match exactly (cached replay, not a duplicate write)
    assert data1["id"] == data2["id"]


def test_quick_create_trip():
    payload = {
        "name": "Tokyo Spring 2026",
        "currency": "JPY",
        "description": "7 days trip",
        "member_names": ["Kenji", "Hana", "Ren"]
    }
    res = client.post("/api/v1/groups/quick-create", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Tokyo Spring 2026"
    assert len(data["members"]) == 3

