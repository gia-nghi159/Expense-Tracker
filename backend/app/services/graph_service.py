import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional
from app.database import db
from app.schemas import (
    ExpenseCreate, ExpenseResponse, ExpenseSplit,
    GraphEdge, GraphNode, GroupCreate, GroupResponse,
    NetworkGraphResponse, QuickGroupCreate, SettlementRecord, SettlementResponse,
    UserCreate, UserResponse
)


class GraphService:
    """
    Service handling Cypher queries, graph mutations, and fallback graph storage.
    """

    def __init__(self):
        # In-memory storage cache for instant local execution
        self._users: Dict[str, UserResponse] = {}
        self._groups: Dict[str, GroupResponse] = {}
        self._expenses: Dict[str, ExpenseResponse] = {}
        self._debts: Dict[str, Dict[str, Dict[str, float]]] = {}  # group_id -> {from_id -> {to_id -> amount}}

    def create_user(self, data: UserCreate) -> UserResponse:
        user_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        avatar = data.avatar_url or f"https://api.dicebear.com/7.x/avataaars/svg?seed={data.name.replace(' ', '')}"

        user = UserResponse(
            id=user_id,
            name=data.name,
            email=data.email,
            avatar_url=avatar,
            created_at=created_at
        )
        self._users[user_id] = user

        # Cypher Graph Execution
        session = db.get_session()
        if session:
            try:
                query = """
                MERGE (u:User {id: $id})
                ON CREATE SET u.name = $name, u.email = $email, u.avatar_url = $avatar, u.created_at = $created_at
                RETURN u
                """
                session.run(query, id=user_id, name=data.name, email=data.email, avatar=avatar, created_at=created_at)
            except Exception as e:
                pass
            finally:
                session.close()

        return user

    def get_users(self) -> List[UserResponse]:
        return list(self._users.values())

    def get_user_by_id(self, user_id: str) -> Optional[UserResponse]:
        return self._users.get(user_id)

    def quick_create_group(self, data: "QuickGroupCreate") -> GroupResponse:
        """Creates user nodes for all member names and creates the group in 1 step."""
        created_user_ids = []
        for name in data.member_names:
            clean_name = name.strip()
            if not clean_name:
                continue
            email_slug = clean_name.lower().replace(" ", "")
            user = self.create_user(
                UserCreate(
                    name=clean_name,
                    email=f"{email_slug}@trip.local",
                    avatar_url=f"https://api.dicebear.com/7.x/avataaars/svg?seed={clean_name.replace(' ', '')}"
                )
            )
            created_user_ids.append(user.id)

        return self.create_group(
            GroupCreate(
                name=data.name,
                currency=data.currency,
                description=data.description,
                budget=data.budget if hasattr(data, 'budget') else None,
                member_user_ids=created_user_ids
            )
        )

    def create_group(self, data: GroupCreate) -> GroupResponse:
        group_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()

        members = [self._users[uid] for uid in data.member_user_ids if uid in self._users]
        group = GroupResponse(
            id=group_id,
            name=data.name,
            currency=data.currency,
            description=data.description,
            budget=data.budget if hasattr(data, 'budget') else None,
            members=members,
            created_at=created_at
        )
        self._groups[group_id] = group
        self._debts[group_id] = {}

        # Cypher Graph Execution
        session = db.get_session()
        if session:
            try:
                query = """
                CREATE (g:Group {id: $id, name: $name, currency: $currency, description: $description, budget: $budget, created_at: $created_at})
                WITH g
                UNWIND $member_ids AS member_id
                MATCH (u:User {id: member_id})
                CREATE (u)-[:MEMBER_OF]->(g)
                """
                session.run(
                    query,
                    id=group_id,
                    name=data.name,
                    currency=data.currency,
                    description=data.description or "",
                    budget=data.budget if hasattr(data, 'budget') else None,
                    created_at=created_at,
                    member_ids=data.member_user_ids
                )
            except Exception:
                pass
            finally:
                session.close()

        return group

    def get_groups(self) -> List[GroupResponse]:
        return list(self._groups.values())

    def get_group_by_id(self, group_id: str) -> Optional[GroupResponse]:
        return self._groups.get(group_id)

    def ingest_expense(self, data: ExpenseCreate) -> ExpenseResponse:
        expense_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        payer = self._users.get(data.paid_by_user_id)
        payer_name = payer.name if payer else "Unknown"

        expense = ExpenseResponse(
            id=expense_id,
            group_id=data.group_id,
            description=data.description,
            category=data.category,
            total_amount=data.total_amount,
            paid_by_user_id=data.paid_by_user_id,
            paid_by_name=payer_name,
            splits=data.splits,
            created_at=created_at
        )
        self._expenses[expense_id] = expense

        # Update Debt Graph Edges atomically
        group_debts = self._debts.setdefault(data.group_id, {})

        for split in data.splits:
            if split.user_id == data.paid_by_user_id:
                continue  # Payer does not owe themselves

            debtor_id = split.user_id
            creditor_id = data.paid_by_user_id
            amount = split.amount

            # Check if creditor currently owes debtor (reverse edge)
            reverse_owed = group_debts.get(creditor_id, {}).get(debtor_id, 0.0)

            if reverse_owed > 0:
                if reverse_owed >= amount:
                    # Offsets existing reverse debt
                    group_debts[creditor_id][debtor_id] = round(reverse_owed - amount, 2)
                    if group_debts[creditor_id][debtor_id] == 0:
                        del group_debts[creditor_id][debtor_id]
                else:
                    # Cancel reverse debt and add remainder in forward direction
                    remaining = round(amount - reverse_owed, 2)
                    del group_debts[creditor_id][debtor_id]
                    group_debts.setdefault(debtor_id, {})[creditor_id] = round(
                        group_debts.setdefault(debtor_id, {}).get(creditor_id, 0.0) + remaining, 2
                    )
            else:
                group_debts.setdefault(debtor_id, {})[creditor_id] = round(
                    group_debts.setdefault(debtor_id, {}).get(creditor_id, 0.0) + amount, 2
                )

        # Cypher Execution
        session = db.get_session()
        if session:
            try:
                cypher_query = """
                MATCH (g:Group {id: $group_id})
                MATCH (payer:User {id: $payer_id})
                CREATE (e:Expense {
                    id: $expense_id,
                    description: $description,
                    category: $category,
                    total_amount: $total_amount,
                    created_at: $created_at
                })
                CREATE (payer)-[:PAID_FOR]->(e)
                CREATE (e)-[:BELONGS_TO]->(g)
                WITH g, payer, e
                UNWIND $splits AS split
                MATCH (debtor:User {id: split.user_id})
                WHERE debtor.id <> payer.id
                MERGE (debtor)-[r:OWES {group_id: $group_id}]->(payer)
                ON CREATE SET r.amount = split.amount
                ON MATCH SET r.amount = r.amount + split.amount
                """
                session.run(
                    cypher_query,
                    group_id=data.group_id,
                    payer_id=data.paid_by_user_id,
                    expense_id=expense_id,
                    description=data.description,
                    category=data.category,
                    total_amount=data.total_amount,
                    created_at=created_at,
                    splits=[{"user_id": s.user_id, "amount": s.amount} for s in data.splits]
                )
            except Exception:
                pass
            finally:
                session.close()

        return expense


    def get_group_expenses(self, group_id: str) -> List[ExpenseResponse]:
        expenses = [e for e in self._expenses.values() if e.group_id == group_id]
        expenses.sort(key=lambda x: x.created_at, reverse=True)
        return expenses

    def _sync_neo4j_edges(self, group_id: str):
        session = db.get_session()
        if not session:
            return
        try:
            session.run("MATCH ()-[r:OWES {group_id: $group_id}]->() DELETE r", group_id=group_id)
            group_debts = self._debts.get(group_id, {})
            edges_to_create = []
            for from_id, targets in group_debts.items():
                for to_id, amount in targets.items():
                    if amount > 0:
                        edges_to_create.append({"from_id": from_id, "to_id": to_id, "amount": amount})
            if edges_to_create:
                query = """
                UNWIND $edges AS edge
                MATCH (from_u:User {id: edge.from_id})
                MATCH (to_u:User {id: edge.to_id})
                CREATE (from_u)-[:OWES {group_id: $group_id, amount: edge.amount}]->(to_u)
                """
                session.run(query, group_id=group_id, edges=edges_to_create)
        except Exception:
            pass
        finally:
            session.close()

    def delete_expense(self, expense_id: str) -> bool:
        expense = self._expenses.get(expense_id)
        if not expense:
            return False
        group_id = expense.group_id
        group_debts = self._debts.get(group_id, {})
        for split in expense.splits:
            if split.user_id == expense.paid_by_user_id:
                continue
            debtor_id = split.user_id
            creditor_id = expense.paid_by_user_id
            amount = split.amount
            current_owed = group_debts.get(debtor_id, {}).get(creditor_id, 0.0)
            if current_owed > 0:
                if current_owed >= amount:
                    group_debts[debtor_id][creditor_id] = round(current_owed - amount, 2)
                    if group_debts[debtor_id][creditor_id] == 0:
                        del group_debts[debtor_id][creditor_id]
                else:
                    remaining = round(amount - current_owed, 2)
                    del group_debts[debtor_id][creditor_id]
                    group_debts.setdefault(creditor_id, {})[debtor_id] = round(
                        group_debts.setdefault(creditor_id, {}).get(debtor_id, 0.0) + remaining, 2
                    )
            else:
                group_debts.setdefault(creditor_id, {})[debtor_id] = round(
                    group_debts.setdefault(creditor_id, {}).get(debtor_id, 0.0) + amount, 2
                )
        del self._expenses[expense_id]
        session = db.get_session()
        if session:
            try:
                session.run("MATCH (e:Expense {id: $expense_id}) DETACH DELETE e", expense_id=expense_id)
            except Exception:
                pass
            finally:
                session.close()
        self._sync_neo4j_edges(group_id)
        return True

    def update_expense(self, expense_id: str, data: ExpenseCreate) -> Optional[ExpenseResponse]:
        old_expense = self._expenses.get(expense_id)
        if not old_expense:
            return None
        
        # Save original metadata
        original_created_at = old_expense.created_at
        
        # 1. Delete old expense
        self.delete_expense(expense_id)
        
        # 2. Re-ingest with new data but same ID and timestamp
        import datetime
        
        # Modify ingest logic manually for update to preserve ID and timestamp
        group_id = data.group_id
        
        expense = ExpenseResponse(
            id=expense_id,
            group_id=group_id,
            description=data.description,
            category=data.category,
            total_amount=data.total_amount,
            paid_by_user_id=data.paid_by_user_id,
            splits=[ExpenseSplit(user_id=s.user_id, amount=s.amount) for s in data.splits],
            created_at=original_created_at
        )
        self._expenses[expense_id] = expense
        
        group_debts = self._debts.setdefault(group_id, {})
        
        for split in data.splits:
            if split.user_id == data.paid_by_user_id:
                continue
            debtor_id = split.user_id
            creditor_id = data.paid_by_user_id
            amount = split.amount
            current_owed = group_debts.get(creditor_id, {}).get(debtor_id, 0.0)
            if current_owed > 0:
                if current_owed >= amount:
                    group_debts[creditor_id][debtor_id] = round(current_owed - amount, 2)
                    if group_debts[creditor_id][debtor_id] == 0:
                        del group_debts[creditor_id][debtor_id]
                else:
                    remaining = round(amount - current_owed, 2)
                    del group_debts[creditor_id][debtor_id]
                    group_debts.setdefault(debtor_id, {})[creditor_id] = round(
                        group_debts.setdefault(debtor_id, {}).get(creditor_id, 0.0) + remaining, 2
                    )
            else:
                group_debts.setdefault(debtor_id, {})[creditor_id] = round(
                    group_debts.setdefault(debtor_id, {}).get(creditor_id, 0.0) + amount, 2
                )
                
        # Cypher Execution
        session = db.get_session()
        if session:
            try:
                cypher_query = """
                MATCH (g:Group {id: $group_id})
                MATCH (payer:User {id: $payer_id})
                CREATE (e:Expense {
                    id: $expense_id,
                    description: $description,
                    category: $category,
                    total_amount: $total_amount,
                    created_at: $created_at
                })
                CREATE (payer)-[:PAID_FOR]->(e)
                CREATE (e)-[:BELONGS_TO]->(g)
                WITH g, payer, e
                UNWIND $splits AS split
                MATCH (debtor:User {id: split.user_id})
                WHERE debtor.id <> payer.id
                MERGE (debtor)-[r:OWES {group_id: $group_id}]->(payer)
                ON CREATE SET r.amount = split.amount
                ON MATCH SET r.amount = r.amount + split.amount
                """
                session.run(
                    cypher_query,
                    group_id=data.group_id,
                    payer_id=data.paid_by_user_id,
                    expense_id=expense_id,
                    description=data.description,
                    category=data.category,
                    total_amount=data.total_amount,
                    created_at=original_created_at,
                    splits=[{"user_id": s.user_id, "amount": s.amount} for s in data.splits]
                )
            except Exception:
                pass
            finally:
                session.close()
                
        return expense


    def add_member(self, group_id: str, member_name: str) -> Optional[GroupResponse]:
        group = self._groups.get(group_id)
        if not group:
            return None
        clean_name = member_name.strip()
        if not clean_name:
            return None
        email_slug = clean_name.lower().replace(" ", "")
        user = self.create_user(
            UserCreate(
                name=clean_name,
                email=f"{email_slug}@trip.local",
                avatar_url=f"https://api.dicebear.com/7.x/avataaars/svg?seed={clean_name.replace(' ', '')}"
            )
        )
        group.members.append(user)
        session = db.get_session()
        if session:
            try:
                session.run(
                    "MATCH (u:User {id: $uid}), (g:Group {id: $gid}) MERGE (u)-[:MEMBER_OF]->(g)",
                    uid=user.id, gid=group_id
                )
            except Exception:
                pass
            finally:
                session.close()
        return group

    def remove_member(self, group_id: str, user_id: str) -> Dict:
        group = self._groups.get(group_id)
        if not group:
            return {"success": False, "error": "Group not found"}
        tied_expenses = []
        for e in self._expenses.values():
            if e.group_id == group_id:
                is_tied = False
                if e.paid_by_user_id == user_id:
                    is_tied = True
                else:
                    for s in e.splits:
                        if s.user_id == user_id and s.amount > 0:
                            is_tied = True
                            break
                if is_tied:
                    tied_expenses.append(f"'{e.description}' ({e.category})")
        if tied_expenses:
            return {
                "success": False, 
                "error": "Cannot remove user. They are still tied to these expenses:",
                "expenses": tied_expenses
            }
        group.members = [m for m in group.members if m.id != user_id]
        session = db.get_session()
        if session:
            try:
                session.run(
                    "MATCH (u:User {id: $uid})-[r:MEMBER_OF]->(g:Group {id: $gid}) DELETE r",
                    uid=user_id, gid=group_id
                )
            except Exception:
                pass
            finally:
                session.close()
        return {"success": True}

    def get_group_network(self, group_id: str) -> Optional[NetworkGraphResponse]:
        group = self._groups.get(group_id)
        if not group:
            return None

        # Build list of GraphNode and GraphEdge
        user_names = {u.id: u.name for u in group.members}
        user_emails = {u.id: u.email for u in group.members}
        user_avatars = {u.id: u.avatar_url for u in group.members}

        group_debts = self._debts.get(group_id, {})
        edges: List[GraphEdge] = []
        net_balances: Dict[str, float] = {u.id: 0.0 for u in group.members}

        total_unsettled = 0.0

        for from_id, targets in group_debts.items():
            for to_id, amount in targets.items():
                if amount > 0:
                    edges.append(
                        GraphEdge(
                            from_user_id=from_id,
                            from_user_name=user_names.get(from_id, "Unknown"),
                            to_user_id=to_id,
                            to_user_name=user_names.get(to_id, "Unknown"),
                            amount=round(amount, 2)
                        )
                    )
                    net_balances[from_id] = round(net_balances.get(from_id, 0.0) - amount, 2)
                    net_balances[to_id] = round(net_balances.get(to_id, 0.0) + amount, 2)
                    total_unsettled += amount

        nodes = [
            GraphNode(
                id=u.id,
                name=u.name,
                email=user_emails.get(u.id),
                avatar_url=user_avatars.get(u.id),
                net_balance=net_balances.get(u.id, 0.0)
            )
            for u in group.members
        ]

        total_spending = 0.0
        category_breakdown: Dict[str, float] = {}

        for e in self._expenses.values():
            if e.group_id == group_id:
                total_spending += e.total_amount
                category_breakdown[e.category] = round(category_breakdown.get(e.category, 0.0) + e.total_amount, 2)

        return NetworkGraphResponse(
            group_id=group_id,
            group_name=group.name,
            currency=group.currency,
            budget=getattr(group, 'budget', None),
            nodes=nodes,
            edges=edges,
            total_group_spending=round(total_spending, 2),
            total_unsettled_debt=round(total_unsettled, 2),
            category_breakdown=category_breakdown
        )

    def record_settlement(self, data: SettlementRecord) -> SettlementResponse:
        settlement_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()

        from_user = self._users.get(data.from_user_id)
        to_user = self._users.get(data.to_user_id)

        # Update in-memory debts
        group_debts = self._debts.setdefault(data.group_id, {})
        current_debt = group_debts.get(data.from_user_id, {}).get(data.to_user_id, 0.0)

        if current_debt > 0:
            remaining = round(current_debt - data.amount, 2)
            if remaining <= 0:
                del group_debts[data.from_user_id][data.to_user_id]
            else:
                group_debts[data.from_user_id][data.to_user_id] = remaining

        # Cypher Execution
        session = db.get_session()
        if session:
            try:
                cypher_query = """
                MATCH (from_u:User {id: $from_id})-[r:OWES {group_id: $group_id}]->(to_u:User {id: $to_id})
                SET r.amount = r.amount - $amount
                WITH r
                WHERE r.amount <= 0.01
                DELETE r
                """
                session.run(
                    cypher_query,
                    from_id=data.from_user_id,
                    to_id=data.to_user_id,
                    group_id=data.group_id,
                    amount=data.amount
                )
            except Exception:
                pass
            finally:
                session.close()

        return SettlementResponse(
            id=settlement_id,
            group_id=data.group_id,
            from_user_id=data.from_user_id,
            from_user_name=from_user.name if from_user else "Unknown",
            to_user_id=data.to_user_id,
            to_user_name=to_user.name if to_user else "Unknown",
            amount=data.amount,
            created_at=created_at
        )


    def delete_group(self, group_id: str) -> bool:
        if group_id not in self._groups:
            return False
            
        # Delete from memory
        del self._groups[group_id]
        if group_id in self._debts:
            del self._debts[group_id]
            
        # Delete expenses for this group
        expenses_to_delete = [eid for eid, e in self._expenses.items() if e.group_id == group_id]
        for eid in expenses_to_delete:
            del self._expenses[eid]
            
        # Cypher Execution
        session = db.get_session()
        if session:
            try:
                session.run("MATCH (g:Group {id: $group_id}) DETACH DELETE g", group_id=group_id)
                session.run("MATCH (e:Expense)-[:BELONGS_TO]->(g:Group {id: $group_id}) DETACH DELETE e", group_id=group_id)
                session.run("MATCH ()-[r:OWES {group_id: $group_id}]->() DELETE r", group_id=group_id)
            except Exception:
                pass
            finally:
                session.close()
                
        return True

    def seed_demo_data(self) -> Dict:
        import random
        # 1. Create Users
        names = ["Alice Vance", "Bob Martinez", "Charlie Chen", "Dave Wilson", "Emma Watson", "Fiona Gallagher", "George King", "Hannah Abbott"]
        selected_names = random.sample(names, random.randint(4, 7))
        
        users_data = [
            UserCreate(name=n, email=f"{n.split()[0].lower()}@example.com", avatar_url=f"https://api.dicebear.com/7.x/avataaars/svg?seed={n.split()[0]}")
            for n in selected_names
        ]

        created_users = [self.create_user(u) for u in users_data]
        user_ids = [u.id for u in created_users]

        # 2. Create Group
        budget_options = [None, 1000.0, 2500.0, 5000.0]
        group = self.create_group(
            GroupCreate(
                name=f"Random Trip {random.randint(100, 999)}",
                currency="USD",
                description="Randomly generated chaotic trip.",
                budget=random.choice(budget_options),
                member_user_ids=user_ids
            )
        )

        # 3. Random Expenses
        categories = ["Food", "Transport", "Lodging", "Activities", "Other"]
        items = ["Dinner", "Gas", "Airbnb", "Skiing", "Drinks", "Groceries", "Tolls", "Concert"]
        
        num_expenses = random.randint(8, 15)
        expenses = []
        for i in range(num_expenses):
            payer_id = random.choice(user_ids)
            total = round(random.uniform(20.0, 400.0), 2)
            
            # Pick a subset of users to split with
            num_splitters = random.randint(1, len(user_ids))
            splitters = random.sample(user_ids, num_splitters)
            
            # Equal split logic
            split_amount = round(total / num_splitters, 2)
            splits = []
            running_sum = 0
            for idx, uid in enumerate(splitters):
                if idx == len(splitters) - 1:
                    amt = round(total - running_sum, 2)
                else:
                    amt = split_amount
                splits.append(ExpenseSplit(user_id=uid, amount=amt))
                running_sum += amt
                
            exp = ExpenseCreate(
                group_id=group.id,
                description=f"{random.choice(items)} {i}",
                category=random.choice(categories),
                total_amount=total,
                paid_by_user_id=payer_id,
                splits=splits
            )
            expenses.append(exp)
            self.ingest_expense(exp)

        network = self.get_group_network(group.id)
        return {
            "message": "Chaotic demo seeded successfully!",
            "group_id": group.id,
            "group_name": group.name,
            "users_count": len(created_users),
            "expenses_count": len(expenses),
            "active_debt_edges": len(network.edges) if network else 0,
            "total_spending": network.total_group_spending if network else 0.0,
            "total_unsettled_debt": network.total_unsettled_debt if network else 0.0
        }


graph_service = GraphService()
