from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field
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
    quantity: Decimal
    average_price: Decimal


class PortfolioResponse(BaseModel):
    id: int
    stock_symbol: str
    quantity: Decimal
    average_price: Decimal

    class Config:
        from_attributes = True


class TransactionCreate(BaseModel):
    stock_symbol: str = Field(..., min_length=1, max_length=20)
    transaction_type: str = Field(..., pattern="^(buy|sell)$")
    quantity: Decimal = Field(..., gt=0, decimal_places=1)
    price: Decimal | None = None


class TransactionResponse(BaseModel):
    id: int
    stock_symbol: str
    transaction_type: str
    quantity: Decimal
    price: Decimal
    timestamp: datetime

    class Config:
        from_attributes = True
