import pytest
from app.schemas import GraphEdge, GraphNode
from app.services.debt_simplifier import DebtSimplifierEngine


def test_3_person_circular_debt_cycle_cancellation():
    """
    Test cycle cancellation:
    Alice owes Bob $30.
    Bob owes Charlie $30.
    Charlie owes Alice $30.
    Expected: Net balance is $0 for all, resulting in 0 simplified settlements (100% cancelled).
    """
    nodes = [
        GraphNode(id="u1", name="Alice", net_balance=0.0),
        GraphNode(id="u2", name="Bob", net_balance=0.0),
        GraphNode(id="u3", name="Charlie", net_balance=0.0),
    ]
    edges = [
        GraphEdge(from_user_id="u1", from_user_name="Alice", to_user_id="u2", to_user_name="Bob", amount=30.0),
        GraphEdge(from_user_id="u2", from_user_name="Bob", to_user_id="u3", to_user_name="Charlie", amount=30.0),
        GraphEdge(from_user_id="u3", from_user_name="Charlie", to_user_id="u1", to_user_name="Alice", amount=30.0),
    ]

    result = DebtSimplifierEngine.simplify_debts("g1", "Test Group", nodes, edges)
    assert result.original_edge_count == 3
    assert result.simplified_settlement_count == 0
    assert len(result.settlements) == 0
    assert result.reduction_percentage == 100.0


def test_complex_multi_person_debt_minimization():
    """
    Test 4-person tangled trip expenses:
    - Alice paid $120 for Airbnb split 4 ways ($30 each -> Bob, Charlie, Dave owe Alice $30)
    - Bob paid $60 for gas split 4 ways ($15 each -> Alice, Charlie, Dave owe Bob $15)
    - Charlie paid $40 for snacks split between Charlie & Dave ($20 Dave owes Charlie)
    """
    nodes = [
        GraphNode(id="u1", name="Alice", net_balance=0.0),
        GraphNode(id="u2", name="Bob", net_balance=0.0),
        GraphNode(id="u3", name="Charlie", net_balance=0.0),
        GraphNode(id="u4", name="Dave", net_balance=0.0),
    ]
    edges = [
        # Airbnb
        GraphEdge(from_user_id="u2", from_user_name="Bob", to_user_id="u1", to_user_name="Alice", amount=30.0),
        GraphEdge(from_user_id="u3", from_user_name="Charlie", to_user_id="u1", to_user_name="Alice", amount=30.0),
        GraphEdge(from_user_id="u4", from_user_name="Dave", to_user_id="u1", to_user_name="Alice", amount=30.0),
        # Gas
        GraphEdge(from_user_id="u1", from_user_name="Alice", to_user_id="u2", to_user_name="Bob", amount=15.0),
        GraphEdge(from_user_id="u3", from_user_name="Charlie", to_user_id="u2", to_user_name="Bob", amount=15.0),
        GraphEdge(from_user_id="u4", from_user_name="Dave", to_user_id="u2", to_user_name="Bob", amount=15.0),
        # Snacks
        GraphEdge(from_user_id="u4", from_user_name="Dave", to_user_id="u3", to_user_name="Charlie", amount=20.0),
    ]

    result = DebtSimplifierEngine.simplify_debts("g1", "Trip Group", nodes, edges)
    
    # Net checks:
    # Alice: +30(B) +30(C) +30(D) -15(to B) = +75
    # Bob: -30(to A) +15(A) +15(C) +15(D) = +15
    # Charlie: -30(to A) -15(to B) +20(D) = -25
    # Dave: -30(to A) -15(to B) -20(to C) = -65
    # Total Creditors: Alice (+75), Bob (+15) -> Total = +90
    # Total Debtors: Dave (-65), Charlie (-25) -> Total = -90
    
    assert result.original_edge_count == 7
    # 2 debtors and 2 creditors can be settled in at most 3 transactions (N-1)
    assert result.simplified_settlement_count <= 3
    
    # Verify sum of settlements matches total debt flow ($90)
    total_settled = sum(s.amount for s in result.settlements)
    assert round(total_settled, 2) == 90.0
