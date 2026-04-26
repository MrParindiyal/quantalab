import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';

export default function Trade() {
  const navigate = useNavigate();
  const location = useLocation();

  const [balance, setBalance] = useState(0);
  const [portfolio, setPortfolio] = useState([]);
  const [transactions, setTransactions] = useState([]);
  
  const [symbol, setSymbol] = useState(location.state?.symbol || '');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState(location.state?.price ? location.state.price.toString() : '');
  
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [loading, setLoading] = useState(false);
  const [priceTimestamp, setPriceTimestamp] = useState('');

  const getHeaders = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/");
    }
    return {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    };
  };

  const fetchBalance = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/balance", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchPortfolio = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/portfolio", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPortfolio(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/transactions", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchAll = () => {
    fetchBalance();
    fetchPortfolio();
    fetchTransactions();
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchPrice = async () => {
    if (!symbol) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8000/api/stock/${symbol}?period=1mo`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPrice(data.metrics.currentPrice.toString());
        const now = new Date();
        const hh = String(now.getHours()).padStart(2, '0');
        const mm = String(now.getMinutes()).padStart(2, '0');
        setPriceTimestamp(`Last fetched: ${hh}:${mm}`);
      } else {
        setMessage("Failed to fetch price");
        setMessageType("error");
      }
    } catch (error) {
      console.error(error);
      setMessage("Error fetching price");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  const handleTrade = async (type) => {
    if (!symbol || !quantity || !price) {
      setMessage("Please fill all fields");
      setMessageType("error");
      return;
    }
    
    try {
      const res = await fetch("http://localhost:8000/api/trade", {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          stock_symbol: symbol.toUpperCase(),
          transaction_type: type,
          quantity: parseFloat(quantity),
          price: parseFloat(price)
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessage(data.message);
        setMessageType("success");
        fetchAll();
      } else {
        setMessage(data.detail || "Trade failed");
        setMessageType("error");
      }
    } catch (error) {
      console.error(error);
      setMessage("Error executing trade");
      setMessageType("error");
    }
  };

  const wrapperStyle = {
    background: "#0f1117",
    minHeight: "100vh",
    color: "#e2e8f0",
    fontFamily: "'Segoe UI', sans-serif",
    padding: "24px"
  };

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px"
  };

  const pillStyle = {
    background: "#1a1d27",
    border: "1px solid #6366f1",
    padding: "8px 16px",
    borderRadius: "20px",
    color: "#a5b4fc",
    fontWeight: "600"
  };

  const cardStyle = {
    background: "#1a1d27",
    borderRadius: "12px",
    padding: "24px",
    marginBottom: "24px",
    border: "1px solid #2d2f45"
  };

  const inputGroupStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "6px"
  };

  const labelStyle = {
    fontSize: "12px",
    color: "#94a3b8",
    textTransform: "uppercase"
  };

  const inputStyle = {
    background: "#0f1117",
    border: "1px solid #2d2f45",
    color: "#e2e8f0",
    padding: "10px 12px",
    borderRadius: "8px",
    fontSize: "14px",
    width: "140px",
    outline: "none"
  };

  const getMessageStyle = () => {
    return {
      background: messageType === "success" ? "#14532d" : "#450a0a",
      border: messageType === "success" ? "1px solid #22c55e" : "1px solid #ef4444",
      color: messageType === "success" ? "#86efac" : "#fca5a5",
      padding: "12px 16px",
      borderRadius: "8px",
      marginTop: "16px",
      fontSize: "14px"
    };
  };

  const tableHeaderStyle = {
    padding: "12px 16px",
    textAlign: "left",
    color: "#64748b",
    fontSize: "12px",
    textTransform: "uppercase",
    background: "#0f1117"
  };

  const tdStyle = {
    padding: "12px 16px"
  };

  // Portfolio total
  const portfolioTotal = portfolio.reduce((acc, row) => {
    if (price && symbol.toUpperCase() === row.stock_symbol.toUpperCase()) {
      return acc + (parseFloat(row.quantity) * parseFloat(price));
    }
    // If we don't have current price, maybe fallback to avg price to show something or 0?
    // User spec: "Total Portfolio Value spanning 3 cols, and sum of known values"
    // We only know value if price state matches. Otherwise we might just use avg_price as a fallback?
    // Let's use avg_price if current price isn't matching, or maybe just 0 as per "known values"
    if (price && symbol.toUpperCase() === row.stock_symbol.toUpperCase()) {
        // already handled
    } else {
        acc += parseFloat(row.quantity) * parseFloat(row.average_price);
    }
    return acc;
  }, 0);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAuthenticated');
    navigate('/');
  };

  return (
    <div className="dashboard-container">
      <Sidebar activeTab="trade" setActiveTab={(tabId) => navigate('/dashboard', { state: { initialTab: tabId } })} onLogout={handleLogout} />
      <main className="dashboard-main" style={{ ...wrapperStyle, padding: "2rem" }}>
        <div style={headerStyle}>
        <h2 style={{ color: "white", margin: 0 }}>📈 Paper Trading</h2>
        <div style={pillStyle}>
          💰 Balance: ${parseFloat(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ color: "#a5b4fc", fontSize: "14px", fontWeight: "600", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "1px" }}>
          Execute Trade
        </div>
        
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={inputGroupStyle}>
            <span style={labelStyle}>Symbol</span>
            <input 
              style={{ ...inputStyle, width: "120px" }}
              placeholder="e.g. AAPL" 
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            />
          </div>
          
          <div style={inputGroupStyle}>
            <span style={labelStyle}>Quantity</span>
            <input 
              style={inputStyle}
              type="number" 
              min="0.01" 
              step="0.01" 
              placeholder="0.00"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          
          <div style={inputGroupStyle}>
            <span style={labelStyle}>Price</span>
            <input 
              style={inputStyle}
              type="number" 
              min="0.01" 
              step="0.01" 
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <button 
              onClick={fetchPrice}
              style={{
                background: "transparent",
                border: "1px solid #6366f1",
                color: "#a5b4fc",
                padding: "10px 16px",
                borderRadius: "8px",
                cursor: "pointer",
                alignSelf: "flex-end"
              }}
            >
              {loading ? "Fetching..." : "Fetch Price"}
            </button>
            {priceTimestamp && <span style={{ fontSize: "10px", color: "#64748b" }}>{priceTimestamp}</span>}
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
          <button 
            onClick={() => handleTrade('buy')}
            style={{
              background: "#22c55e",
              color: "white",
              padding: "12px 32px",
              borderRadius: "8px",
              border: "none",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            BUY
          </button>
          <button 
            onClick={() => handleTrade('sell')}
            style={{
              background: "#ef4444",
              color: "white",
              padding: "12px 32px",
              borderRadius: "8px",
              border: "none",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer"
            }}
          >
            SELL
          </button>
        </div>

        {message && (
          <div style={getMessageStyle()}>
            {message}
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <div style={{ color: "white", fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>Current Holdings</div>
        {portfolio.length === 0 ? (
          <div style={{ textAlign: "center", color: "#64748b", padding: "20px 0" }}>No holdings yet</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Symbol</th>
                <th style={tableHeaderStyle}>Shares</th>
                <th style={tableHeaderStyle}>Avg Price</th>
                <th style={tableHeaderStyle}>Current Value</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.map((row, idx) => {
                const qty = parseFloat(row.quantity);
                const avgPrice = parseFloat(row.average_price);
                const isMatchingSymbol = price && symbol && symbol.toUpperCase() === row.stock_symbol.toUpperCase();
                const currentPrice = isMatchingSymbol ? parseFloat(price) : null;
                const currentValue = currentPrice ? (qty * currentPrice) : null;
                const costValue = qty * avgPrice;
                
                let valColor = "#e2e8f0";
                if (currentValue !== null) {
                  valColor = currentValue > costValue ? "#22c55e" : (currentValue < costValue ? "#ef4444" : "#e2e8f0");
                }

                return (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? "transparent" : "#0d1020" }}>
                    <td style={{ ...tdStyle, color: "#a5b4fc", fontWeight: "600" }}>{row.stock_symbol}</td>
                    <td style={tdStyle}>{qty.toFixed(4)}</td>
                    <td style={tdStyle}>${avgPrice.toFixed(2)}</td>
                    <td style={{ ...tdStyle, color: valColor }}>
                      {currentValue !== null ? `$${currentValue.toFixed(2)}` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ background: "#1a1d27" }}>
                <td colSpan="3" style={{ padding: "12px 16px", fontWeight: "bold", textAlign: "right" }}>Total Portfolio Value:</td>
                <td style={{ padding: "12px 16px", fontWeight: "bold" }}>${portfolioTotal.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      <div style={cardStyle}>
        <div style={{ color: "white", fontSize: "16px", fontWeight: "600", marginBottom: "16px" }}>
          Transaction History <span style={{ background: "#2d2f45", padding: "2px 8px", borderRadius: "10px", fontSize: "12px", marginLeft: "8px" }}>{transactions.length > 20 ? 20 : transactions.length}</span>
        </div>
        {transactions.length === 0 ? (
          <div style={{ textAlign: "center", color: "#64748b", padding: "20px 0" }}>No transactions yet</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={tableHeaderStyle}>Date</th>
                <th style={tableHeaderStyle}>Symbol</th>
                <th style={tableHeaderStyle}>Type</th>
                <th style={tableHeaderStyle}>Shares</th>
                <th style={tableHeaderStyle}>Price</th>
                <th style={tableHeaderStyle}>Total</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 20).map((row, idx) => {
                const isBuy = row.transaction_type.toUpperCase() === "BUY";
                const badgeStyle = {
                  background: isBuy ? "#14532d" : "#450a0a",
                  color: isBuy ? "#86efac" : "#fca5a5",
                  padding: "3px 10px",
                  borderRadius: "12px",
                  fontSize: "12px",
                  fontWeight: "600"
                };

                return (
                  <tr 
                    key={idx} 
                    style={{ background: idx % 2 === 0 ? "transparent" : "#0d1020", transition: "background 0.2s" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#1e2235"}
                    onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? "transparent" : "#0d1020"}
                  >
                    <td style={tdStyle}>{row.timestamp}</td>
                    <td style={{ ...tdStyle, color: "#a5b4fc", fontWeight: "600" }}>{row.stock_symbol}</td>
                    <td style={tdStyle}>
                      <span style={badgeStyle}>{row.transaction_type.toUpperCase()}</span>
                    </td>
                    <td style={tdStyle}>{parseFloat(row.quantity).toFixed(4)}</td>
                    <td style={tdStyle}>${parseFloat(row.price).toFixed(2)}</td>
                    <td style={tdStyle}>${(parseFloat(row.quantity) * parseFloat(row.price)).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      </main>
    </div>
  );
}
