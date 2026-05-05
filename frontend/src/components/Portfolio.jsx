import React, { useState, useEffect } from 'react';
import { Loader2, TrendingUp, TrendingDown, Wallet, PieChart, BarChart2, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import ReactApexChart from 'react-apexcharts';
import { Card } from './common/Card';
import { Button } from './common/Button';
import { TradeModal } from './common/TradeModal';

const fmt = (val, decimals = 2) =>
  val != null ? Number(val).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : '—';

const formatCurrency = (val, currency) => {
  if (val == null) return '—';
  let locale = 'en-US';
  if (currency === 'INR') locale = 'en-IN';
  else if (currency === 'EUR') locale = 'en-IE';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(val);
};

const DONUT_COLORS = [
  '#3b82f6', '#a855f7', '#10b981', '#f59e0b',
  '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
  '#f97316', '#8b5cf6'
];

export function Portfolio() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState(null);

  const fetchSummary = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/portfolio?summary=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch portfolio');
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchSummary(); }, []);

  

  if (loading) {
    return (
      <div style={{ height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <Loader2 size={44} color="#3b82f6" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ color: '#94a3b8' }}>Fetching live market prices…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', background: 'rgba(239,68,68,0.1)', borderRadius: '1rem', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
        {error}
      </div>
    );
  }

  const positions = summary?.positions ?? [];
  const stats = summary?.summary ?? {};
  const rates = summary?.rates ?? { USD: 83, EUR: 90, INR: 1 };

  const isProfitable = stats.total_pnl >= 0;

  // ── Donut chart ──────────────────────────────────────────────────────────
  const donutSeries = positions.map(p => {
    const val = p.market_value ?? p.invested;
    const rate = rates[p.currency] || 1;
    return val * rate;
  });
  const donutLabels = positions.map(p => p.stock_symbol);
  
  if (stats.cash_balance > 0) {
    donutSeries.push(stats.cash_balance);
    donutLabels.push('Available Cash');
  }

  const totalAccountValue = (stats.total_value || 0) + (stats.cash_balance || 0);

  const donutOptions = {
    chart: { type: 'donut', background: 'transparent' },
    labels: donutLabels,
    colors: DONUT_COLORS,
    stroke: { show: false },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '75%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Portfolio',
              color: '#94a3b8',
              fontSize: '15px',
              formatter: () => `₹${fmt(totalAccountValue)}`
            },
            value: {
            show: true,
            fontSize: '20px', // Make it larger
            fontWeight: 700,
            color: '#f8fafc', // ADD THIS: Bright white/gray color for the amount
            offsetY: 5,
            formatter: (val) => `₹${fmt(val)}`
          }
          }
        }
      }
    },
    legend: { position: 'bottom', labels: { colors: '#f8fafc' }, fontSize: '13px' },
    tooltip: {
      theme: 'dark',
      y: { formatter: (val) => `₹${fmt(val)}` }
    }
  };

  // ── Empty state ──────────────────────────────────────────────────────────
  if (positions.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 2rem', textAlign: 'center', gap: '1.5rem' }}>
        <div style={{ padding: '1.5rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', color: '#3b82f6' }}>
          <PieChart size={56} />
        </div>
        <div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>No Positions Yet</h3>
          <p style={{ color: '#94a3b8', maxWidth: 380, lineHeight: 1.6 }}>
            Your portfolio is empty. Head to the <strong style={{ color: '#60a5fa' }}>Dashboard</strong> tab to buy your first position and start building your portfolio.
          </p>
        </div>
        <div style={{
          padding: '0.75rem 1.5rem',
          background: 'rgba(59, 130, 246, 0.15)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '0.75rem',
          color: '#60a5fa',
          fontWeight: '600',
          fontSize: '0.9rem'
        }}>
          Cash Balance: ₹{fmt(stats.cash_balance)}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* ── Title Header ── */}
      {/* <h2 style={{ fontSize: '2rem', fontWeight: '600', color: '#f8fafc', marginBottom: '0.5rem' }}>Portfolio Management</h2> */}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.25rem' }}>My Portfolio</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Live prices · Unrealized P&amp;L</p>
        </div>
        <button
          onClick={() => fetchSummary(true)}
          disabled={refreshing}
          className="refresh-btn" // Using a class or keeping your styles
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.6rem 1.2rem', background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0.75rem',
            color: '#f8fafc', cursor: 'pointer', fontSize: '0.875rem'
          }}
        >
          <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
          {refreshing ? 'Refreshing…' : 'Refresh Prices'}
        </button>
      </div>

      {/* ── Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        <div style={statCardStyle()}><div style={iconWrap('#10b981')}><Wallet size={22} /></div><div><p style={statLabel}>NET WORTH</p><h4 style={statValue}>₹{fmt(totalAccountValue)}</h4></div></div>
        <div style={statCardStyle()}><div style={iconWrap('#3b82f6')}><PieChart size={22} /></div><div><p style={statLabel}>EQUITY VALUE</p><h4 style={statValue}>₹{fmt(stats.total_value)}</h4></div></div>
        <div style={statCardStyle()}><div style={iconWrap('#f59e0b')}><BarChart2 size={22} /></div><div><p style={statLabel}>AVAILABLE CASH</p><h4 style={statValue}>₹{fmt(stats.cash_balance)}</h4></div></div>
        <div style={statCardStyle(isProfitable ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)')}>
          <div style={iconWrap(isProfitable ? '#10b981' : '#ef4444')}>{isProfitable ? <TrendingUp size={22} /> : <TrendingDown size={22} />}</div>
          <div><p style={statLabel}>UNREALIZED P&amp;L</p><h4 style={{ ...statValue, color: isProfitable ? '#10b981' : '#ef4444' }}>{isProfitable ? '+' : ''}₹{fmt(stats.total_pnl)}</h4></div>
        </div>
      </div>

      {/* ── Allocation & Holdings ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.8fr', gap: '1.5rem', flexWrap: 'wrap' }}>
        <Card style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: '#f8fafc' }}>Allocation</h3>
          <ReactApexChart options={donutOptions} series={donutSeries} type="donut" height={350} />
        </Card>

        <Card style={{ padding: '1.5rem', overflow: 'hidden' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: '#f8fafc' }}>Holdings</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  {['Symbol', 'Qty', 'Avg Price', 'Live Price', 'Market Value', 'P&L', 'Return'].map(col => (
                    <th key={col} style={thStyle}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {positions.map((p, i) => {
                  const profit = p.pnl != null && p.pnl >= 0;
                  return (
                    <tr key={p.id} className="table-row">
                      <td style={{ padding: '1rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                          <span style={{ fontWeight: '700', color: '#f8fafc' }}>{p.stock_symbol}</span>
                        </div>
                      </td>
                      <td style={tdStyle}>{p.quantity}</td>
                      <td style={tdStyle}>{formatCurrency(p.average_price, p.currency)}</td>
                      <td style={tdStyle}>{formatCurrency(p.current_price, p.currency)}</td>
                      <td style={tdStyle}>{formatCurrency(p.market_value, p.currency)}</td>
                      <td style={{ ...tdStyle, color: profit ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                        {p.pnl >= 0 ? '+' : ''}{formatCurrency(p.pnl, p.currency)}
                      </td>
                      <td style={{ ...tdStyle }}>
                        <span style={{ 
                          padding: '0.2rem 0.5rem', borderRadius: '4px', 
                          background: profit ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', 
                          color: profit ? '#10b981' : '#ef4444' 
                        }}>
                          {profit ? '+' : ''}{fmt(p.pnl_pct)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Style helpers ────────────────────────────────────────────────────────────
const statCardStyle = (bg = 'rgba(30, 41, 59, 0.5)') => ({
  background: bg,
  padding: '1.25rem',
  borderRadius: '1rem',
  border: '1px solid rgba(255,255,255,0.05)',
  display: 'flex',
  alignItems: 'center',
  gap: '1rem'
});

const iconWrap = (color) => ({
  padding: '0.75rem',
  background: color + '22',
  borderRadius: '0.75rem',
  color,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0
});

const statLabel = {
  fontSize: '0.75rem',
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.25rem'
};

const statValue = {
  fontSize: '1.3rem',
  fontWeight: '700',
  color: '#f8fafc',
  margin: 0
};

const tdStyle = {
  padding: '1rem 0.75rem',
  textAlign: 'right',
  color: '#cbd5e1',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  whiteSpace: 'nowrap'
};

const thStyle = {
  padding: '0.75rem',
  textAlign: 'right',
  color: '#64748b',
  fontSize: '0.7rem',
  textTransform: 'uppercase',
  borderBottom: '1px solid rgba(255,255,255,0.06)'
};
