from datetime import datetime, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
from models import User

SECRET_KEY = "твой-секретный-ключ-замени-на-свой-очень-длинный"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

# 🔥 КЛЮЧЕВОЕ ИЗМЕНЕНИЕ: HTTPBearer вместо OAuth2PasswordBearer
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def get_password_hash(password):
    return pwd_context.hash(password)


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    # 🔥 Преобразуем sub в строку если это число
    if "sub" in to_encode and not isinstance(to_encode["sub"], str):
        to_encode["sub"] = str(to_encode["sub"])
    
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    # 🔥 credentials.credentials — это токен БЕЗ "Bearer "
    token = credentials.credentials
    
    print(f"\n{'='*50}")
    print(f"🔑 ПОЛУЧЕН ТОКЕН: {token[:30]}...")
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print(f"✅ Токен декодирован: {payload}")
        
        user_id = payload.get("sub")
        print(f" user_id из токена: {user_id} (тип: {type(user_id)})")
        
        if user_id is None:
            print("❌ user_id = None")
            raise HTTPException(status_code=401, detail="Невалидный токен")
        
        user = db.query(User).filter(User.id == int(user_id)).first()
        print(f"🔍 Поиск пользователя с id={int(user_id)}: {'найден' if user else 'не найден'}")
        
        if user is None:
            print(f"❌ Пользователь {user_id} не найден в БД")
            raise HTTPException(status_code=404, detail="Пользователь не найден")
        
        print(f"✅ Авторизован: {user.email}")
        print(f"{'='*50}\n")
        return user
        
    except JWTError as e:
        print(f"❌ JWTError: {e}")
        print(f"{'='*50}\n")
        raise HTTPException(status_code=401, detail="Невалидный токен")