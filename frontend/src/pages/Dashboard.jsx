import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ArrowUpRight, TrendingDown, Search, Loader2 } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import './Dashboard.css';

const CandlestickChart = lazy(() => import('../components/charts/CandlestickChart').then(m => ({ default: m.CandlestickChart })));
const TechnicalIndicators = lazy(() => import('../components/charts/TechnicalIndicators').then(m => ({ default: m.TechnicalIndicators })));
const PredictionChart = lazy(() => import('../components/charts/PredictionChart').then(m => ({ default: m.PredictionChart })));
const SimpleLineChart = lazy(() => import('../components/charts/SimpleLineChart').then(m => ({ default: m.SimpleLineChart })));
const Portfolio = lazy(() => import('../components/Portfolio').then(m => ({ default: m.Portfolio })));
const Comparison = lazy(() => import('../components/Comparison').then(m => ({ default: m.Comparison })));
const Transactions = lazy(() => import('../components/Transactions').then(m => ({ default: m.Transactions })));
const Backtest = lazy(() => import('../components/Backtest').then(m => ({ default: m.Backtest })));

const MARKETS = {
  INDIA: {
    name: 'India',
    currency: 'INR',
    locale: 'en-IN',
    tickers: {
      "RELIANCE.NS": "Reliance Industries",
      "TCS.NS": "Tata Consultancy Services",
      "INFY.NS": "Infosys",
      "HDFCBANK.NS": "HDFC Bank",
      "ICICIBANK.NS": "ICICI Bank",
      "BHARTIARTL.NS": "Bharti Airtel",
      "ITC.NS": "ITC",
      "LT.NS": "Larsen & Toubro",
      "SBIN.NS": "State Bank of India",
      "HINDUNILVR.NS": "Hindustan Unilever"
    }
  },
  US: {
    name: 'US',
    currency: 'USD',
    locale: 'en-US',
    tickers: {
      "AAPL": "Apple",
      "MSFT": "Microsoft",
      "GOOGL": "Alphabet (Google)",
      "AMZN": "Amazon",
      "NVDA": "NVIDIA",
      "META": "Meta",
      "TSLA": "Tesla",
      "BRK-B": "Berkshire Hathaway",
      "LLY": "Eli Lilly",
      "V": "Visa"
    }
  },
  EU: {
    name: 'EU',
    currency: 'EUR',
    locale: 'en-IE',
    tickers: {
      "ASML.AS": "ASML",
      "NESN.SW": "Nestle",
      "MC.PA": "LVMH",
      "SAP.DE": "SAP",
      "SIE.DE": "Siemens",
      "NOVN.SW": "Novartis",
      "AZN.L": "AstraZeneca",
      "HSBA.L": "HSBC",
      "SHEL.L": "Shell",
      "ULVR.L": "Unilever"
    }
  }
};

