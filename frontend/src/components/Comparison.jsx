import React, { useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { Card } from './common/Card';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { Loader2, Plus } from 'lucide-react';

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

export function Comparison() {
  const [symbolsInput, setSymbolsInput] = useState('AAPL,MSFT,GOOGL');
  const [period, setPeriod] = useState('1mo');
  const [comparisonData, setComparisonData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [market, setMarket] = useState('INDIA');

  const handleCompare = async (e) => {
    e?.preventDefault();
    if (!symbolsInput.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      const symbols = symbolsInput.split(',').map(s => s.trim()).filter(s => s).join(',');
      const res = await fetch(`http://localhost:8000/api/compare?symbols=${symbols}&period=${period}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Comparison failed');
      const data = await res.json();
      setComparisonData(data.comparison);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSeries = () => {
    if (comparisonData.length === 0) return [];
    
    const keys = Object.keys(comparisonData[0]).filter(k => k !== 'date');
    return keys.map(key => ({
      name: key,
      data: comparisonData.map(d => ({
        x: new Date(d.date).getTime(),
        y: d[key]
      }))
    }));
  };

  const options = {
    chart: {
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: false }
    },
    title: {
      text: 'Percentage Returns (%)',
      style: { color: '#94a3b8' }
    },
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: '#94a3b8' } }
    },
    yaxis: {
      labels: { style: { colors: '#94a3b8' } }
    },
    grid: { borderColor: 'rgba(255,255,255,0.05)' },
    theme: { mode: 'dark' },
    stroke: { width: 2 },
    legend: { labels: { colors: '#f8fafc' } }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <Card style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Add from market:</span>
          <select 
            value={market} 
            onChange={(e) => {
              setMarket(e.target.value);
              setSymbolsInput('');
            }}
            style={{ 
              padding: '0.6rem 1rem', 
              borderRadius: '0.5rem', 
              background: 'rgba(15, 23, 42, 0.6)', 
              color: 'white',
              border: '1px solid var(--border)',
              cursor: 'pointer'
            }}
          >
            <option value="INDIA">India</option>
            <option value="US">US</option>
            <option value="EU">EU</option>
          </select>
          <select 
            value=""
            onChange={(e) => {
              const newSymbol = e.target.value;
              if (newSymbol) {
                const currentSymbols = symbolsInput.split(',').map(s => s.trim()).filter(s => s);
                if (!currentSymbols.includes(newSymbol)) {
                  setSymbolsInput([...currentSymbols, newSymbol].join(', '));
                }
              }
            }}
            style={{ 
              padding: '0.6rem 1rem', 
              borderRadius: '0.5rem', 
              background: 'rgba(15, 23, 42, 0.6)', 
              color: 'white',
              border: '1px solid var(--border)',
              cursor: 'pointer'
            }}
          >
            <option value="" disabled>Select a company to add</option>
            {Object.entries(MARKETS[market].tickers).map(([ticker, name]) => (
              <option key={ticker} value={ticker}>{name} ({ticker})</option>
            ))}
          </select>
        </div>

        <form onSubmit={handleCompare} style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Input 
            value={symbolsInput} 
            onChange={(e) => setSymbolsInput(e.target.value)} 
            placeholder="Comma separated symbols (e.g., AAPL,MSFT)"
            style={{ minWidth: '300px', flex: 1 }}
          />
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)}
            style={{ 
              padding: '0.6rem 1rem', 
              borderRadius: '0.5rem', 
              background: 'rgba(15, 23, 42, 0.6)', 
              color: 'white',
              border: '1px solid var(--border)',
              cursor: 'pointer'
            }}
          >
            <option value="1mo">1 Month</option>
            <option value="3mo">3 Months</option>
            <option value="6mo">6 Months</option>
            <option value="1y">1 Year</option>
          </select>
          <Button type="submit" disabled={loading} variant="primary">
            {loading ? <Loader2 className="spin" size={16} /> : 'Compare'}
          </Button>
        </form>
        {error && <div style={{ color: '#ef4444', marginTop: '1rem' }}>{error}</div>}
      </Card>

      <Card style={{ padding: '1.5rem' }}>
        {comparisonData.length > 0 ? (
          <ReactApexChart 
            options={options} 
            series={getSeries()} 
            type="line" 
            height={400} 
          />
        ) : (
          <div style={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Enter symbols to compare returns
          </div>
        )}
      </Card>
    </div>
  );
}
