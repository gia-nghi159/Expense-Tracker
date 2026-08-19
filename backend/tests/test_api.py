import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_seed_and_graph_network():
    # 1. Seed demo data
    seed_res = client.post("/api/v1/seed")
    assert seed_res.status_code == 200
    seed_data = seed_res.json()
    group_id = seed_data["group_id"]
    assert seed_data["users_count"] >= 4
    assert seed_data["expenses_count"] > 0

    # 2. Fetch Network Graph
    net_res = client.get(f"/api/v1/graph/network/{group_id}")
    assert net_res.status_code == 200
    net_data = net_res.json()
    assert len(net_data["nodes"]) >= 4
    assert len(net_data["edges"]) > 0
    assert net_data["total_group_spending"] > 0
    assert net_data["total_unsettled_debt"] > 0

    # 3. Simplify Debts
    simplify_res = client.post(f"/api/v1/graph/simplify/{group_id}")
    assert simplify_res.status_code == 200
    sim_data = simplify_res.json()
    assert sim_data["simplified_settlement_count"] < sim_data["original_edge_count"]
    assert sim_data["reduction_percentage"] > 0


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