export function Dashboard() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');

  // Navigation State
  const [activeTab, setActiveTab] = useState('dashboard');

  // Data States
  const [market, setMarket] = useState('INDIA');
  const [searchInput, setSearchInput] = useState('');
  const [symbol, setSymbol] = useState('RELIANCE.NS');
  const [period, setPeriod] = useState('1mo');
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [predDays, setPredDays] = useState(30);

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
    if (user) setUsername(user);
    fetchStockData('RELIANCE.NS', '1mo');
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const fetchStockData = async (targetSymbol, targetPeriod = period) => {
    if (!targetSymbol) return;
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:8000/api/stock/${targetSymbol}?period=${targetPeriod}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
        handleLogout();
        return;
      }
      if (!response.ok) throw new Error('Failed to fetch data for symbol: ' + targetSymbol);

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

  const formatCurrency = (val) => {
    const currentMarket = MARKETS[market];
    return new Intl.NumberFormat(currentMarket.locale, {
      style: 'currency',
      currency: currentMarket.currency
    }).format(val);
  };

  const renderDashboardView = () => (
    <>
      <div className="dashboard-header" style={{ marginLeft: 0, borderRadius: '1rem', marginBottom: '1.5rem' }}>
        <div className="header-title">
          <h2>Market Dashboard</h2>
        </div>
        <div className="header-controls">
          <select
            value={market}
            onChange={(e) => {
              const newMarket = e.target.value;
              setMarket(newMarket);
              const firstTicker = Object.keys(MARKETS[newMarket].tickers)[0];
              setSymbol(firstTicker);
              setSearchInput('');
              fetchStockData(firstTicker, period);
            }}
            className="market-select"
          >
            <option value="INDIA">India</option>
            <option value="US">US</option>
            <option value="EU">EU</option>
          </select>
          <select
            value={Object.keys(MARKETS[market].tickers).includes(symbol) ? symbol : ''}
            onChange={(e) => {
              const newSymbol = e.target.value;
              if (newSymbol) {
                setSymbol(newSymbol);
                setSearchInput('');
                fetchStockData(newSymbol, period);
              }
            }}
            className="ticker-select"
          >
            <option value="" disabled>Select a company</option>
            {Object.entries(MARKETS[market].tickers).map(([ticker, name]) => (
              <option key={ticker} value={ticker}>{name} ({ticker})</option>
            ))}
          </select>
          <form onSubmit={handleSearch} className="search-form">
            <input
              type="text"
              placeholder="Custom Symbol..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="search-input-inline"
            />
            <Button type="submit" disabled={loading} variant="primary">
              {loading ? <Loader2 size={16} className="spin" /> : <Search size={16} />}
            </Button>
          </form>
        </div>
      </div>

      {error && <div className="alert error-alert">{error}</div>}

      <div className="metrics-grid">
        <Card className="metric-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h3 className="metric-title">{symbol} Price</h3>
              <div className="metric-value">
                {stockData ? formatCurrency(stockData.metrics.currentPrice) : '---'}
              </div>
              {stockData && (
                <div className={`metric-change ${stockData.metrics.changePct >= 0 ? 'positive' : 'negative'}`}>
                  {stockData.metrics.changePct >= 0 ? <ArrowUpRight size={16} /> : <TrendingDown size={16} />}
                  {Math.abs(stockData.metrics.changePct)}%
                </div>
              )}
            </div>
            {stockData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <button 
                  onClick={() => navigate('/trade', { state: { symbol: symbol, price: stockData.metrics.currentPrice }})}
                  style={{ background: '#22c55e', color: 'white', padding: '4px 16px', borderRadius: '4px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  BUY
                </button>
                <button 
                  onClick={() => navigate('/trade', { state: { symbol: symbol, price: stockData.metrics.currentPrice }})}
                  style={{ background: '#ef4444', color: 'white', padding: '4px 16px', borderRadius: '4px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  SELL
                </button>
              </div>
            )}
          </div>
        </Card>
        <Card className="metric-card">
          <h3 className="metric-title">Volume</h3>
          <div className="metric-value">
            {stockData?.metrics?.volume ? stockData.metrics.volume.toLocaleString() : '---'}
          </div>
          <div className="metric-change neutral">Trading volume</div>
        </Card>
        <Card className="metric-card">
          <h3 className="metric-title">Volatility (Ann.)</h3>
          <div className="metric-value">
            {stockData?.metrics.volatility ? `${stockData.metrics.volatility}%` : '---'}
          </div>
          <div className="metric-change neutral">Historical risk</div>
        </Card>
        <Card className="metric-card">
          <h3 className="metric-title">Max Drawdown</h3>
          <div className="metric-value" style={{ color: 'var(--danger)' }}>
            {stockData?.metrics.maxDrawdown ? `${stockData.metrics.maxDrawdown}%` : '---'}
          </div>
          <div className="metric-change neutral">Peak to trough</div>
        </Card>
        <Card className="metric-card">
          <h3 className="metric-title">Sharpe Ratio</h3>
          <div className="metric-value">
            {stockData?.metrics.sharpeRatio ? stockData.metrics.sharpeRatio : '---'}
          </div>
          <div className="metric-change neutral">Risk-adjusted return</div>
        </Card>
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <Card style={{ padding: '0', overflow: 'hidden' }}>
          <Suspense fallback={<div className="loading-overlay" style={{ height: '350px' }}><Loader2 className="spin" size={32} /></div>}>
            <SimpleLineChart 
              data={stockData?.timeseries} 
              symbol={symbol} 
              market={MARKETS[market]} 
              period={period} 
              loading={loading} 
              onPeriodChange={(newPeriod) => fetchStockData(symbol, newPeriod)} 
            />
          </Suspense>
        </Card>
      </div>

      <div className="chart-section" style={{ gap: '2rem' }}>
        <Card className="chart-card">
          <div className="chart-header">
            <h3>Advanced Price Visualization</h3>
            <div className="chart-controls">
              {TIME_PERIODS.map(p => (
                <Button
                  key={p.value}
                  variant={period === p.value ? 'primary' : 'secondary'}
                  onClick={() => fetchStockData(symbol, p.value)}
                  disabled={loading}
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="chart-container">
            {loading && !stockData ? (
              <div className="loading-overlay"><Loader2 className="spin" size={32} /></div>
            ) : stockData ? (
              <Suspense fallback={<div className="loading-overlay"><Loader2 className="spin" size={32} /></div>}>
                <CandlestickChart key={`${symbol}-${period}`} data={stockData.timeseries} symbol={symbol} />
              </Suspense>
            ) : (
              <div className="loading-overlay">No Data Available</div>
            )}
          </div>
        </Card>

        <Card className="chart-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Technical Indicators</h3>
          {loading && !stockData ? (
            <div className="loading-overlay"><Loader2 className="spin" size={32} /></div>
          ) : stockData ? (
            <Suspense fallback={<div className="loading-overlay"><Loader2 className="spin" size={32} /></div>}>
              <TechnicalIndicators key={`${symbol}-${period}`} data={stockData.timeseries} />
            </Suspense>
          ) : (
            <div className="loading-overlay">No Data Available</div>
          )}
        </Card>
      </div>
    </>
  );

  return (
    <div className="dashboard-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      <main className="dashboard-main">
        {activeTab === 'dashboard' && renderDashboardView()}
        {activeTab === 'portfolio' && (
          <div>
            <h2 style={{ marginBottom: '2rem', fontSize: '2rem' }}>Portfolio Management</h2>
            <Suspense fallback={<div className="loading-overlay"><Loader2 className="spin" size={32} /></div>}>
              <Portfolio />
            </Suspense>
          </div>
        )}
        {activeTab === 'transactions' && (
          <div>
            <h2 style={{ marginBottom: '2rem', fontSize: '2rem' }}>Transactions</h2>
            <Suspense fallback={<div className="loading-overlay"><Loader2 className="spin" size={32} /></div>}>
              <Transactions />
            </Suspense>
          </div>
        )}
        {activeTab === 'compare' && (
          <div>
            <h2 style={{ marginBottom: '2rem', fontSize: '2rem' }}>Stock Comparison</h2>
            <Suspense fallback={<div className="loading-overlay"><Loader2 className="spin" size={32} /></div>}>
              <Comparison />
            </Suspense>
          </div>
        )}
        {activeTab === 'predictions' && (
          <div>
            {/* Predictions Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '2rem',
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.35rem' }}>AI Predictions</h2>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                  Powered by Random Forest Regressor · Trained on 2 years of historical data
                </p>
              </div>

              {/* Stock selector for predictions */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <select
                  value={Object.keys(MARKETS[market].tickers).includes(symbol) ? symbol : ''}
                  onChange={(e) => { if (e.target.value) { setSymbol(e.target.value); fetchStockData(e.target.value, period); } }}
                  style={{
                    background: 'rgba(30, 41, 59, 0.8)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#f8fafc',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  {Object.entries(MARKETS[market].tickers).map(([ticker, name]) => (
                    <option key={ticker} value={ticker}>{name} ({ticker})</option>
                  ))}
                </select>

                {/* Forecast duration toggle */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[7, 30, 90].map(d => (
                    <button
                      key={d}
                      onClick={() => setPredDays(d)}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '0.5rem',
                        border: '1px solid rgba(255,255,255,0.1)',
                        background: predDays === d ? 'rgba(59, 130, 246, 0.2)' : 'rgba(30, 41, 59, 0.5)',
                        color: predDays === d ? '#60a5fa' : '#94a3b8',
                        fontWeight: predDays === d ? '600' : '400',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        transition: 'all 0.2s'
                      }}
                    >
                      {d}D
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Suspense fallback={<div className="loading-overlay" style={{ height: 400 }}><Loader2 className="spin" size={32} /></div>}>
              <PredictionChart symbol={symbol} historicalData={stockData?.timeseries} days={predDays} />
            </Suspense>

            {/* Disclaimer */}
            <div style={{
              marginTop: '1.5rem',
              padding: '1rem 1.25rem',
              background: 'rgba(251, 191, 36, 0.05)',
              border: '1px solid rgba(251, 191, 36, 0.15)',
              borderRadius: '0.75rem',
              color: '#fbbf24',
              fontSize: '0.8rem',
              lineHeight: 1.6
            }}>
              ⚠️ <strong>Disclaimer:</strong> These predictions are generated by a machine learning model for educational and simulation purposes only. They do not constitute financial advice and should not be used as the sole basis for investment decisions.
            </div>
          </div>
        )}
        {activeTab === 'backtest' && (
          <Suspense fallback={<div className="loading-overlay" style={{ height: 400 }}><Loader2 className="spin" size={32} /></div>}>
            <Backtest />
          </Suspense>
        )}
      </main>
    </div>
  );
}
