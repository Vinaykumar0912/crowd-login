from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models import User
from app.schemas import UserLogin, UserResponse
from app.auth_utils import hash_password, verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/auth", tags=["Authentication & Operators"])
security = HTTPBearer(auto_error=False)

def init_default_users(db: Session):
    users_to_seed = [
        ("surveillance.ops@smartcity.gov", "admin123", "Officer J. Doe", "Command Officer"),
        ("admin@crowdguard.ai", "admin", "System Administrator", "Super Admin")
    ]
    for email, pwd, name, role in users_to_seed:
        user = db.query(User).filter(User.email == email).first()
        if not user:
            db_user = User(
                email=email,
                hashed_password=hash_password(pwd),
                name=name,
                role=role,
                is_active=True
            )
            db.add(db_user)
            db.commit()
        elif not user.hashed_password.startswith("pbkdf2_"):
            user.hashed_password = hash_password(pwd)
            db.commit()

def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Dependency for securing routes with JWT Bearer tokens."""
    init_default_users(db)
    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required"
        )
    payload = decode_access_token(auth.credentials)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )
    email = payload.get("sub")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload"
        )
    user = db.query(User).filter(User.email == email).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )
    return user

@router.post("/login", response_model=UserResponse)
def login(data: UserLogin, db: Session = Depends(get_db)):
    init_default_users(db)
    user = db.query(User).filter(User.email == data.email).first()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid operator credentials"
        )

    # If password was legacy plain text, upgrade to hash now
    if not user.hashed_password.startswith("pbkdf2_"):
        user.hashed_password = hash_password(data.password)
        db.commit()

    token = create_access_token(data={"sub": user.email, "role": user.role, "name": user.name})

    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "token": token
    }

@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "name": current_user.name,
        "role": current_user.role
    }
