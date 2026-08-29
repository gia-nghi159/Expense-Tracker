from typing import List
from fastapi import APIRouter, HTTPException
from app.schemas import UserCreate, UserResponse
from app.services.graph_service import graph_service

router = APIRouter(prefix="/users", tags=["Users"])

@router.post("", response_model=UserResponse, status_code=201)
async def create_user(user: UserCreate):
    """Create a new user node in the financial graph."""
    return graph_service.create_user(user)

@router.get("", response_model=List[UserResponse])
async def list_users():
    """Retrieve all users in the system."""
    return graph_service.get_users()

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str):
    """Get a user by ID."""
    user = graph_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
