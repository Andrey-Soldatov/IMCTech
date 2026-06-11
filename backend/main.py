from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, Base, get_db
from models import User
from schemas import UserCreate, UserResponse
from auth import get_password_hash

# Создаём таблицы при запуске 
Base.metadata.create_all(bind=engine)

app = FastAPI(title="IMCTech API")

# CORS для фронта
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "IMCTech API работает!"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

    @app.post("/api/auth/register", response_model=UserResponse)

    
def register(user: UserCreate, db: Session = Depends(get_db)):
    # Проверяем что email не занят
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email уже занят")
    
    # Создаём пользователя
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