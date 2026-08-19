from typing import Optional, List
from fastapi import APIRouter, Header, HTTPException, status
from app.schemas import ExpenseCreate, ExpenseResponse
from app.services.graph_service import graph_service
from app.services.idempotency import idempotency_store

router = APIRouter(prefix="/expenses", tags=["Expenses"])


@router.post("/ingest", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
def ingest_expense(
    expense: ExpenseCreate,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key", description="Unique UUID to guarantee idempotent write execution")
):
    """
    Atomically ingests a multi-party expense split and mutates directed debt edges in the financial graph.
    Supports 'Idempotency-Key' header to prevent double-charging from network retries.
    """
    # 1. Idempotency Check
    if idempotency_key:
        cached_response = idempotency_store.get(idempotency_key)
        if cached_response:
            return cached_response

    # 2. Validation
    group = graph_service.get_group_by_id(expense.group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    payer = graph_service.get_user_by_id(expense.paid_by_user_id)
    if not payer:
        raise HTTPException(status_code=404, detail="Payer user not found")

    # Verify split amounts add up close to total
    splits_sum = sum(s.amount for s in expense.splits)
    if abs(splits_sum - expense.total_amount) > 0.05:
        raise HTTPException(
            status_code=400,
            detail=f"Sum of splits (${splits_sum:.2f}) does not match total expense amount (${expense.total_amount:.2f})"
        )

    # 3. Ingest into graph
    result = graph_service.ingest_expense(expense)

    # 4. Cache idempotency result
    if idempotency_key:
        idempotency_store.set(idempotency_key, result.model_dump())

    return result

@router.get("/group/{group_id}", response_model=List[ExpenseResponse])
def get_group_expenses(group_id: str):
    """
    Returns all expenses associated with a given group, sorted by newest first.
    """
    group = graph_service.get_group_by_id(group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
        
    return graph_service.get_group_expenses(group_id)

@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: str):
    """
    Deletes an expense and safely reverses its impact on the multi-party debt graph.
    """
    success = graph_service.delete_expense(expense_id)
    if not success:
        raise HTTPException(status_code=404, detail="Expense not found")
    return None

@router.put("/{expense_id}", response_model=ExpenseResponse)
def update_expense(expense_id: str, expense: ExpenseCreate):
    """
    Updates an expense by completely unwinding its debt impact and re-applying the new structure.
    """
    # Verify split amounts add up close to total
    splits_sum = sum(s.amount for s in expense.splits)
    if abs(splits_sum - expense.total_amount) > 0.05:
        raise HTTPException(
            status_code=400,
            detail=f"Sum of splits (${splits_sum:.2f}) does not match total expense amount (${expense.total_amount:.2f})"
        )

    updated_expense = graph_service.update_expense(expense_id, expense)
    if not updated_expense:
        raise HTTPException(status_code=404, detail="Expense not found")
        
    return updated_expense
