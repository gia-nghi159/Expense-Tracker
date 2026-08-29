from locust import HttpUser, task, between
import uuid
import random

class FinGraphUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        """Create a group for this user session"""
        payload = {
            "name": f"Load Test Group {uuid.uuid4().hex[:6]}",
            "currency": "USD",
            "member_names": ["Alice", "Bob", "Charlie", "David"]
        }
        res = self.client.post("/api/v1/groups/quick-create", json=payload)
        if res.status_code == 201:
            self.trip_data = res.json()
            self.group_id = self.trip_data["id"]
            self.members = self.trip_data["members"]
        else:
            self.group_id = None

    @task(3)
    def add_expense(self):
        """Simulate creating an expense (writes to lock, ledger, neo4j, cache)"""
        if not self.group_id or not getattr(self, 'members', None):
            return

        payer = random.choice(self.members)
        splits = []
        
        # Split among random subset
        num_splits = random.randint(2, len(self.members))
        splitters = random.sample(self.members, num_splits)
        total_amount = round(random.uniform(10.0, 100.0), 2)
        
        split_amount = round(total_amount / num_splits, 2)
        running = 0
        for i, m in enumerate(splitters):
            if i == len(splitters) - 1:
                amt = round(total_amount - running, 2)
            else:
                amt = split_amount
            splits.append({"user_id": m["id"], "amount": amt})
            running += amt

        payload = {
            "group_id": self.group_id,
            "description": "Load Test Dinner",
            "category": "Food",
            "total_amount": total_amount,
            "paid_by_user_id": payer["id"],
            "splits": splits
        }

        headers = {"Idempotency-Key": str(uuid.uuid4())}
        self.client.post("/api/v1/expenses/ingest", json=payload, headers=headers)

    @task(1)
    def view_graph(self):
        """Simulate a user viewing the dashboard (read cache/neo4j)"""
        if self.group_id:
            self.client.get(f"/api/v1/graph/network/{self.group_id}")
