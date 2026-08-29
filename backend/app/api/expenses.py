from typing import Optional, List
from fastapi import APIRouter, Header, HTTPException, status
from app.schemas import ExpenseCreate, ExpenseResponse
from app.services.graph_service import graph_service
from app.services.idempotency import idempotency_store
from app.services.lock_service import lock_service
from app.services.ledger import ledger_service
from app.services.cache_service import cache_service

router = APIRouter(prefix="/expenses", tags=["Expenses"])

@router.post("/ingest", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def ingest_expense(
    expense: ExpenseCreate,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key", description="Unique UUID to guarantee idempotent write execution")
):
    """
    Atomically ingests a multi-party expense split and mutates directed debt edges in the financial graph.
    Uses 5-stage pipeline: Idempotency -> Lock -> Ledger -> Neo4j Tx -> Cache Invalidation.
    """
    # 1. Idempotency Check (3-State)
    acquired_pending = True
    if idempotency_key:
        acquired_pending, cached_response = await idempotency_store.try_acquire_pending(idempotency_key)
        if not acquired_pending:
            return cached_response

    try:
        # 2. Validation
        group = graph_service.get_group_by_id(expense.group_id)
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")

        payer = graph_service.get_user_by_id(expense.paid_by_user_id)
        if not payer:
            raise HTTPException(status_code=404, detail="Payer user not found")

        # Verify split amounts add up exactly to total using integers (Penny Drop validation)
        from app.services.ledger import PennyDropSplitter
        splits_sum_cents = sum(PennyDropSplitter.to_cents(s.amount) for s in expense.splits)
        total_cents = PennyDropSplitter.to_cents(expense.total_amount)
        if splits_sum_cents != total_cents:
            raise HTTPException(
                status_code=400,
                detail=f"Invariant Violation: Sum of splits ({splits_sum_cents} cents) does not match total expense amount ({total_cents} cents)"
            )

        # 3. Acquire Group Lock
        async with lock_service.acquire(expense.group_id):
            # 4. Commit to Immutable Ledger
            splits_dict = {s.user_id: s.amount for s in expense.splits}
            ledger_entry = ledger_service.commit_expense(
                group_id=expense.group_id,
                payer_id=expense.paid_by_user_id,
                total_dollars=expense.total_amount,
                splits=splits_dict,
                metadata={"description": expense.description, "category": expense.category}
            )

            # 5. Project Graph (Neo4j ACID Transaction & Memory sync)
            result = graph_service.ingest_expense(expense)

            # 6. Invalidate Group Cache
            await cache_service.invalidate_group(expense.group_id)

        # 7. Complete Idempotency
        if idempotency_key:
            await idempotency_store.mark_completed(idempotency_key, result.model_dump())

        return result

    except Exception as e:
        if idempotency_key:
            await idempotency_store.release_failed(idempotency_key)
        raise e

@router.get("/group/{group_id}", response_model=List[ExpenseResponse])
async def get_group_expenses(group_id: str):
    group = graph_service.get_group_by_id(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return graph_service.get_group_expenses(group_id)

@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(expense_id: str):
    expense = graph_service._expenses.get(expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    async with lock_service.acquire(expense.group_id):
        success = graph_service.delete_expense(expense_id)
        if not success:
            raise HTTPException(status_code=404, detail="Expense not found")
        await cache_service.invalidate_group(expense.group_id)
    return None

@router.put("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(expense_id: str, expense: ExpenseCreate):
    from app.services.ledger import PennyDropSplitter
    splits_sum_cents = sum(PennyDropSplitter.to_cents(s.amount) for s in expense.splits)
    total_cents = PennyDropSplitter.to_cents(expense.total_amount)
    if splits_sum_cents != total_cents:
        raise HTTPException(
            status_code=400,
            detail=f"Sum of splits ({splits_sum_cents} cents) does not match total expense amount ({total_cents} cents)"
        )

    async with lock_service.acquire(expense.group_id):
        updated_expense = graph_service.update_expense(expense_id, expense)
        if not updated_expense:
            raise HTTPException(status_code=404, detail="Expense not found")
        await cache_service.invalidate_group(expense.group_id)
        
    return updated_expense
