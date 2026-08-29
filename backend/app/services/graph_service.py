import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional
from app.database import db
from app.schemas import (
    ExpenseCreate, ExpenseResponse, ExpenseSplit,
    GraphEdge, GraphNode, GroupCreate, GroupResponse,
    NetworkGraphResponse, QuickGroupCreate, SettlementRecord, SettlementResponse,
    UserCreate, UserResponse, GroupUpdate
)


class GraphService:
    """
    Service handling Cypher queries, graph mutations, and fallback graph storage.
    Uses Neo4j ACID transactions via session.execute_write.
    """

    def __init__(self):
        # In-memory storage cache for instant local execution
        self._users: Dict[str, UserResponse] = {}
        self._groups: Dict[str, GroupResponse] = {}
        self._expenses: Dict[str, ExpenseResponse] = {}
        self._debts: Dict[str, Dict[str, Dict[str, float]]] = {}  # group_id -> {from_id -> {to_id -> amount}}
        self._last_wipe_date = None

    def _daily_wipe(self, days_abandoned=30):
        """Runs daily garbage collection on abandoned trips (older than 30 days)."""
        from datetime import timedelta
        today = datetime.now(timezone.utc).date()
        if self._last_wipe_date != today:
            self._last_wipe_date = today
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_abandoned)
            
            groups_to_delete = []
            for group in list(self._groups.values()):
                if not group.created_at:
                    continue
                created_at = datetime.fromisoformat(group.created_at)
                if created_at > cutoff_date:
                    continue
                
                expenses = [e for e in self._expenses.values() if e.group_id == group.id]
                expenses.sort(key=lambda x: x.created_at, reverse=True)
                
                is_abandoned = True
                if expenses:
                    latest_exp_date = datetime.fromisoformat(expenses[0].created_at)
                    if latest_exp_date > cutoff_date:
                        is_abandoned = False
                
                if is_abandoned:
                    groups_to_delete.append(group.id)
            
            for gid in groups_to_delete:
                self.delete_group(gid)

    def create_user(self, data: UserCreate) -> UserResponse:
        user_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        avatar = data.avatar_url or f"https://api.dicebear.com/7.x/notionists/svg?seed={data.name.replace(' ', '')}"

        user = UserResponse(
            id=user_id,
            name=data.name,
            email=data.email,
            avatar_url=avatar,
            created_at=created_at
        )
        self._users[user_id] = user

        # Cypher Graph Execution via execute_write
        session = db.get_session()
        if session:
            try:
                def tx_create_user(tx):
                    query = """
                    MERGE (u:User {id: $id})
                    ON CREATE SET u.name = $name, u.email = $email, u.avatar_url = $avatar, u.created_at = $created_at
                    RETURN u
                    """
                    tx.run(query, id=user_id, name=data.name, email=data.email, avatar=avatar, created_at=created_at)
                session.execute_write(tx_create_user)
            except Exception:
                pass
            finally:
                session.close()

        return user

    def get_users(self) -> List[UserResponse]:
        return list(self._users.values())

    def get_user_by_id(self, user_id: str) -> Optional[UserResponse]:
        return self._users.get(user_id)

    def quick_create_group(self, data: "QuickGroupCreate") -> GroupResponse:
        self._daily_wipe()
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
                    avatar_url=f"https://api.dicebear.com/7.x/notionists/svg?seed={clean_name.replace(' ', '')}"
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

        session = db.get_session()
        if session:
            try:
                def tx_create_group(tx):
                    query = """
                    CREATE (g:Group {id: $id, name: $name, currency: $currency, description: $description, budget: $budget, created_at: $created_at})
                    WITH g
                    UNWIND $member_ids AS member_id
                    MATCH (u:User {id: member_id})
                    CREATE (u)-[:MEMBER_OF]->(g)
                    """
                    tx.run(
                        query,
                        id=group_id,
                        name=data.name,
                        currency=data.currency,
                        description=data.description or "",
                        budget=data.budget if hasattr(data, 'budget') else None,
                        created_at=created_at,
                        member_ids=data.member_user_ids
                    )
                session.execute_write(tx_create_group)
            except Exception:
                pass
            finally:
                session.close()

        return group

    def get_groups(self) -> List[GroupResponse]:
        return list(self._groups.values())

    def get_group_by_id(self, group_id: str) -> Optional[GroupResponse]:
        return self._groups.get(group_id)

    def update_group(self, group_id: str, data: "GroupUpdate") -> Optional[GroupResponse]:
        group = self._groups.get(group_id)
        if not group:
            return None

        if data.name is not None:
            group.name = data.name
        if hasattr(data, 'budget') and data.budget is not None:
            group.budget = data.budget

        session = db.get_session()
        if session:
            try:
                def tx_update_grp(tx):
                    tx.run(
                        "MATCH (g:Group {id: $id}) SET g.name = $name, g.budget = $budget",
                        id=group_id, name=group.name, budget=getattr(group, 'budget', None)
                    )
                session.execute_write(tx_update_grp)
            except Exception:
                pass
            finally:
                session.close()

        return group

    def ingest_expense(self, data: ExpenseCreate) -> ExpenseResponse:
        expense_id = str(uuid.uuid4())
        created_at = datetime.now(timezone.utc).isoformat()
        payer = self._users.get(data.paid_by_user_id)
        payer_name = payer.name if payer else "Unknown"
        
        # Add created_by_name using payer_name as fallback if missing
        expense = ExpenseResponse(
            id=expense_id,
            group_id=data.group_id,
            description=data.description,
            category=data.category,
            total_amount=data.total_amount,
            paid_by_user_id=data.paid_by_user_id,
            paid_by_name=payer_name,
            created_by_name=payer_name,
            splits=data.splits,
            created_at=created_at
        )
        self._expenses[expense_id] = expense

        # Update Debt Graph Edges atomically in memory
        group_debts = self._debts.setdefault(data.group_id, {})

        for split in data.splits:
            if split.user_id == data.paid_by_user_id:
                continue

            debtor_id = split.user_id
            creditor_id = data.paid_by_user_id
            amount = split.amount

            reverse_owed = group_debts.get(creditor_id, {}).get(debtor_id, 0.0)
            if reverse_owed > 0:
                if reverse_owed >= amount:
                    group_debts[creditor_id][debtor_id] = round(reverse_owed - amount, 2)
                    if group_debts[creditor_id][debtor_id] == 0:
                        del group_debts[creditor_id][debtor_id]
                else:
                    remaining = round(amount - reverse_owed, 2)
                    del group_debts[creditor_id][debtor_id]
                    group_debts.setdefault(debtor_id, {})[creditor_id] = round(
                        group_debts.setdefault(debtor_id, {}).get(creditor_id, 0.0) + remaining, 2
                    )
            else:
                group_debts.setdefault(debtor_id, {})[creditor_id] = round(
                    group_debts.setdefault(debtor_id, {}).get(creditor_id, 0.0) + amount, 2
                )

        session = db.get_session()
        if session:
            try:
                def tx_ingest_expense(tx):
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
                    tx.run(
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
                session.execute_write(tx_ingest_expense)
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
            def tx_sync(tx):
                tx.run("MATCH ()-[r:OWES {group_id: $group_id}]->() DELETE r", group_id=group_id)
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
                    tx.run(query, group_id=group_id, edges=edges_to_create)
            session.execute_write(tx_sync)
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
                def tx_delete_exp(tx):
                    tx.run("MATCH (e:Expense {id: $expense_id}) DETACH DELETE e", expense_id=expense_id)
                session.execute_write(tx_delete_exp)
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
        
        original_created_at = old_expense.created_at
        self.delete_expense(expense_id)
        
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
                
        session = db.get_session()
        if session:
            try:
                def tx_update_exp(tx):
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
                    tx.run(
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
                session.execute_write(tx_update_exp)
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
                avatar_url=f"https://api.dicebear.com/7.x/notionists/svg?seed={clean_name.replace(' ', '')}"
            )
        )
        group.members.append(user)
        session = db.get_session()
        if session:
            try:
                def tx_add_mem(tx):
                    tx.run(
                        "MATCH (u:User {id: $uid}), (g:Group {id: $gid}) MERGE (u)-[:MEMBER_OF]->(g)",
                        uid=user.id, gid=group_id
                    )
                session.execute_write(tx_add_mem)
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
                def tx_rem_mem(tx):
                    tx.run(
                        "MATCH (u:User {id: $uid})-[r:MEMBER_OF]->(g:Group {id: $gid}) DELETE r",
                        uid=user_id, gid=group_id
                    )
                session.execute_write(tx_rem_mem)
            except Exception:
                pass
            finally:
                session.close()
        return {"success": True}

    def get_group_network(self, group_id: str) -> Optional[NetworkGraphResponse]:
        group = self._groups.get(group_id)
        if not group:
            return None

        user_names = {u.id: u.name for u in group.members}
        user_emails = {u.id: u.email for u in group.members}
        user_avatars = {u.id: u.avatar_url for u in group.members}

        group_debts = self._debts.get(group_id, {})
        edges: List[GraphEdge] = []
        net_balances: Dict[str, float] = {u.id: 0.0 for u in group.members}
        
        # New additions for Phase 2: total_paid and total_share tracking
        total_paid: Dict[str, float] = {u.id: 0.0 for u in group.members}
        total_share: Dict[str, float] = {u.id: 0.0 for u in group.members}

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

        total_spending = 0.0
        category_breakdown: Dict[str, float] = {}

        for e in self._expenses.values():
            if e.group_id == group_id:
                total_spending += e.total_amount
                category_breakdown[e.category] = round(category_breakdown.get(e.category, 0.0) + e.total_amount, 2)
                # Track what each user paid vs consumed
                total_paid[e.paid_by_user_id] = round(total_paid.get(e.paid_by_user_id, 0.0) + e.total_amount, 2)
                for s in e.splits:
                    total_share[s.user_id] = round(total_share.get(s.user_id, 0.0) + s.amount, 2)

        nodes = [
            GraphNode(
                id=u.id,
                name=u.name,
                email=user_emails.get(u.id),
                avatar_url=user_avatars.get(u.id),
                net_balance=net_balances.get(u.id, 0.0),
                total_paid=total_paid.get(u.id, 0.0),
                total_share=total_share.get(u.id, 0.0),
                payment_handles=u.payment_handles if hasattr(u, 'payment_handles') else None
            )
            for u in group.members
        ]

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

        group_debts = self._debts.setdefault(data.group_id, {})
        current_debt = group_debts.get(data.from_user_id, {}).get(data.to_user_id, 0.0)

        if current_debt > 0:
            remaining = round(current_debt - data.amount, 2)
            if remaining <= 0:
                del group_debts[data.from_user_id][data.to_user_id]
            else:
                group_debts[data.from_user_id][data.to_user_id] = remaining

        session = db.get_session()
        if session:
            try:
                def tx_settle(tx):
                    cypher_query = """
                    MATCH (from_u:User {id: $from_id})-[r:OWES {group_id: $group_id}]->(to_u:User {id: $to_id})
                    SET r.amount = r.amount - $amount
                    WITH r
                    WHERE r.amount <= 0.01
                    DELETE r
                    """
                    tx.run(
                        cypher_query,
                        from_id=data.from_user_id,
                        to_id=data.to_user_id,
                        group_id=data.group_id,
                        amount=data.amount
                    )
                session.execute_write(tx_settle)
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
            
        del self._groups[group_id]
        if group_id in self._debts:
            del self._debts[group_id]
            
        expenses_to_delete = [eid for eid, e in self._expenses.items() if e.group_id == group_id]
        for eid in expenses_to_delete:
            del self._expenses[eid]
            
        session = db.get_session()
        if session:
            try:
                def tx_delete_grp(tx):
                    tx.run("MATCH (g:Group {id: $group_id}) DETACH DELETE g", group_id=group_id)
                    tx.run("MATCH (e:Expense)-[:BELONGS_TO]->(g:Group {id: $group_id}) DETACH DELETE e", group_id=group_id)
                    tx.run("MATCH ()-[r:OWES {group_id: $group_id}]->() DELETE r", group_id=group_id)
                session.execute_write(tx_delete_grp)
            except Exception:
                pass
            finally:
                session.close()
                
        return True




graph_service = GraphService()
