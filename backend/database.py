from sqlalchemy import create_engine #  создаёт "движок" для подключения к базе данных
from sqlalchemy.ext.declarative import declarative_base # создаёт базовый класс для моделей (таблиц)
from sqlalchemy.orm import sessionmaker # создаёт фабрику сессий (соединений с БД)

SQLALCHEMY_DATABASE_URL = "sqlite:///./imctech.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()