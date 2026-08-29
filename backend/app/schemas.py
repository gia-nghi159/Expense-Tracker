from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime

class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    payment_handles: Optional[Dict[str, str]] = None

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: str

class GroupBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    currency: str = Field(default="USD", max_length=3)
    budget: Optional[float] = Field(None, ge=0)
    description: Optional[str] = None

class GroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    budget: Optional[float] = Field(None, ge=0)

class GroupCreate(GroupBase):
    member_user_ids: List[str] = []

class QuickGroupCreate(GroupBase):
    members: List[str] = []
    member_names: List[str] = []
    description: Optional[str] = None

class GroupResponse(GroupBase):
    id: str
    members: List[UserResponse] = []
    created_at: Optional[datetime] = None

class ExpenseSplit(BaseModel):
    user_id: str
    amount: float = Field(..., gt=0)

class ExpenseCreate(BaseModel):
    group_id: str
    description: str = Field(..., min_length=1, max_length=255)
    category: str = Field(default="Other", max_length=50)
    total_amount: float = Field(..., gt=0)
    paid_by_user_id: str
    created_by_name: Optional[str] = None
    splits: List[ExpenseSplit] = Field(..., min_length=1)

class ExpenseResponse(BaseModel):
    id: str
    group_id: str
    description: str
    category: str
    total_amount: float
    paid_by_user_id: str
    paid_by_name: Optional[str] = None
    created_by_name: Optional[str] = None
    created_at: datetime
    splits: List[ExpenseSplit]

class SettlementRecord(BaseModel):
    group_id: str
    from_user_id: str
    to_user_id: str
    amount: float = Field(..., gt=0)

class SettlementResponse(SettlementRecord):
    id: str
    timestamp: datetime

class GraphNode(BaseModel):
    id: str
    name: str
    net_balance: float
    total_paid: float = 0.0
    total_share: float = 0.0
    payment_handles: Optional[Dict[str, str]] = None

class GraphEdge(BaseModel):
    from_user_id: str
    from_user_name: Optional[str] = None
    to_user_id: str
    to_user_name: Optional[str] = None
    amount: float

class NetworkGraphResponse(BaseModel):
    group_id: str
    group_name: str
    currency: str
    budget: Optional[float] = None
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    total_group_spending: float
    total_unsettled_debt: float
    category_breakdown: Dict[str, float] = {}

class SettlementProposal(BaseModel):
    from_user_id: str
    from_user_name: str
    to_user_id: str
    to_user_name: str
    amount: float

class SimplifyDebtResponse(BaseModel):
    group_id: str
    group_name: str
    original_edge_count: int
    simplified_settlement_count: int
    reduction_percentage: float
    settlements: List[SettlementProposal]

class LedgerLegResponse(BaseModel):
    user_id: str
    amount_cents: int
    direction: str

class LedgerEntryResponse(BaseModel):
    transaction_id: str
    group_id: str
    entry_type: str
    timestamp: float
    legs: List[LedgerLegResponse]
    metadata: Optional[Dict] = None
