from typing import List
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from app.schemas import GroupCreate, GroupResponse, QuickGroupCreate
from app.services.graph_service import graph_service

router = APIRouter(prefix="/groups", tags=["Groups"])


@router.post("", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(group: GroupCreate):
    """Create a new group and connect member user nodes."""
    return graph_service.create_group(group)


@router.post("/quick-create", response_model=GroupResponse, status_code=status.HTTP_201_CREATED)
def quick_create_trip(group: QuickGroupCreate):
    """
    Creates a new Trip / Group in 1 step by automatically generating participant user nodes
    and linking them into a fresh graph. No login required.
    """
    return graph_service.quick_create_group(group)


@router.get("", response_model=List[GroupResponse])
def list_groups():
    """List all expense groups."""
    return graph_service.get_groups()


@router.get("/{group_id}", response_model=GroupResponse)
def get_group(group_id: str):
    """Get group details and member roster."""
    group = graph_service.get_group_by_id(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return group

@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(group_id: str):
    """Delete an entire group and all its expenses."""
    success = graph_service.delete_group(group_id)
    if not success:
        raise HTTPException(status_code=404, detail="Group not found")
    return None

class AddMemberRequest(BaseModel):
    name: str

@router.post("/{group_id}/members", response_model=GroupResponse)
def add_member(group_id: str, payload: AddMemberRequest):
    """Add a new member to an existing group."""
    group = graph_service.add_member(group_id, payload.name)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found or name invalid")
    return group

@router.delete("/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(group_id: str, user_id: str):
    """
    Remove a member from a group. Fails if they have non-zero active debts or ties to expenses.
    """
    res = graph_service.remove_member(group_id, user_id)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail={"message": res.get("error"), "expenses": res.get("expenses", [])})
    return None
