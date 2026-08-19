from fastapi import APIRouter
from app.services.graph_service import graph_service

router = APIRouter(prefix="/seed", tags=["Demo Seeding"])


@router.post("", status_code=200)
def seed_demo_data():
    """
    Seeds the financial graph with a realistic, multi-user trip dataset ('Lake Tahoe Cabin Trip')
    including 5 friends, 5 complex multi-party split expenses, and an intricate debt web.
    """
    return graph_service.seed_demo_data()
