from pydantic import BaseModel, EmailStr
from typing import Optional


class UserCreate(BaseModel):
    username: str
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    
    class Config:
        from_attributes = True

class PortfolioCreate(BaseModel):
    stock_symbol: str
    quantity: float
    average_price: float

class TransactionCreate(BaseModel):
    stock_symbol: str
    transaction_type: str
    quantity: float
    price: float
