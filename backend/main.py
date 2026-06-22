from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import engine, Base, get_db
from models import User, Board, Task, BoardMember
from schemas import (
    UserCreate, UserResponse, UserLogin, Token,
    BoardCreate, BoardResponse,
    TaskCreate, TaskUpdate, TaskResponse,
    BoardMemberCreate, BoardMemberResponse, BoardMemberUpdate
)
from auth import get_password_hash, verify_password, create_access_token, get_current_user
from fastapi import Request
from fastapi.responses import RedirectResponse
import httpx

Base.metadata.create_all(bind=engine)

app = FastAPI(title="IMCTech API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== AUTH ENDPOINTS =====
@app.get("/")
def root():
    return {"message": "IMCTech API работает!"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/auth/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email уже занят")
    
    new_user = User(
        name=user.name,
        email=user.email,
        hashed_password=get_password_hash(user.password),
        role="student"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

@app.post("/api/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == form_data.username).first()
    if not db_user or not verify_password(form_data.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Неверный email или пароль")
    
    access_token = create_access_token(data={"sub": db_user.id})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ===== BOARD ENDPOINTS =====
@app.post("/api/boards", response_model=BoardResponse)
def create_board(board: BoardCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_board = Board(
        name=board.name,
        description=board.description,
        owner_id=current_user.id
    )
    db.add(new_board)
    db.commit()
    db.refresh(new_board)
    
    owner_member = BoardMember(
        board_id=new_board.id,
        user_id=current_user.id,
        role="mentor",
        status="admin"  #  Владелец = админ
    )
    db.add(owner_member)
    db.commit()
    
    return new_board

@app.get("/api/boards", response_model=list[BoardResponse])
def get_boards(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    owned = db.query(Board).filter(Board.owner_id == current_user.id).all()
    member_boards = db.query(Board).join(BoardMember).filter(BoardMember.user_id == current_user.id).all()
    
    all_boards = list(set(owned + member_boards))
    return all_boards

@app.get("/api/boards/{board_id}", response_model=BoardResponse)
def get_board(board_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Доска не найдена")
    return board

@app.delete("/api/boards/{board_id}")
def delete_board(board_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    board = db.query(Board).filter(Board.id == board_id, Board.owner_id == current_user.id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Доска не найдена или у вас нет прав")
    
    db.delete(board)
    db.commit()
    return {"message": "Доска удалена"}

# ===== TASK ENDPOINTS =====
@app.post("/api/tasks", response_model=TaskResponse)
def create_task(task: TaskCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    new_task = Task(
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        board_id=task.board_id,
        assignee_id=task.assignee_id,
        due_date=task.due_date
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task

@app.get("/api/boards/{board_id}/tasks", response_model=list[TaskResponse])
def get_board_tasks(board_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    tasks = db.query(Task).filter(Task.board_id == board_id).all()
    return tasks

@app.put("/api/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: int, task_update: TaskUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    
    if task_update.title is not None:
        task.title = task_update.title
    if task_update.description is not None:
        task.description = task_update.description
    if task_update.status is not None:
        task.status = task_update.status
    if task_update.priority is not None:
        task.priority = task_update.priority
    if task_update.assignee_id is not None:
        task.assignee_id = task_update.assignee_id
    if task_update.due_date is not None:
        task.due_date = task_update.due_date
    
    db.commit()
    db.refresh(task)
    return task

@app.delete("/api/tasks/{task_id}")
def delete_task(task_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Задача не найдена")
    
    db.delete(task)
    db.commit()
    return {"message": "Задача удалена"}

# ===== BOARD MEMBER ENDPOINTS =====
@app.get("/api/boards/{board_id}/members", response_model=list[BoardMemberResponse])
def get_board_members(board_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Доска не найдена")
    
    is_owner = board.owner_id == current_user.id
    is_member = db.query(BoardMember).filter(
        BoardMember.board_id == board_id,
        BoardMember.user_id == current_user.id
    ).first()
    
    if not is_owner and not is_member:
        raise HTTPException(status_code=403, detail="Нет доступа к доске")
    
    members = db.query(BoardMember).filter(BoardMember.board_id == board_id).all()
    
    # 🔥 Добавляем данные пользователя к каждому участнику
    result = []
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        result.append({
            "id": m.id,
            "board_id": m.board_id,
            "user_id": m.user_id,
            "role": m.role,
            "status": m.status if hasattr(m, 'status') else "participant",
            "user_name": user.name if user else None,
            "user_email": user.email if user else None,
        })
    
    return result

@app.post("/api/boards/{board_id}/members", response_model=BoardMemberResponse)
def add_board_member(board_id: int, member: BoardMemberCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Доска не найдена")
    
    if board.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Только владелец доски может добавлять участников")
    
    user = db.query(User).filter(User.id == member.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")
    
    existing = db.query(BoardMember).filter(
        BoardMember.board_id == board_id,
        BoardMember.user_id == member.user_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Пользователь уже является участником")
    
    new_member = BoardMember(
        board_id=board_id,
        user_id=member.user_id,
        role=member.role,
        status=member.status if hasattr(member, 'status') else "participant"  # 🔥
    )
    db.add(new_member)
    db.commit()
    db.refresh(new_member)
    
    return {
        "id": new_member.id,
        "board_id": new_member.board_id,
        "user_id": new_member.user_id,
        "role": new_member.role,
        "status": new_member.status if hasattr(new_member, 'status') else "participant",
        "user_name": user.name,
        "user_email": user.email,
    }

@app.put("/api/boards/{board_id}/members/{user_id}", response_model=BoardMemberResponse)
def update_board_member(board_id: int, user_id: int, member_update: BoardMemberUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Доска не найдена")
    
    if board.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Только владелец доски может менять роли")
    
    member = db.query(BoardMember).filter(
        BoardMember.board_id == board_id,
        BoardMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Участник не найден")
    
    if member.user_id == board.owner_id and member_update.status is not None:
        raise HTTPException(status_code=403, detail="Нельзя изменить статус владельца")
    
    if member_update.role is not None:
        member.role = member_update.role
    if member_update.status is not None:
        member.status = member_update.status
    
    db.commit()
    db.refresh(member)
    
    user = db.query(User).filter(User.id == member.user_id).first()
    return {
        "id": member.id,
        "board_id": member.board_id,
        "user_id": member.user_id,
        "role": member.role,
        "status": member.status if hasattr(member, 'status') else "participant",
        "user_name": user.name if user else None,
        "user_email": user.email if user else None,
    }

@app.delete("/api/boards/{board_id}/members/{user_id}")
def remove_board_member(board_id: int, user_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Удалить участника из доски"""
    board = db.query(Board).filter(Board.id == board_id).first()
    if not board:
        raise HTTPException(status_code=404, detail="Доска не найдена")
    
    if board.owner_id != current_user.id and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Нет прав для удаления участника")
    
    member = db.query(BoardMember).filter(
        BoardMember.board_id == board_id,
        BoardMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Участник не найден")
    
    if member.user_id == board.owner_id:
        raise HTTPException(status_code=403, detail="Нельзя удалить владельца доски")
    
    db.delete(member)
    db.commit()
    
    return {"message": "Участник удалён"}

@app.get("/api/users/search")
def search_users(email: str = None, name: str = None, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Поиск пользователей по email или имени"""
    query = db.query(User)
    
    if email:
        query = query.filter(User.email.contains(email))
    if name:
        query = query.filter(User.name.contains(name))
    
    users = query.limit(10).all()
    return [{"id": u.id, "name": u.name, "email": u.email} for u in users]








YANDEX_CLIENT_ID = "c48d5ae1cd584e3090a75909360980d6"
YANDEX_CLIENT_SECRET = "bafc593d80da4573baf7c05e47776269"
YANDEX_REDIRECT_URI = "http://localhost:3000/api/auth/yandex/callback"
YANDEX_AUTH_URL = "https://oauth.yandex.ru/authorize"
YANDEX_TOKEN_URL = "https://oauth.yandex.ru/token"
YANDEX_USER_INFO_URL = "https://login.yandex.ru/info"

@app.get("/api/auth/yandex")
def yandex_login():
    """Перенаправление на Яндекс OAuth"""
    auth_url = (
        f"{YANDEX_AUTH_URL}?"
        f"response_type=code&"
        f"client_id={YANDEX_CLIENT_ID}&"
        f"redirect_uri={YANDEX_REDIRECT_URI}&"
        f"scope=login:email"
    )
    return RedirectResponse(url=auth_url)

@app.get("/api/auth/yandex/callback")
async def yandex_callback(request: Request, db: Session = Depends(get_db)):
    """Callback от Яндекса"""
    code = request.query_params.get("code")
    
    if not code:
        raise HTTPException(status_code=400, detail="Нет кода авторизации")
    
    # Обмениваем код на токен
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            YANDEX_TOKEN_URL,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": YANDEX_CLIENT_ID,
                "client_secret": YANDEX_CLIENT_SECRET,
                "redirect_uri": YANDEX_REDIRECT_URI,
            }
        )
        
        if token_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Ошибка получения токена Яндекса")
        
        token_data = token_response.json()
        access_token = token_data.get("access_token")
        
        # Получаем данные пользователя
        user_response = await client.get(
            YANDEX_USER_INFO_URL,
            headers={"Authorization": f"OAuth {access_token}"}
        )
        
        if user_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Ошибка получения данных пользователя")
        
        yandex_user = user_response.json()
        email = yandex_user.get("default_email")

        # 🔥 Получаем имя от Яндекса
        first_name = yandex_user.get("first_name", "")
        last_name = yandex_user.get("last_name", "")
        display_name = yandex_user.get("display_name", "")

        # Формируем имя
        if first_name and last_name:
            name = f"{first_name} {last_name}"
        elif first_name:
            name = first_name
        elif display_name:
            name = display_name
        elif email:
            # Берём первые 5 символов email до @
            name = email.split("@")[0][:5]
        else:
            name = "Пользователь"

        print(f"👤 Имя: {name}, Email: {email}")
        
        if not email:
            raise HTTPException(status_code=400, detail="Яндекс не вернул email")
        
        # Проверяем есть ли пользователь
        db_user = db.query(User).filter(User.email == email).first()
        
        if not db_user:
            # Создаём нового пользователя
            db_user = User(
                name=name,
                email=email,
                hashed_password="",  # Для OAuth пароль не нужен
                role="student"
            )
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
        
        # Создаём JWT токен
        jwt_token = create_access_token(data={"sub": db_user.id})
        
        # Редирект на фронтенд с токеном
        return RedirectResponse(
            url=f"http://localhost:8080/pages/login.html?token={jwt_token}&oauth=yandex"
        )