from database import Base
from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    func,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    balance = Column(Numeric(10, 3), default=10_000)
    created_at = Column(DateTime, server_default=func.current_timestamp())

    results = relationship("StrategyResult", back_populates="owner")
    portfolios = relationship("Portfolio", back_populates="owner")
    transactions = relationship("Transaction", back_populates="owner")


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    stock_symbol = Column(String)
    transaction_type = Column(String)
    quantity = Column(Numeric(12, 4), default=0)
    price = Column(Numeric(10, 3))
    timestamp = Column(DateTime, server_default=func.current_timestamp())

    owner = relationship("User", back_populates="transactions")


class Portfolio(Base):
    __tablename__ = "portfolios"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    stock_symbol = Column(String)
    quantity = Column(Numeric(12, 4), default=0)
    average_price = Column(Numeric(10, 3))

    __table_args__ = (
        UniqueConstraint("user_id", "stock_symbol", name="_user_stock_unique"),
    )

    owner = relationship("User", back_populates="portfolios")


class StrategyResult(Base):
    __tablename__ = "strategy_results"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    strategy_name = Column(String)
    profit_percentage = Column(Float(10, 3))
    sharpe_ratio = Column(Float(10, 3))
    backtest_period = Column(String)

    owner = relationship("User", back_populates="results")
