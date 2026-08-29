import time
import json
import logging
from typing import Any, Dict, Optional, Tuple
from fastapi import HTTPException
from app.config import settings
from app.services.lock_service import lock_service

logger = logging.getLogger("fingraph.idempotency")

class IdempotencyEngine:
    """
    3-State Idempotency State Machine (PENDING -> COMPLETED).
    Prevents Thundering Herd concurrency issues by blocking identical
    requests while the first is still processing.
    """

    def __init__(self, ttl_seconds: int = 86400, pending_ttl_seconds: int = 60):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._ttl = ttl_seconds
        self._pending_ttl = pending_ttl_seconds

    async def try_acquire_pending(self, key: str) -> Optional[Any]:
        """
        Attempts to acquire the idempotency key in PENDING state.
        - Returns (True, None) if successfully acquired (caller must proceed).
        - Returns (False, cached_payload) if COMPLETED (caller must return payload).
        - Raises 409 Conflict if PENDING (caller must abort to prevent thundering herd).
        """
        if not key:
            return True, None
            
        # In-memory fallback
        entry = self._cache.get(key)
        now = time.time()
        if entry:
            if entry["status"] == "PENDING" and (now - entry["timestamp"] < self._pending_ttl):
                raise HTTPException(status_code=409, detail="Request with this Idempotency-Key is currently in-flight.")
            elif entry["status"] == "COMPLETED" and (now - entry["timestamp"] < self._ttl):
                return False, entry["response"]
            # Else expired, proceed to overwrite
            
        self._cache[key] = {
            "status": "PENDING",
            "timestamp": now
        }
        return True, None

    async def mark_completed(self, key: str, response: Any):
        if not key:
            return
            
        self._cache[key] = {
            "status": "COMPLETED",
            "response": response,
            "timestamp": time.time()
        }

    async def release_failed(self, key: str):
        """Removes the PENDING key if the operation aborted."""
        if not key:
            return
            
        if key in self._cache:
            del self._cache[key]

idempotency_store = IdempotencyEngine()
