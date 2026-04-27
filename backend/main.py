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
from sklearn.ensemble import RandomForestRegressor

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
        # Fetch data - use 2y for better training
        stock = yf.Ticker(symbol)
        history = stock.history(period="2y")
        if history.empty:
            raise HTTPException(status_code=404, detail=f"No data for {symbol}")
            
        history = history.reset_index()
        
        # 1. Feature Engineering
        # Use DayIndex to capture long-term trend
        history['DayIndex'] = np.arange(len(history))
        
        # Add Technical Indicators as features
        history['RSI'] = ta.momentum.rsi(history['Close'], window=14)
        history['MA20'] = ta.trend.sma_indicator(history['Close'], window=20)
        history['Vol_Change'] = history['Volume'].pct_change()
        
        # Drop rows with NaN from indicators
        train_df = history.dropna().copy()
        
        if len(train_df) < 50: # Ensure we have enough data
            train_df = history.copy()
            train_df = train_df.fillna(0)

        # Features: DayIndex, plus we'll use a slightly more advanced model
        X = train_df[['DayIndex']]
        y = train_df['Close']
        
        # Using Random Forest for non-linear trend detection
        # We limit complexity to avoid over-fitting in a simulation
        model = RandomForestRegressor(n_estimators=100, random_state=42)
        model.fit(X, y)
        
        # Calculate historical volatility for confidence intervals
        recent_volatility = y.pct_change().tail(30).std()
        current_price = float(y.iloc[-1])
        
        # 2. Generate Predictions
        last_index = int(history['DayIndex'].iloc[-1])
        future_indices = np.arange(last_index + 1, last_index + 1 + days).reshape(-1, 1)
        predictions = model.predict(future_indices)
        
        last_date = history['Date'].iloc[-1]
        forecast = []
        
        for i in range(days):
            pred_date = last_date + timedelta(days=i+1)
            # Skip weekends
            while pred_date.weekday() > 4:
                pred_date += timedelta(days=1)
            
            # Simple confidence calculation based on time-drift and volatility
            # Uncertainty grows as we go further into the future
            uncertainty = current_price * recent_volatility * np.sqrt(i + 1)
            
            forecast.append({
                "date": pred_date.strftime("%Y-%m-%d"),
                "predicted_price": round(float(predictions[i]), 2),
                "high": round(float(predictions[i] + uncertainty), 2),
                "low": round(float(predictions[i] - uncertainty), 2)
            })
            last_date = pred_date
            
        # 3. Summary Metrics
        expected_return = ((predictions[-1] - current_price) / current_price) * 100
        
        # Tomorrow is always the first entry in the forecast list
        tomorrow_entry = forecast[0] if forecast else None
        tomorrow_change = None
        tomorrow_change_pct = None
        if tomorrow_entry:
            tomorrow_change = round(tomorrow_entry["predicted_price"] - current_price, 2)
            tomorrow_change_pct = round((tomorrow_change / current_price) * 100, 2)
        
        return {
            "symbol": symbol.upper(),
            "forecast": forecast,
            "metrics": {
                "current_price": round(current_price, 2),
                "expected_return_30d": round(float(expected_return), 2),
                "trend": "Bullish" if expected_return > 2 else "Bearish" if expected_return < -2 else "Neutral",
                "confidence_score": round(max(0, 100 - (recent_volatility * 1000)), 1),
                "tomorrow": {
                    "date": tomorrow_entry["date"] if tomorrow_entry else None,
                    "predicted_price": tomorrow_entry["predicted_price"] if tomorrow_entry else None,
                    "high": tomorrow_entry["high"] if tomorrow_entry else None,
                    "low": tomorrow_entry["low"] if tomorrow_entry else None,
                    "change": tomorrow_change,
                    "change_pct": tomorrow_change_pct
                }
            }
        }
    except Exception as e:
        print(f"Error predicting: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/backtest")
