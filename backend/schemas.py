from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# ===== AUTH =====
class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    role: str
    
    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

# ===== BOARDS =====
class BoardCreate(BaseModel):
    name: str
    description: Optional[str] = None

class BoardResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    owner_id: int
    
    class Config:
        from_attributes = True

# ===== TASKS =====
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "todo"
    priority: str = "med"
    board_id: int
    assignee_id: Optional[int] = None
    due_date: Optional[datetime] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[int] = None
    due_date: Optional[datetime] = None

class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    board_id: int
    assignee_id: Optional[int] = None
    
    class Config:
        from_attributes = True