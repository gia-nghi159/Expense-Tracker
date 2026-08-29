from fastapi import APIRouter, HTTPException
from app.schemas import NetworkGraphResponse, SimplifyDebtResponse
from app.services.debt_simplifier import DebtSimplifierEngine
from app.services.graph_service import graph_service
from app.services.cache_service import cache_service
from app.services.lock_service import lock_service

router = APIRouter(prefix="/graph", tags=["Graph Network & Simplification"])

@router.get("/network/{group_id}", response_model=NetworkGraphResponse)
async def get_group_network(group_id: str):
    """
    Fetches the full graph topology: nodes (users with net balances),
    directed weighted edges (active debts), total group spending, and unsettled debts.
    Uses read-through caching.
    """
    # 1. Check Cache
    cached_network = await cache_service.get_network(group_id)
    if cached_network:
        return cached_network

    # 2. On Cache Miss, Compute
    network = graph_service.get_group_network(group_id)
    if not network:
        raise HTTPException(status_code=404, detail="Group not found")
        
    # 3. Save to Cache
    await cache_service.set_network(group_id, network.model_dump())
    
    return network

@router.post("/simplify/{group_id}", response_model=SimplifyDebtResponse)
async def simplify_group_debts(group_id: str):
    """
    Executes the Debt Minimization Algorithm (Cycle Elimination & Greedy Net-Balance Settlement).
    Transforms a complex, multi-edge debt web into minimal atomic payments.
    """
    async with lock_service.acquire(group_id):
        network = graph_service.get_group_network(group_id)
        if not network:
            raise HTTPException(status_code=404, detail="Group not found")

        return DebtSimplifierEngine.simplify_debts(
            group_id=network.group_id,
            group_name=network.group_name,
            nodes=network.nodes,
            edges=network.edges
        )
