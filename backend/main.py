from contextlib import asynccontextmanager
from database import engine, get_db
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
import jwt
import models, numpy as np, schemas, os
from sqlalchemy.orm import Session
from utils import hash_password, check_password
import uvicorn
import yfinance as yf
import pandas as pd
import ta
from sklearn.linear_model import LinearRegression

SECRET_KEY = str(os.getenv("SECRET_KEY", "mysecret"))
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
    expire = datetime.now() + timedelta(minutes=60) # Increased expiration for convenience
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


def get_period_days(period_str):
    mapping = {
        "1mo": 22,
        "3mo": 66,
        "6mo": 130,
        "1y": 252,
        "2y": 504,
        "5y": 1260
    }
    return mapping.get(period_str, 252)

@app.get("/api/stock/{symbol}")
def get_stock_data(symbol: str, period: str = "1mo", current_user: models.User = Depends(get_current_user)):
    try:
        # Fetch 5y data to have enough history for MA200 and indicators
        stock = yf.Ticker(symbol)
        history = stock.history(period="5y")
        
        if history.empty:
            raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")
            
        history = history.replace([np.inf, -np.inf], np.nan).ffill()
        
        # Calculate Technical Indicators
        close = history["Close"]
        
        # Moving Averages
        history["MA50"] = ta.trend.sma_indicator(close, window=50)
        history["MA200"] = ta.trend.sma_indicator(close, window=200)
        
        # RSI
        history["RSI"] = ta.momentum.rsi(close, window=14)
        
        # MACD
        macd = ta.trend.MACD(close)
        history["MACD"] = macd.macd()
        history["MACD_signal"] = macd.macd_signal()
        history["MACD_hist"] = macd.macd_diff()
        
        # Bollinger Bands
        bb = ta.volatility.BollingerBands(close, window=20, window_dev=2)
        history["BB_high"] = bb.bollinger_hband()
        history["BB_mid"] = bb.bollinger_mavg()
        history["BB_low"] = bb.bollinger_lband()
        
        # Risk Metrics Calculations (Daily Returns)
        daily_returns = close.pct_change().dropna()
        volatility = daily_returns.std() * np.sqrt(252) * 100 # Annualized volatility
        
        # Max Drawdown
        roll_max = close.cummax()
        drawdown = close / roll_max - 1.0
        max_drawdown = drawdown.min() * 100
        
        # Sharpe Ratio (assuming risk free rate = 0.02)
        risk_free_rate = 0.02
        sharpe_ratio = (daily_returns.mean() * 252 - risk_free_rate) / (daily_returns.std() * np.sqrt(252))

        # Slice data to requested period
        days_to_keep = get_period_days(period)
        sliced_history = history.tail(days_to_keep).copy()
        
        # Replace NaN with None for JSON serialization
        sliced_history = sliced_history.replace({np.nan: None})
        
        latest_data = sliced_history.iloc[-1]
        prev_data = sliced_history.iloc[-2] if len(sliced_history) > 1 else latest_data
        
        current_price = float(latest_data["Close"])
        prev_price = float(prev_data["Close"])
        change_pct = (((current_price - prev_price) / prev_price) * 100) if prev_price != 0 else 0
        volume = int(latest_data["Volume"])
        
        timeseries = []
        for date, row in sliced_history.iterrows():
            timeseries.append({
                "date": date.strftime("%Y-%m-%d"),
                "price": round(float(row["Close"]), 2) if row["Close"] else None,
                "open": round(float(row["Open"]), 2) if row["Open"] else None,
                "high": round(float(row["High"]), 2) if row["High"] else None,
                "low": round(float(row["Low"]), 2) if row["Low"] else None,
                "volume": int(row["Volume"]) if row["Volume"] else None,
                "ma50": round(float(row["MA50"]), 2) if row["MA50"] is not None else None,
                "ma200": round(float(row["MA200"]), 2) if row["MA200"] is not None else None,
                "rsi": round(float(row["RSI"]), 2) if row["RSI"] is not None else None,
                "macd": round(float(row["MACD"]), 2) if row["MACD"] is not None else None,
                "macd_signal": round(float(row["MACD_signal"]), 2) if row["MACD_signal"] is not None else None,
                "macd_hist": round(float(row["MACD_hist"]), 2) if row["MACD_hist"] is not None else None,
                "bb_high": round(float(row["BB_high"]), 2) if row["BB_high"] is not None else None,
                "bb_mid": round(float(row["BB_mid"]), 2) if row["BB_mid"] is not None else None,
                "bb_low": round(float(row["BB_low"]), 2) if row["BB_low"] is not None else None,
            })
            
        return {
            "symbol": symbol.upper(),
            "metrics": {
                "currentPrice": round(current_price, 2),
                "changePct": round(change_pct, 2),
                "volume": volume,
                "volatility": round(volatility, 2),
                "maxDrawdown": round(max_drawdown, 2),
                "sharpeRatio": round(sharpe_ratio, 2)
            },
            "timeseries": timeseries
        }
        
    except Exception as e:
        print(f"Error fetching stock: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/predict/{symbol}")
