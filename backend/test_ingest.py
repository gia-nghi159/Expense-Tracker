import requests
import uuid

res1 = requests.post("http://127.0.0.1:8000/api/v1/groups/quick-create", json={
    "name": "test", "currency": "USD", "member_names": ["Alice", "Bob"]
})
group = res1.json()
group_id = group["id"]
alice_id = group["members"][0]["id"]
bob_id = group["members"][1]["id"]

payload = {
    "group_id": group_id,
    "description": "Dinner",
    "category": "Food",
    "total_amount": 100.0,
    "paid_by_user_id": alice_id,
    "splits": [{"user_id": alice_id, "amount": 50.0}, {"user_id": bob_id, "amount": 50.0}]
}
headers = {"Idempotency-Key": str(uuid.uuid4())}

res2 = requests.post("http://127.0.0.1:8000/api/v1/expenses/ingest", json=payload, headers=headers)
print(res2.status_code)
print(res2.text)
