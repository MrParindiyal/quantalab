from contextlib import asynccontextmanager
from database import engine, get_db
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
import jwt
import models, numpy, schemas, os
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
def get_stock_data(symbol: str, period: str = "1mo"):
    try:
        # Fetch stock data using yfinance
        stock = yf.Ticker(symbol)
        history = stock.history(period=period)
        
        if history.empty:
            raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")
            
        # Extract basic metrics
        latest_data = history.iloc[-1]
        prev_data = history.iloc[-2] if len(history) > 1 else latest_data
        
        current_price = float(latest_data["Close"])
        prev_price = float(prev_data["Close"])
        change_pct = ((current_price - prev_price) / prev_price) * 100
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
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
