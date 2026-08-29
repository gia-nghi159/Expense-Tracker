import asyncio
import logging
import uuid
from typing import Optional
from contextlib import asynccontextmanager
from fastapi import HTTPException
from app.config import settings

logger = logging.getLogger("fingraph.lock")


class DistributedLockManager:
    """
    Safe distributed locking for group-level concurrency control.
    Uses asyncio.Lock for single-process local development.
    """
    
    def __init__(self):
        self._local_locks: dict[str, asyncio.Lock] = {}

    async def _get_local_lock(self, key: str) -> asyncio.Lock:
        if key not in self._local_locks:
            self._local_locks[key] = asyncio.Lock()
        return self._local_locks[key]

    @asynccontextmanager
    async def acquire(self, group_id: str, ttl: int = 10, timeout: float = 3.0, retry_delay: float = 0.1):
        """
        Acquires a mutex lock for a specific group to prevent race conditions.
        Throws a 409 Conflict if the lock cannot be acquired within the timeout.
        """
        lock_key = f"lock:group:{group_id}"
        
        local_lock = await self._get_local_lock(lock_key)
        try:
            # asyncio.wait_for wraps the acquire to respect timeout
            await asyncio.wait_for(local_lock.acquire(), timeout=timeout)
            yield
        except asyncio.TimeoutError:
            logger.error(f"Timeout waiting for local group lock {lock_key}")
            raise HTTPException(status_code=409, detail="Resource is currently busy. Please try again.")
        finally:
            local_lock.release()

lock_service = DistributedLockManager()
