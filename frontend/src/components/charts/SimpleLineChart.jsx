import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';
import { Button } from '../common/Button';

export function SimpleLineChart({ data, symbol, market, period, loading, onPeriodChange }) {
  const TIME_PERIODS = [
    { label: '1M', value: '1mo' },
    { label: '3M', value: '3mo' },
    { label: '6M', value: '6mo' },
    { label: '1Y', value: '1y' },
    { label: '2Y', value: '2y' },
    { label: '5Y', value: '5y' }
  ];

  const formatCurrency = (val) => {
    // Basic formatting fallback if MARKETS isn't fully passed
    return new Intl.NumberFormat(market?.locale || 'en-IN', { 
      style: 'currency', 
      currency: market?.currency || 'INR',
      maximumFractionDigits: 0
    }).format(val);
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3>{symbol} Historical Trend</h3>
        <div className="chart-controls" style={{ display: 'flex', gap: '0.5rem' }}>
          {TIME_PERIODS.map(p => (
            <Button 
              key={p.value} 
              variant={period === p.value ? 'primary' : 'secondary'} 
              onClick={() => onPeriodChange(p.value)}
              disabled={loading}
              style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="chart-container" style={{ flex: 1, minHeight: '350px', position: 'relative' }}>
        {loading && (!data || data.length === 0) ? (
          <div className="loading-overlay" style={{ height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 className="spin" size={32} />
          </div>
        ) : data && data.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <Line type="monotone" dataKey="price" stroke="#00ff88" strokeWidth={2} dot={false} activeDot={{ r: 6, fill: '#00ff88', stroke: '#fff' }} />
              <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="var(--text-muted)" 
                fontSize={12} 
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => {
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
                tickFormatter={(val) => formatCurrency(val)}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--border)', borderRadius: '0.5rem', backdropFilter: 'blur(8px)' }}
                labelStyle={{ color: 'var(--text-muted)', marginBottom: '4px' }}
                itemStyle={{ color: '#00ff88', fontWeight: 'bold' }}
                formatter={(value) => [new Intl.NumberFormat(market?.locale || 'en-IN', { style: 'currency', currency: market?.currency || 'INR' }).format(value), 'Price']}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="loading-overlay" style={{ height: '350px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            No Data Available
          </div>
        )}
      </div>
    </div>
  );
}
