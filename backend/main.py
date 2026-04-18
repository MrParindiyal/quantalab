from contextlib import asynccontextmanager
from database import engine
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import models
import uvicorn
import yfinance as yf
# import pandas as pd

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
