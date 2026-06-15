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

# ===== BOARD MEMBERS =====
# ===== BOARD MEMBERS =====
class BoardMemberCreate(BaseModel):
    user_id: int
    role: str = "student"        # 🔥 student или mentor
    status: str = "participant"  # 🔥 participant или admin

class BoardMemberResponse(BaseModel):
    id: int
    board_id: int
    user_id: int
    role: str
    status: str = "participant"  # 🔥 Добавили status
    user_name: Optional[str] = None      # 🔥 Имя пользователя
    user_email: Optional[str] = None     # 🔥 Email пользователя
    
    class Config:
        from_attributes = True

class BoardMemberUpdate(BaseModel):
    role: Optional[str] = None        # 🔥 student/mentor
    status: Optional[str] = None      # 🔥 participant/admin

# ===== TASKS =====
class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = "todo"
    priority: str = "med"
    board_id: int
    assignee_id: Optional[int] = None
    due_date: Optional[str] = None  # 🔥 str вместо datetime

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[int] = None
    due_date: Optional[str] = None  # 🔥 str

class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    board_id: int
    assignee_id: Optional[int] = None
    due_date: Optional[str] = None  #  Добавляем due_date
    
    class Config:
        from_attributes = True