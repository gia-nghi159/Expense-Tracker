import asyncio
import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app

@pytest.mark.anyio
async def test_concurrent_idempotent_requests():
    """
    Test that thundering herd of duplicate requests are blocked by the 3-State Idempotency Engine,
    preventing duplicate mutations or database collisions.
    """
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        # Seed a test trip
        trip = await ac.post("/api/v1/groups/quick-create", json={
                "name": "Stress Test Trip",
                "currency": "USD",
                "member_names": ["Concur User 1", "Concur User 2", "Concur User 3"]
            })
        assert trip.status_code == 201
        group_id = trip.json()["id"]
        members = trip.json()["members"]
        payer_id = members[0]["id"]
        
        idempotency_key = "test-thundering-herd-1234"
        expense_payload = {
            "group_id": group_id,
            "description": "Thundering Herd Test",
            "category": "Other",
            "total_amount": 10.00,
            "paid_by_user_id": payer_id,
            "splits": [
                {"user_id": m["id"], "amount": round(10.00 / 3, 2)} for m in members
            ]
        }
        
        # Ensure splits perfectly equal 10.00 (Penny drop)
        expense_payload["splits"][-1]["amount"] = 3.34

        # Fire 5 concurrent identical requests
        headers = {"Idempotency-Key": idempotency_key}
        tasks = [
            ac.post("/api/v1/expenses/ingest", json=expense_payload, headers=headers)
            for _ in range(5)
        ]
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Verify exactly one 201 Created and four 409 Conflicts or 201 Cached hits
        status_codes = [r.status_code for r in responses if not isinstance(r, Exception)]
        
        # In a real race, one wins (201). Others might hit 409 (PENDING lock) or 201 (COMPLETED cached)
        # depending on timing. We just want to ensure we don't duplicate the ledger entry.
        assert 201 in status_codes
        
        network = await ac.get(f"/api/v1/graph/network/{group_id}")
        assert network.status_code == 200
        # Total spending should be EXACTLY 10.00, not 20, 30, 40, or 50.
        assert network.json()["total_group_spending"] == 10.00
