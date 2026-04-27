import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { Card } from './common/Card';
import { Loader2, TrendingUp, TrendingDown, Wallet, PieChart, BarChart2, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';

const fmt = (val, decimals = 2) =>
  val != null ? Number(val).toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) : '—';

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

  const fetchSummary = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/portfolio/summary', {
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

  const isProfitable = stats.total_pnl >= 0;

  // ── Donut chart ──────────────────────────────────────────────────────────
  const donutSeries = positions.map(p => p.market_value ?? p.invested);
  const donutLabels = positions.map(p => p.stock_symbol);

  const donutOptions = {
    chart: { type: 'donut', background: 'transparent' },
    labels: donutLabels,
    colors: DONUT_COLORS,
    stroke: { show: false },
    dataLabels: { enabled: false },
    plotOptions: {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            total: {
              show: true,
              label: 'Portfolio',
              color: '#94a3b8',
              fontSize: '13px',
              formatter: () => `₹${fmt(stats.total_value)}`
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
            Your portfolio is empty. Head to the <strong style={{ color: '#60a5fa' }}>Trade</strong> tab to buy your first position and start building your paper trading portfolio.
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

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.25rem' }}>My Portfolio</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Live prices · Unrealized P&amp;L</p>
        </div>
        <button
          onClick={() => fetchSummary(true)}
          disabled={refreshing}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.6rem 1.2rem',
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '0.75rem',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '0.875rem',
            transition: 'all 0.2s'
          }}
        >
          <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          {refreshing ? 'Refreshing…' : 'Refresh Prices'}
        </button>
      </div>

      {/* ── Summary Stat Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>

        {/* Total Value */}
        <div style={statCardStyle()}>
          <div style={iconWrap('#3b82f6')}><Wallet size={22} /></div>
          <div>
            <p style={statLabel}>Portfolio Value</p>
            <h4 style={statValue}>₹{fmt(stats.total_value)}</h4>
          </div>
        </div>

        {/* Total Invested */}
        <div style={statCardStyle()}>
          <div style={iconWrap('#a855f7')}><BarChart2 size={22} /></div>
          <div>
            <p style={statLabel}>Total Invested</p>
            <h4 style={statValue}>₹{fmt(stats.total_invested)}</h4>
          </div>
        </div>

        {/* Unrealized P&L */}
        <div style={statCardStyle(isProfitable ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)')}>
          <div style={iconWrap(isProfitable ? '#10b981' : '#ef4444')}>
            {isProfitable ? <TrendingUp size={22} /> : <TrendingDown size={22} />}
          </div>
          <div>
            <p style={statLabel}>Unrealized P&amp;L</p>
            <h4 style={{ ...statValue, color: isProfitable ? '#10b981' : '#ef4444' }}>
              {isProfitable ? '+' : ''}₹{fmt(stats.total_pnl)}
            </h4>
          </div>
        </div>

        {/* Return % */}
        <div style={statCardStyle()}>
          <div style={iconWrap(isProfitable ? '#10b981' : '#ef4444')}>
            {isProfitable ? <ArrowUpRight size={22} /> : <ArrowDownRight size={22} />}
          </div>
          <div>
            <p style={statLabel}>Total Return</p>
            <h4 style={{ ...statValue, color: isProfitable ? '#10b981' : '#ef4444' }}>
              {isProfitable ? '+' : ''}{fmt(stats.total_pnl_pct)}%
            </h4>
          </div>
        </div>

      </div>

      {/* ── Donut Chart + Holdings Table ── */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>

        {/* Donut Chart */}
        <Card style={{ padding: '1.5rem', flex: '1 1 300px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: '#f8fafc' }}>Allocation</h3>
          <ReactApexChart options={donutOptions} series={donutSeries} type="donut" height={300} />
        </Card>

        {/* Holdings Data Grid */}
        <Card style={{ padding: '1.5rem', flex: '2 1 500px', overflow: 'auto' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: '#f8fafc' }}>Holdings</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr>
                {['Symbol', 'Qty', 'Avg Price', 'Live Price', 'Market Value', 'P&L', 'Return'].map(col => (
                  <th key={col} style={{
                    padding: '0.75rem 0.75rem',
                    textAlign: col === 'Symbol' ? 'left' : 'right',
                    color: '#64748b',
                    fontWeight: '600',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    whiteSpace: 'nowrap'
                  }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.map((p, i) => {
                const profit = p.pnl != null && p.pnl >= 0;
                return (
                  <tr key={p.id} style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    {/* Symbol */}
                    <td style={{ padding: '1rem 0.75rem', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{
                          width: 10, height: 10, borderRadius: '50%',
                          background: DONUT_COLORS[i % DONUT_COLORS.length],
                          flexShrink: 0
                        }} />
                        <span style={{ fontWeight: '700', color: '#f8fafc', letterSpacing: '0.02em' }}>{p.stock_symbol}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>{p.quantity}</td>
                    <td style={tdStyle}>₹{fmt(p.average_price)}</td>
                    <td style={tdStyle}>{p.current_price != null ? `₹${fmt(p.current_price)}` : '—'}</td>
                    <td style={tdStyle}>{p.market_value != null ? `₹${fmt(p.market_value)}` : '—'}</td>
                    <td style={{ ...tdStyle, color: p.pnl != null ? (profit ? '#10b981' : '#ef4444') : '#94a3b8', fontWeight: '600' }}>
                      {p.pnl != null ? `${profit ? '+' : ''}₹${fmt(p.pnl)}` : '—'}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: '600' }}>
                      {p.pnl_pct != null ? (
                        <span style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '1rem',
                          background: profit ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                          color: profit ? '#6ee7b7' : '#fca5a5',
                          fontSize: '0.8rem'
                        }}>
                          {profit ? '+' : ''}{fmt(p.pnl_pct)}%
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>

      {/* ── Cash Balance Footer ── */}
      <div style={{
        padding: '1rem 1.5rem',
        background: 'rgba(30, 41, 59, 0.5)',
        borderRadius: '0.75rem',
        border: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Available Cash Balance</span>
        <span style={{ fontWeight: '700', fontSize: '1.1rem', color: '#60a5fa' }}>₹{fmt(stats.cash_balance)}</span>
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
