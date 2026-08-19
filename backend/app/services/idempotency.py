import time
from typing import Any, Dict, Optional


class IdempotencyRegistry:
    """
    In-memory / Cache-backed Idempotency Key manager.
    Prevents duplicate transactions from network retries by caching responses for 24 hours.
    """

    def __init__(self, ttl_seconds: int = 86400):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._ttl_seconds = ttl_seconds

    def get(self, key: str) -> Optional[Any]:
        if not key:
            return None
        entry = self._cache.get(key)
        if not entry:
            return None
        if time.time() - entry["timestamp"] > self._ttl_seconds:
            del self._cache[key]
            return None
        return entry["response"]

    def set(self, key: str, response: Any):
        if not key:
            return
        self._cache[key] = {
            "response": response,
            "timestamp": time.time()
        }


idempotency_store = IdempotencyRegistry()