def run_backtest(
    symbol: str,
    strategy: str = "sma_crossover",  # sma_crossover | rsi | macd
    period: str = "1y",
    capital: float = 100000.0,
    current_user: models.User = Depends(get_current_user)
):
    """
    Runs a strategy backtest on historical data.
    Strategies: sma_crossover, rsi, macd
    Returns: trades, equity_curve, performance metrics vs buy-and-hold
    """
    try:
        stock = yf.Ticker(symbol)
        history = stock.history(period=period)
        if history.empty:
            raise HTTPException(status_code=404, detail=f"No data for {symbol}")

        history = history.reset_index()
        close = history["Close"]

        # ── Compute indicators ──────────────────────────────────────────────
        history["MA20"]        = ta.trend.sma_indicator(close, window=20)
        history["MA50"]        = ta.trend.sma_indicator(close, window=50)
        history["RSI"]         = ta.momentum.rsi(close, window=14)
        macd_obj               = ta.trend.MACD(close)
        history["MACD"]        = macd_obj.macd()
        history["MACD_signal"] = macd_obj.macd_signal()

        history = history.dropna().reset_index(drop=True)

        # ── Signal generation ────────────────────────────────────────────────
        def generate_signals(df):
            signals = []
            strat = strategy.lower()
            for i in range(1, len(df)):
                row   = df.iloc[i]
                prev  = df.iloc[i - 1]

                if strat == "sma_crossover":
                    if prev["MA20"] <= prev["MA50"] and row["MA20"] > row["MA50"]:
                        signals.append((i, "BUY"))
                    elif prev["MA20"] >= prev["MA50"] and row["MA20"] < row["MA50"]:
                        signals.append((i, "SELL"))

                elif strat == "rsi":
                    if prev["RSI"] >= 30 and row["RSI"] < 30:
                        signals.append((i, "BUY"))
                    elif prev["RSI"] <= 70 and row["RSI"] > 70:
                        signals.append((i, "SELL"))

                elif strat == "macd":
                    if prev["MACD"] <= prev["MACD_signal"] and row["MACD"] > row["MACD_signal"]:
                        signals.append((i, "BUY"))
                    elif prev["MACD"] >= prev["MACD_signal"] and row["MACD"] < row["MACD_signal"]:
                        signals.append((i, "SELL"))

            return signals

        signals = generate_signals(history)

        # ── Simulate trades ──────────────────────────────────────────────────
        cash     = capital
        shares   = 0
        trades   = []
        buy_price = None
        buy_date  = None

        for idx, action in signals:
            price = float(history.iloc[idx]["Close"])
            date  = str(history.iloc[idx]["Date"])[:10]

            if action == "BUY" and shares == 0 and cash > 0:
                qty      = int(cash // price)
                if qty == 0:
                    continue
                cost     = qty * price
                cash    -= cost
                shares   = qty
                buy_price = price
                buy_date  = date
                trades.append({
                    "date": date, "action": "BUY",
                    "price": round(price, 2), "qty": qty,
                    "value": round(cost, 2), "pnl": None
                })

            elif action == "SELL" and shares > 0:
                proceeds = shares * price
                pnl      = proceeds - (shares * buy_price)
                cash    += proceeds
                trades.append({
                    "date": date, "action": "SELL",
                    "price": round(price, 2), "qty": shares,
                    "value": round(proceeds, 2),
                    "pnl": round(pnl, 2)
                })
                shares    = 0
                buy_price = None
                buy_date  = None

        # Close open position at last price
        if shares > 0:
            last_price = float(history.iloc[-1]["Close"])
            last_date  = str(history.iloc[-1]["Date"])[:10]
            proceeds   = shares * last_price
            pnl        = proceeds - (shares * buy_price)
            cash      += proceeds
            trades.append({
                "date": last_date, "action": "CLOSE",
                "price": round(last_price, 2), "qty": shares,
                "value": round(proceeds, 2), "pnl": round(pnl, 2)
            })
            shares = 0

        final_capital = round(cash, 2)

        # ── Equity Curve ─────────────────────────────────────────────────────
        # Replay portfolio value day by day
        equity_curve   = []
        port_cash      = capital
        port_shares    = 0
        trade_pointer  = 0
        sorted_trades  = [t for t in trades]
        trade_dates    = {t["date"]: t for t in sorted_trades}

        running_cash   = capital
        running_shares = 0

        for _, row in history.iterrows():
            date  = str(row["Date"])[:10]
            price = float(row["Close"])

            if date in trade_dates:
                t = trade_dates[date]
                if t["action"] == "BUY":
                    running_shares  = t["qty"]
                    running_cash   -= t["value"]
                elif t["action"] in ("SELL", "CLOSE"):
                    running_cash   += t["value"]
                    running_shares  = 0

            equity_curve.append({
                "date":  date,
                "value": round(running_cash + running_shares * price, 2)
            })

        # ── Buy-and-Hold Baseline ────────────────────────────────────────────
        first_price    = float(history.iloc[0]["Close"])
        last_price     = float(history.iloc[-1]["Close"])
        bh_shares      = int(capital // first_price)
        bh_final       = bh_shares * last_price + (capital - bh_shares * first_price)
        bh_return      = ((bh_final - capital) / capital) * 100

        # ── Performance Metrics ──────────────────────────────────────────────
        total_return   = ((final_capital - capital) / capital) * 100
        alpha          = total_return - bh_return

        winning_trades = [t for t in trades if t["pnl"] is not None and t["pnl"] > 0]
        closed_trades  = [t for t in trades if t["pnl"] is not None]
        win_rate       = (len(winning_trades) / len(closed_trades) * 100) if closed_trades else 0

        # Sharpe from equity curve daily returns
        equity_vals    = [e["value"] for e in equity_curve]
        daily_rets     = [(equity_vals[i] - equity_vals[i-1]) / equity_vals[i-1]
                          for i in range(1, len(equity_vals))]
        if len(daily_rets) > 1:
            rets_arr   = np.array(daily_rets)
            sharpe     = round(float((rets_arr.mean() * 252) / (rets_arr.std() * np.sqrt(252))) if rets_arr.std() > 0 else 0, 2)
        else:
            sharpe = 0

        # Max drawdown from equity curve
        peak = equity_vals[0]
        max_dd = 0.0
        for v in equity_vals:
            if v > peak:
                peak = v
            dd = (v - peak) / peak * 100
            if dd < max_dd:
                max_dd = dd

        strategy_labels = {
            "sma_crossover": "SMA Crossover (MA20/50)",
            "rsi": "RSI Mean Reversion",
            "macd": "MACD Signal"
        }

        return {
            "symbol":   symbol.upper(),
            "strategy": strategy_labels.get(strategy, strategy),
            "period":   period,
            "trades":   trades,
            "equity_curve": equity_curve,
            "metrics": {
                "initial_capital":   round(capital, 2),
                "final_capital":     final_capital,
                "total_return":      round(total_return, 2),
                "buy_hold_return":   round(bh_return, 2),
                "alpha":             round(alpha, 2),
                "total_trades":      len(trades),
                "win_rate":          round(win_rate, 2),
                "sharpe_ratio":      sharpe,
                "max_drawdown":      round(max_dd, 2)
            }
        }

    except Exception as e:
        print(f"Backtest error: {e}")
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

@app.get("/api/portfolio/summary")
def get_portfolio_summary(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Returns portfolio holdings enriched with live market prices and P&L calculations.
    Also returns aggregate summary stats: total invested, total current value, unrealized P&L.
    """
    holdings = db.query(models.Portfolio).filter(models.Portfolio.user_id == current_user.id).all()
    
    if not holdings:
        return {
            "positions": [],
            "summary": {
                "total_invested": 0.0,
                "total_value": 0.0,
                "total_pnl": 0.0,
                "total_pnl_pct": 0.0,
                "cash_balance": float(current_user.balance)
            }
        }
    
    # Batch-fetch all symbols at once for efficiency
    symbols = [h.stock_symbol for h in holdings]
    
    # yf.download returns a DataFrame; for single symbols it's different
    try:
        if len(symbols) == 1:
            ticker = yf.Ticker(symbols[0])
            hist = ticker.history(period="2d")
            live_prices = {symbols[0]: float(hist["Close"].iloc[-1]) if not hist.empty else None}
        else:
            # Download closing prices for all symbols in one request
            raw = yf.download(symbols, period="2d", auto_adjust=True, progress=False)
            close = raw["Close"] if "Close" in raw else raw
            live_prices = {}
            for sym in symbols:
                try:
                    col = close[sym] if sym in close.columns else close
                    live_prices[sym] = float(col.dropna().iloc[-1])
                except Exception:
                    live_prices[sym] = None
    except Exception as e:
        print(f"Error fetching live prices: {e}")
        live_prices = {sym: None for sym in symbols}
    
    positions = []
    total_invested = 0.0
    total_value = 0.0
    
    for h in holdings:
        qty = float(h.quantity)
        avg_price = float(h.average_price)
        current_price = live_prices.get(h.stock_symbol)
        
        invested = qty * avg_price
        market_value = qty * current_price if current_price is not None else None
        pnl = (market_value - invested) if market_value is not None else None
        pnl_pct = ((pnl / invested) * 100) if (pnl is not None and invested > 0) else None
        
        total_invested += invested
        if market_value is not None:
            total_value += market_value
        
        positions.append({
            "id": h.id,
            "stock_symbol": h.stock_symbol,
            "quantity": qty,
            "average_price": round(avg_price, 2),
            "current_price": round(current_price, 2) if current_price is not None else None,
            "market_value": round(market_value, 2) if market_value is not None else None,
            "invested": round(invested, 2),
            "pnl": round(pnl, 2) if pnl is not None else None,
            "pnl_pct": round(pnl_pct, 2) if pnl_pct is not None else None
        })
    
    total_pnl = total_value - total_invested
    total_pnl_pct = ((total_pnl / total_invested) * 100) if total_invested > 0 else 0.0
    
    return {
        "positions": positions,
        "summary": {
            "total_invested": round(total_invested, 2),
            "total_value": round(total_value, 2),
            "total_pnl": round(total_pnl, 2),
            "total_pnl_pct": round(total_pnl_pct, 2),
            "cash_balance": round(float(current_user.balance), 2)
        }
    }

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
