from fastapi import APIRouter, HTTPException, status
from app.schemas import SettlementRecord, SettlementResponse
from app.services.graph_service import graph_service

router = APIRouter(prefix="/settlements", tags=["Settlements"])


@router.post("/record", response_model=SettlementResponse, status_code=status.HTTP_201_CREATED)
def record_settlement(settlement: SettlementRecord):
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

    return graph_service.record_settlement(settlement)
