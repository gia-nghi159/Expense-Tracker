from fastapi import APIRouter, HTTPException, status
from app.schemas import SettlementRecord, SettlementResponse
from app.services.graph_service import graph_service
from app.services.lock_service import lock_service
from app.services.ledger import ledger_service
from app.services.cache_service import cache_service

router = APIRouter(prefix="/settlements", tags=["Settlements"])

@router.post("/record", response_model=SettlementResponse, status_code=status.HTTP_201_CREATED)
async def record_settlement(settlement: SettlementRecord):
    """
    Records a completed debt payment between two group members.
    Mutates the graph by reducing or dissolving the corresponding [:OWES] edge.
    """
    group = graph_service.get_group_by_id(settlement.group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    from_user = graph_service.get_user_by_id(settlement.from_user_id)
    to_user = graph_service.get_user_by_id(settlement.to_user_id)
    if not from_user or not to_user:
        raise HTTPException(status_code=404, detail="One or both users not found")

    async with lock_service.acquire(settlement.group_id):
        # 1. Commit to Immutable Ledger
        ledger_service.commit_settlement(
            group_id=settlement.group_id,
            from_user_id=settlement.from_user_id,
            to_user_id=settlement.to_user_id,
            amount_dollars=settlement.amount
        )
        
        # 2. Project Graph (Neo4j Tx)
        result = graph_service.record_settlement(settlement)
        
        # 3. Invalidate Cache
        await cache_service.invalidate_group(settlement.group_id)
        
    return result
