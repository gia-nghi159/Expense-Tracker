from fastapi import APIRouter, HTTPException
from app.schemas import NetworkGraphResponse, SimplifyDebtResponse
from app.services.debt_simplifier import DebtSimplifierEngine
from app.services.graph_service import graph_service

router = APIRouter(prefix="/graph", tags=["Graph Network & Simplification"])


@router.get("/network/{group_id}", response_model=NetworkGraphResponse)
def get_group_network(group_id: str):
    """
    Fetches the full graph topology: nodes (users with net balances),
    directed weighted edges (active debts), total group spending, and unsettled debts.
    """
    network = graph_service.get_group_network(group_id)
    if not network:
        raise HTTPException(status_code=404, detail="Group not found")
    return network


@router.post("/simplify/{group_id}", response_model=SimplifyDebtResponse)
def simplify_group_debts(group_id: str):
    """
    Executes the Debt Minimization Algorithm (Cycle Elimination & Greedy Net-Balance Settlement).
    Transforms a complex, multi-edge debt web into minimal atomic payments.
    """
    network = graph_service.get_group_network(group_id)
    if not network:
        raise HTTPException(status_code=404, detail="Group not found")

    return DebtSimplifierEngine.simplify_debts(
        group_id=network.group_id,
        group_name=network.group_name,
        nodes=network.nodes,
        edges=network.edges
    )
