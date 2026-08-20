from fastapi import APIRouter, HTTPException
from app.services.graph_service import graph_service

router = APIRouter(prefix="/seed", tags=["Demo Seeding"])


@router.post("", status_code=200)
def seed_demo_data():
    """
    Seeds the financial graph with a realistic, multi-user trip dataset.
    Includes a safety limit to prevent spamming the database.
    """
    # Prevent database spam / Neo4j Free Tier overload
    if len(graph_service.get_groups()) >= 5:
        raise HTTPException(
            status_code=429, 
            detail="Public demo capacity reached (Max 5 trips). Please delete some existing trips first to prevent database spam."
        )
        
    return graph_service.seed_demo_data()
