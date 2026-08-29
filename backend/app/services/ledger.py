import uuid
import time
from typing import List, Dict, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone
import logging

logger = logging.getLogger("fingraph.ledger")

class LedgerLeg(BaseModel):
    user_id: str
    amount_cents: int = Field(..., ge=0)
    direction: str = Field(...)  # 'DEBIT' (owes money / spent) or 'CREDIT' (paid money)

class LedgerEntry(BaseModel):
    transaction_id: str
    group_id: str
    entry_type: str  # 'EXPENSE' or 'SETTLEMENT'
    timestamp: float
    legs: List[LedgerLeg]
    metadata: Optional[Dict] = None

class PennyDropSplitter:
    @staticmethod
    def to_cents(dollars: float) -> int:
        return int(round(dollars * 100))

    @staticmethod
    def to_dollars(cents: int) -> float:
        return cents / 100.0

    @staticmethod
    def split_cents_evenly(total_cents: int, count: int) -> List[int]:
        """
        Splits total_cents evenly into `count` parts.
        Distributes the modulo remainder 1 cent at a time to the first R participants
        so the sum exactly equals total_cents.
        """
        if count <= 0:
            return []
        base = total_cents // count
        remainder = total_cents % count
        return [base + (1 if i < remainder else 0) for i in range(count)]


class LedgerService:
    """
    Append-only Immutable Double-Entry Ledger.
    Validates invariants using integer cents.
    """
    def __init__(self):
        # In-memory store for now, typically backed by Postgres/SQLite
        self._entries: List[LedgerEntry] = []

    def commit_expense(self, group_id: str, payer_id: str, total_dollars: float, splits: Dict[str, float], metadata: Dict = None) -> LedgerEntry:
        """
        Commits an expense to the ledger.
        splits: dict mapping user_id -> dollars owed
        """
        total_cents = PennyDropSplitter.to_cents(total_dollars)
        
        legs = []
        # The payer gets a CREDIT for the total amount they paid
        legs.append(LedgerLeg(user_id=payer_id, amount_cents=total_cents, direction="CREDIT"))
        
        sum_debits = 0
        for user_id, amount_dollars in splits.items():
            amount_cents = PennyDropSplitter.to_cents(amount_dollars)
            legs.append(LedgerLeg(user_id=user_id, amount_cents=amount_cents, direction="DEBIT"))
            sum_debits += amount_cents

        # Invariant Check
        if sum_debits != total_cents:
            raise ValueError(f"Invariant Violation: Sum of splits ({sum_debits} cents) != Total expense ({total_cents} cents)")

        entry = LedgerEntry(
            transaction_id=str(uuid.uuid4()),
            group_id=group_id,
            entry_type="EXPENSE",
            timestamp=time.time(),
            legs=legs,
            metadata=metadata
        )
        self._entries.append(entry)
        logger.info(f"Committed EXPENSE ledger entry {entry.transaction_id} for group {group_id}")
        return entry

    def commit_settlement(self, group_id: str, from_user_id: str, to_user_id: str, amount_dollars: float) -> LedgerEntry:
        amount_cents = PennyDropSplitter.to_cents(amount_dollars)
        
        legs = [
            # from_user paid money, so they get a CREDIT
            LedgerLeg(user_id=from_user_id, amount_cents=amount_cents, direction="CREDIT"),
            # to_user received money, so it's a DEBIT to their net balance (reduces what they are owed)
            LedgerLeg(user_id=to_user_id, amount_cents=amount_cents, direction="DEBIT")
        ]

        entry = LedgerEntry(
            transaction_id=str(uuid.uuid4()),
            group_id=group_id,
            entry_type="SETTLEMENT",
            timestamp=time.time(),
            legs=legs
        )
        self._entries.append(entry)
        logger.info(f"Committed SETTLEMENT ledger entry {entry.transaction_id} for group {group_id}")
        return entry

    def get_group_entries(self, group_id: str) -> List[LedgerEntry]:
        return [e for e in self._entries if e.group_id == group_id]

ledger_service = LedgerService()