def predict_stock(symbol: str, days: int = 30, current_user: models.User = Depends(get_current_user)):
    try:
        stock = yf.Ticker(symbol)
        history = stock.history(period="2y")
        if history.empty:
            raise HTTPException(status_code=404, detail=f"No data for {symbol}")
            
        history = history.reset_index()
        history['DayIndex'] = np.arange(len(history))
        
        X = history[['DayIndex']]
        y = history['Close']
        
        model = LinearRegression()
        model.fit(X, y)
        
        future_indices = np.arange(len(history), len(history) + days).reshape(-1, 1)
        predictions = model.predict(future_indices)
        
        last_date = history['Date'].iloc[-1]
        
        forecast = []
        for i in range(days):
            pred_date = last_date + timedelta(days=i+1)
            # skip weekends naively
            while pred_date.weekday() > 4:
                pred_date += timedelta(days=1)
            
            forecast.append({
                "date": pred_date.strftime("%Y-%m-%d"),
                "predicted_price": round(float(predictions[i]), 2)
            })
            last_date = pred_date
            
        return {
            "symbol": symbol.upper(),
            "forecast": forecast
        }
    except Exception as e:
        print(f"Error predicting: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/compare")
def compare_stocks(symbols: str, period: str = "1mo", current_user: models.User = Depends(get_current_user)):
    try:
        symbol_list = symbols.split(",")
        data = yf.download(symbol_list, period=period, group_by="ticker")
        
        result = []
        # If single symbol, yf.download structure is different
        if len(symbol_list) == 1:
            sym = symbol_list[0]
            close_prices = data['Close']
            first_valid = close_prices.dropna().iloc[0]
            pct_returns = ((close_prices - first_valid) / first_valid) * 100
            for date, ret in pct_returns.items():
                result.append({"date": date.strftime("%Y-%m-%d"), sym: round(ret, 2)})
        else:
            dates = data.index
            for i, date in enumerate(dates):
                row = {"date": date.strftime("%Y-%m-%d")}
                for sym in symbol_list:
                    close_prices = data[sym]['Close']
                    first_valid = close_prices.dropna().iloc[0]
                    val = close_prices.iloc[i]
                    if pd.notna(val):
                        pct_ret = ((val - first_valid) / first_valid) * 100
                        row[sym] = round(pct_ret, 2)
                result.append(row)
                
        return {"comparison": result}
    except Exception as e:
        print(f"Error comparing: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/portfolio")
def get_portfolio(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    portfolio = db.query(models.Portfolio).filter(models.Portfolio.user_id == current_user.id).all()
    return portfolio

@app.post("/api/portfolio")
def add_portfolio_item(item: schemas.PortfolioCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(models.Portfolio).filter(
        models.Portfolio.user_id == current_user.id, 
        models.Portfolio.stock_symbol == item.stock_symbol
    ).first()
    
    if existing:
        # Update avg price and quantity
        total_value = float(existing.quantity) * float(existing.average_price) + float(item.quantity) * item.average_price
        new_quantity = float(existing.quantity) + item.quantity
        existing.average_price = total_value / new_quantity if new_quantity > 0 else 0
        existing.quantity = new_quantity
    else:
        new_item = models.Portfolio(
            user_id=current_user.id,
            stock_symbol=item.stock_symbol,
            quantity=item.quantity,
            average_price=item.average_price
        )
        db.add(new_item)
    
    db.commit()
    return {"message": "Portfolio updated"}

@app.get("/api/balance")
def get_balance(current_user: models.User = Depends(get_current_user)):
    return {"balance": float(current_user.balance)}

@app.post("/api/trade")
def execute_trade(item: schemas.TransactionCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    symbol = item.stock_symbol.upper()
    quantity = item.quantity
    price = item.price
    type_ = item.transaction_type.lower()
    
    if type_ == "buy":
        cost = quantity * price
        if float(current_user.balance) < cost:
            raise HTTPException(status_code=400, detail="Insufficient balance")
        current_user.balance = float(current_user.balance) - cost
        portfolio = db.query(models.Portfolio).filter_by(user_id=current_user.id, stock_symbol=symbol).first()
        if portfolio:
            new_qty = float(portfolio.quantity) + quantity
            portfolio.average_price = (float(portfolio.quantity) * float(portfolio.average_price) + quantity * price) / new_qty
            portfolio.quantity = new_qty
        else:
            db.add(models.Portfolio(user_id=current_user.id, stock_symbol=symbol, quantity=quantity, average_price=price))
        db.add(models.Transaction(user_id=current_user.id, stock_symbol=symbol, transaction_type="buy", quantity=quantity, price=price))
        db.commit()
        return {"message": "Buy successful", "balance": float(current_user.balance)}
    
    elif type_ == "sell":
        portfolio = db.query(models.Portfolio).filter_by(user_id=current_user.id, stock_symbol=symbol).first()
        if not portfolio or float(portfolio.quantity) < quantity:
            raise HTTPException(status_code=400, detail="Insufficient shares")
        proceeds = quantity * price
        current_user.balance = float(current_user.balance) + proceeds
        portfolio.quantity = float(portfolio.quantity) - quantity
        if float(portfolio.quantity) <= 0:
            db.delete(portfolio)
        db.add(models.Transaction(user_id=current_user.id, stock_symbol=symbol, transaction_type="sell", quantity=quantity, price=price))
        db.commit()
        return {"message": "Sell successful", "balance": float(current_user.balance)}
    
    raise HTTPException(status_code=400, detail="Invalid transaction type")

@app.get("/api/transactions")
def get_transactions(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    txs = db.query(models.Transaction).filter_by(user_id=current_user.id).order_by(models.Transaction.timestamp.desc()).all()
    return [{
        "id": row.id,
        "stock_symbol": row.stock_symbol,
        "transaction_type": row.transaction_type,
        "quantity": float(row.quantity),
        "price": float(row.price),
        "timestamp": row.timestamp.strftime("%Y-%m-%d %H:%M") if row.timestamp else ""
    } for row in txs]

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
