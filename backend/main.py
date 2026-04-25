from contextlib import asynccontextmanager
from database import engine, get_db
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
import jwt
import models, numpy, os, schemas
from sqlalchemy.orm import Session
from utils import hash_password, check_password
import uvicorn
import yfinance as yf


SECRET_KEY = str(os.getenv("SECRET_KEY"))
JWT_SIGNING_ALGO = "HS256" #HMAC SHA 256 symmetric
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup actions
    print("FastAPI Backend Started")
    models.Base.metadata.create_all(bind=engine)

    yield
    
    # Shutdown actions
    print("FastAPI Backend Shutdown")

app = FastAPI(title="QuantaLab API", lifespan=lifespan)

# Allow React frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def create_access_token(data):
    to_encode = data.copy()
    expire = datetime.now() + timedelta(minutes=10)
    to_encode.update({"exp" : expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=JWT_SIGNING_ALGO)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=401,
        detail = "Could not validate credentials",
        headers={"WWW-authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_SIGNING_ALGO])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    
    except jwt.PyJWTError:
        raise credentials_exception
    
    user = db.query(models.User).filter(models.User.name == username).first()
    if user is None:
        raise credentials_exception

    return user


@app.post("/register")
def register_user(user: schemas.UserCreate, db : Session = Depends(get_db)):

    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    
    # if user's already registered, raise error
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = models.User(
        name = user.username,
        email = user.email,
        hashed_password = hash_password(user.password)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created successfully", "user_id": new_user.id}


@app.post("/login")
def login(user_credentials: schemas.UserCreate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.name == user_credentials.username).first()
    
    if not user or not check_password(user_credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    token = create_access_token(data={"sub" : user.name})

    return {
        "access_token": token,
        "token_type": "bearer",
        "username": user.name
    }


@app.get("/api/stock/{symbol}")
def get_stock_data(symbol: str, period: str = "1mo", current_user: models.User = Depends(get_current_user)):
    try:
        # Fetch stock data using yfinance
        stock = yf.Ticker(symbol)
        history = stock.history(period=period)
        
        if history.empty:
            raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")
            
        history = history.replace([numpy.inf, -numpy.inf], numpy.nan).ffill()
        # Extract basic metrics
        latest_data = history.iloc[-1]
        prev_data = history.iloc[-2] if len(history) > 1 else latest_data
        
        current_price = float(latest_data["Close"])
        prev_price = float(prev_data["Close"])
        change_pct = (((current_price - prev_price) / prev_price) * 100) if prev_price != 0 else 0
        volume = int(latest_data["Volume"])
        
        # Prepare timeseries array for Recharts
        # Recharts expects an array of objects like [{date: 'MM-DD', price: 150}, ...]
        timeseries = []
        for date, row in history.iterrows():
            timeseries.append({
                "date": date.strftime("%Y-%m-%d"),
                "price": round(float(row["Close"]), 2),
                "volume": int(row["Volume"])
            })
            
        return {
            "symbol": symbol.upper(),
            "metrics": {
                "currentPrice": round(current_price, 2),
                "changePct": round(change_pct, 2),
                "volume": volume,
            },
            "timeseries": timeseries
        }
        
    except Exception as e:
        print(f"Error fetching stock: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/execute")
def execute_order(
    transaction: schemas.TransactionCreate,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user),
    ):
    try:
        stock = yf.Ticker(transaction.stock_symbol.upper())
        current_price = float(stock.fast_info['last_price'])

        if not current_price or numpy.isnan(current_price):
            raise HTTPException(status_code=400, detail="Invalid stock symbol or price unavailable")

        total_cost = current_price * transaction.quantity

        holding = db.query(models.Portfolio).filter(
            models.Portfolio.user_id == current_user.id, 
            models.Portfolio.stock_symbol == transaction.stock_symbol.upper()
            ).first()

        if transaction.transaction_type == "buy" and current_user.balance < total_cost:
            raise HTTPException(status_code=400, detail="Insufficient funds")
        elif transaction.transaction_type == "sell" and (holding is None or  holding.quantity < transaction.quantity):
            raise HTTPException(status_code=400, detail="Insufficient shares")

        new_trxn = models.Transaction(
            user_id = current_user.id,
            stock_symbol = transaction.stock_symbol.upper(),
            transaction_type = transaction.transaction_type,
            quantity = transaction.quantity,
            price = round(current_price, 3)
        )

        db.add(new_trxn)

        current_user.balance += total_cost if transaction.transaction_type == "sell" else -total_cost
        
        if transaction.transaction_type == "buy":
            if holding is None:
                new_portfolio = models.Portfolio(
                    user_id = current_user.id,
                    stock_symbol = transaction.stock_symbol,
                    quantity = transaction.quantity,
                    average_price = round(current_price, 3)
                )
                db.add(new_portfolio)

            else:
                holding.average_price = ((holding.average_price * holding.quantity) + total_cost) / (holding.quantity + transaction.quantity)
                holding.quantity += transaction.quantity

        else:
            holding.quantity -= transaction.quantity
            if holding.quantity <= 0:
                db.delete(holding)

        db.commit()
        db.refresh(new_trxn)

        return {
            "status": "success",
            "executed_price": new_trxn.price,
            "total_cost": total_cost,
            "new_balance" : current_user.balance
        }
    
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Transaction failed: {str(e)}")


@app.get('/api/transactions', response_model=list[schemas.TransactionResponse])
def get_user_transactions(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id)\
        .order_by(models.Transaction.timestamp.desc()).all()


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
