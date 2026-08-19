from typing import Dict, List, Tuple
from app.schemas import GraphEdge, GraphNode, SettlementProposal, SimplifyDebtResponse


class DebtSimplifierEngine:
    """
    Greedy Net-Balance Debt Minimization & Cycle Elimination Algorithm.
    Reduces an O(N^2) dense cyclic debt graph to at most (N - 1) atomic settlements.
    """

    EPSILON = 0.01  # Tolerance for floating point currency arithmetic

    @classmethod
    def simplify_debts(
        cls,
        group_id: str,
        group_name: str,
        nodes: List[GraphNode],
        edges: List[GraphEdge]
    ) -> SimplifyDebtResponse:
        # Map user IDs to names for readability
        user_names: Dict[str, str] = {node.id: node.name for node in nodes}

        # Step 1: Calculate Net Balance for each user across all active debt edges
        # Net balance = (Money owed to this user) - (Money this user owes others)
        net_balances: Dict[str, float] = {node.id: 0.0 for node in nodes}

        for edge in edges:
            # from_user owes to_user
            net_balances[edge.from_user_id] -= edge.amount
            net_balances[edge.to_user_id] += edge.amount

        # Step 2: Segregate into Debtors (negative balance) and Creditors (positive balance)
        debtors: List[List] = []  # List of [user_id, amount_owed]
        creditors: List[List] = []  # List of [user_id, amount_to_receive]

        for user_id, balance in net_balances.items():
            rounded_bal = round(balance, 2)
            if rounded_bal < -cls.EPSILON:
                debtors.append([user_id, abs(rounded_bal)])
            elif rounded_bal > cls.EPSILON:
                creditors.append([user_id, rounded_bal])

        # Step 3: Greedy Settlement Matching
        settlements: List[SettlementProposal] = []

        # Sort descending by magnitude to minimize overall transaction hops
        debtors.sort(key=lambda x: x[1], reverse=True)
        creditors.sort(key=lambda x: x[1], reverse=True)

        d_idx = 0
        c_idx = 0

        while d_idx < len(debtors) and c_idx < len(creditors):
            debtor_id, debt_amount = debtors[d_idx]
            creditor_id, credit_amount = creditors[c_idx]

            settle_amount = round(min(debt_amount, credit_amount), 2)

            if settle_amount > cls.EPSILON:
                settlements.append(
                    SettlementProposal(
                        from_user_id=debtor_id,
                        from_user_name=user_names.get(debtor_id, "Unknown"),
                        to_user_id=creditor_id,
                        to_user_name=user_names.get(creditor_id, "Unknown"),
                        amount=settle_amount
                    )
                )

            # Update remaining amounts
            debtors[d_idx][1] = round(debt_amount - settle_amount, 2)
            creditors[c_idx][1] = round(credit_amount - settle_amount, 2)

            if debtors[d_idx][1] <= cls.EPSILON:
                d_idx += 1
            if creditors[c_idx][1] <= cls.EPSILON:
                c_idx += 1

        original_count = len(edges)
        simplified_count = len(settlements)

        if original_count > 0:
            reduction = round(((original_count - simplified_count) / original_count) * 100, 1)
        else:
            reduction = 0.0

        return SimplifyDebtResponse(
            group_id=group_id,
            group_name=group_name,
            original_edge_count=original_count,
            simplified_settlement_count=simplified_count,
            reduction_percentage=max(0.0, reduction),
            settlements=settlements
        )
