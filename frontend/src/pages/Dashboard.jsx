import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { LogOut, ArrowUpRight, TrendingDown, Search, Loader2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

export function Dashboard() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  
  // Data States
  const [searchInput, setSearchInput] = useState('AAPL');
  const [symbol, setSymbol] = useState('AAPL');
  const [period, setPeriod] = useState('1mo');
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const TIME_PERIODS = [
    { label: '1M', value: '1mo' },
    { label: '3M', value: '3mo' },
    { label: '6M', value: '6mo' },
    { label: '1Y', value: '1y' },
    { label: '2Y', value: '2y' },
    { label: '5Y', value: '5y' }
  ];

  useEffect(() => {
    const user = localStorage.getItem('username');
    if (user) {
      setUsername(user);
    }
    // Fetch initial data
    fetchStockData('AAPL', '1mo');
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');
    navigate('/');
  };

  const fetchStockData = async (targetSymbol, targetPeriod = period) => {
    if (!targetSymbol) return;
    
    setLoading(true);
    setError('');
    
    try {
      // Connects to the FastAPI backend!
      const response = await fetch(`http://localhost:8000/api/stock/${targetSymbol}?period=${targetPeriod}`);
      if (!response.ok) {
        throw new Error('Failed to fetch data for symbol: ' + targetSymbol);
      }
      
      const data = await response.json();
      setStockData(data);
      setSymbol(data.symbol);
      setPeriod(targetPeriod);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error communicating with backend');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      fetchStockData(searchInput.trim().toUpperCase(), period);
    }
  };

  const handlePeriodChange = (newPeriod) => {
    fetchStockData(symbol, newPeriod);
  };

  // Format currency
  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-title">
          <h2>QuantaLab Dashboard</h2>
          <span className="user-badge">Welcome, {username}</span>
        </div>
        <div className="header-controls">
          <form onSubmit={handleSearch} className="search-form">
            <input 
              type="text"
              placeholder="Search symbol (e.g. MSFT)" 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="search-input-inline"
            />
            <Button type="submit" disabled={loading} variant="primary">
              {loading ? <Loader2 size={16} className="spin" /> : <Search size={16} />} Search
            </Button>
          </form>
          <Button variant="secondary" onClick={handleLogout}>
            <LogOut size={16} /> Logout
          </Button>
        </div>
      </header>

      <main className="dashboard-main">
        {error && <div className="alert error-alert">{error}</div>}
        
        {/* Dynamic Metrics */}
        <div className="metrics-grid">
          <Card className="metric-card">
            <h3 className="metric-title">{symbol} Price</h3>
            <div className="metric-value">
              {stockData ? formatCurrency(stockData.metrics.currentPrice) : '---'}
            </div>
            {stockData && (
              <div className={`metric-change ${stockData.metrics.changePct >= 0 ? 'positive' : 'negative'}`}>
                {stockData.metrics.changePct >= 0 ? <ArrowUpRight size={16} /> : <TrendingDown size={16} />}
                {Math.abs(stockData.metrics.changePct)}% recent
              </div>
            )}
          </Card>
          <Card className="metric-card">
            <h3 className="metric-title">Volume</h3>
            <div className="metric-value">
              {stockData ? stockData.metrics.volume.toLocaleString() : '---'}
            </div>
            <div className="metric-change neutral">
              Trading volume
            </div>
          </Card>
          <Card className="metric-card">
            <h3 className="metric-title">Active Algorithms</h3>
            <div className="metric-value">Phase 3</div>
            <div className="metric-change neutral">
              Waiting for ML module
            </div>
          </Card>
        </div>

        {/* Dynamic Chart Area */}
        <div className="chart-section">
          <Card className="chart-card">
            <div className="chart-header">
              <h3>{symbol} Historical Trend</h3>
              <div className="chart-controls">
                {TIME_PERIODS.map(p => (
                  <Button 
                    key={p.value} 
                    variant={period === p.value ? 'primary' : 'secondary'} 
                    onClick={() => handlePeriodChange(p.value)}
                    disabled={loading}
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
            
            <div className="chart-container" style={{ flex: 1, minHeight: '350px', position: 'relative' }}>
              {loading && !stockData ? (
                <div className="loading-overlay">
                  <Loader2 className="spin" size={32} />
                  <span style={{marginLeft: '0.5rem'}}>Fetching live data...</span>
                </div>
              ) : stockData && stockData.timeseries ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={stockData.timeseries} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <Line type="monotone" dataKey="price" stroke="#00ff88" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: '#00ff88', stroke: '#fff' }} />
                    <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="var(--text-muted)" 
                      fontSize={12} 
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(val) => {
                        // Better axis formatting for long periods
                        const parts = val.split('-');
                        if (period === '1y' || period === '2y' || period === '5y') {
                          return `${parts[1]}/${parts[0].slice(2)}`; // MM/YY
                        }
                        return `${parts[1]}/${parts[2]}`; // MM/DD
                      }}
                    />
                    <YAxis 
                      domain={['auto', 'auto']} 
                      stroke="var(--text-muted)" 
                      fontSize={12} 
                      tickLine={false} 
                      axisLine={false}
                      tickFormatter={(val) => '$' + val}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--border)', borderRadius: '0.5rem', backdropFilter: 'blur(8px)' }}
                      labelStyle={{ color: 'var(--text-muted)', marginBottom: '4px' }}
                      itemStyle={{ color: '#00ff88', fontWeight: 'bold' }}
                      formatter={(value) => [formatCurrency(value), 'Price']}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="loading-overlay">
                  No Data Available
                </div>
              )}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
