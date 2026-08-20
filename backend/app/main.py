import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from app.api import expenses, graph, groups, seed, settlements, users
from app.config import settings
from app.database import db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("fingraph")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing FinGraph Engine...")
    db.connect()
    yield
    # Shutdown
    logger.info("Shutting down FinGraph Engine...")
    db.close()


app = FastAPI(
    title="🕸️ FinGraph API - Group Expense & Debt Settlement Graph Engine",
    description="High-performance Graph Backend for multi-party financial modeling, cycle elimination, and debt minimization.",
    version="1.0.0",
    lifespan=lifespan
)

# Mount API Routers under /api/v1
API_PREFIX = "/api/v1"
app.include_router(users.router, prefix=API_PREFIX)
app.include_router(groups.router, prefix=API_PREFIX)
app.include_router(expenses.router, prefix=API_PREFIX)
app.include_router(graph.router, prefix=API_PREFIX)
app.include_router(settlements.router, prefix=API_PREFIX)
app.include_router(seed.router, prefix=API_PREFIX)


@app.get("/health", tags=["Health"])
def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "neo4j_connected": db.is_connected
    }


@app.get("/", tags=["Health"])
def root():
    return {
        "message": "FinGraph Engine is running. Visit /docs for interactive Swagger API documentation.",
        "version": "1.0.0",
        "docs_url": "/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
