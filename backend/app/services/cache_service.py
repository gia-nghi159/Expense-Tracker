import json
import logging
from typing import Optional, Any
from app.services.lock_service import lock_service

logger = logging.getLogger("fingraph.cache")

class CacheService:
    """
    Read-through cache for graph network topology and member balances.
    Invalidated automatically on ledger commits (Dual-Write pipeline).
    """

    def __init__(self):
        self._local_cache = {}

    async def get_network(self, group_id: str) -> Optional[Any]:
        """Fetch serialized network graph from cache."""
        key = f"group:{group_id}:network"
        redis_client = lock_service._redis_client
        
        if redis_client:
            raw = await redis_client.get(key)
            if raw:
                try:
                    return json.loads(raw)
                except Exception:
                    return None
        else:
            return self._local_cache.get(key)
        return None

    async def set_network(self, group_id: str, data: Any, ttl: int = 3600):
        """Cache serialized network graph."""
        key = f"group:{group_id}:network"
        redis_client = lock_service._redis_client
        
        if redis_client:
            await redis_client.set(key, json.dumps(data), ex=ttl)
        else:
            self._local_cache[key] = data

    async def invalidate_group(self, group_id: str):
        """Invalidate the group network cache."""
        key = f"group:{group_id}:network"
        redis_client = lock_service._redis_client
        
        if redis_client:
            await redis_client.delete(key)
            logger.info(f"Invalidated cache for {key} in Redis.")
        else:
            if key in self._local_cache:
                del self._local_cache[key]
                logger.info(f"Invalidated cache for {key} locally.")

cache_service = CacheService()
