import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { Loader2, TrendingUp, TrendingDown, Target, Zap } from 'lucide-react';
import { Card } from '../common/Card';

export function PredictionChart({ symbol, historicalData, days = 30 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPrediction = async () => {
      if (!symbol) return;
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:8000/api/predict/${symbol}?days=${days}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Prediction failed');
        const result = await res.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPrediction();
  }, [symbol, days]);

  if (!historicalData || historicalData.length === 0) return null;

  const recentHistory = historicalData.slice(-30).map(item => ({
    x: new Date(item.date).getTime(),
    y: item.price
  }));

  const forecast = data?.forecast || [];
  
  const forecastSeries = forecast.map(item => ({
    x: new Date(item.date).getTime(),
    y: item.predicted_price
  }));

  const confidenceRange = forecast.map(item => ({
    x: new Date(item.date).getTime(),
    y: [item.low, item.high]
  }));

  const options = {
    chart: {
      type: 'line',
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: true, easing: 'easeinout', speed: 800 }
    },
    colors: ['#3b82f6', '#a855f7', 'rgba(168, 85, 247, 0.15)'],
    stroke: {
      width: [2, 3, 0],
      curve: 'smooth',
      dashArray: [0, 5, 0]
    },
    fill: {
      type: ['solid', 'solid', 'solid'],
    },
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: '#94a3b8', fontFamily: 'Inter' } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: { 
        style: { colors: '#94a3b8', fontFamily: 'Inter' },
        formatter: (val) => `$${val.toFixed(2)}`
      }
    },
    grid: { 
      borderColor: 'rgba(255,255,255,0.05)',
      strokeDashArray: 4
    },
    tooltip: {
      theme: 'dark',
      x: { format: 'dd MMM yyyy' }
    },
    legend: { 
      position: 'top', 
      horizontalAlign: 'right', 
      labels: { colors: '#f8fafc' },
      markers: { radius: 12 }
    }
  };

  const series = [
    { name: 'Historical', type: 'line', data: recentHistory },
    { name: 'AI Forecast', type: 'line', data: forecastSeries },
    { name: 'Confidence Interval', type: 'rangeArea', data: confidenceRange }
  ];

  const metrics = data?.metrics;
  const tmr = metrics?.tomorrow;
  const tmrUp = tmr?.change != null && tmr.change >= 0;

  return (
    <div className="prediction-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Tomorrow's Price Hero Card ── */}
      {tmr && !loading && (
        <div style={{
          background: tmrUp
            ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(6,182,212,0.08))'
            : 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(168,85,247,0.08))',
          border: `1px solid ${tmrUp ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
          borderRadius: '1.25rem',
          padding: '2rem 2.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1.5rem',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Glow blob */}
          <div style={{
            position: 'absolute', top: '-40px', right: '-40px',
            width: 180, height: 180, borderRadius: '50%',
            background: tmrUp ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            filter: 'blur(60px)', pointerEvents: 'none'
          }} />

          <div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
              🤖 &nbsp;Tomorrow's AI Price Target &nbsp;·&nbsp; {tmr.date}
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '3rem', fontWeight: '800', color: '#f8fafc', letterSpacing: '-1px' }}>
                ₹{tmr.predicted_price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              <span style={{
                fontSize: '1.25rem', fontWeight: '700',
                color: tmrUp ? '#10b981' : '#ef4444'
              }}>
                {tmrUp ? '▲' : '▼'} {Math.abs(tmr.change_pct)}%
              </span>
            </div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              vs Today's Close:&nbsp;
              <span style={{ color: '#94a3b8' }}>
                ₹{metrics.current_price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
              &nbsp;·&nbsp;
              {tmrUp ? '+' : ''}₹{tmr.change?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* Range */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 180 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expected Range</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>High</span>
                <span style={{ fontWeight: '700', color: '#10b981' }}>
                  ₹{tmr.high?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {/* Mini range bar */}
              <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: '20%', right: '20%',
                  height: '100%', borderRadius: 2,
                  background: tmrUp ? 'linear-gradient(90deg,#10b981,#06b6d4)' : 'linear-gradient(90deg,#ef4444,#a855f7)'
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Low</span>
                <span style={{ fontWeight: '700', color: '#ef4444' }}>
                  ₹{tmr.low?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <Card style={{ padding: '1.5rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#f8fafc', marginBottom: '0.25rem' }}>AI Neural Forecast</h3>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>Predictive analysis based on Random Forest Regressor</p>
          </div>
          {metrics && (
            <div style={{ 
              padding: '0.5rem 1rem', 
              background: metrics.trend === 'Bullish' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: metrics.trend === 'Bullish' ? '#6ee7b7' : '#fca5a5',
              borderRadius: '2rem',
              fontSize: '0.875rem',
              fontWeight: '600',
              border: `1px solid ${metrics.trend === 'Bullish' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
            }}>
              {metrics.trend} Signal
            </div>
          )}
        </div>

        {error && <div style={{ color: '#ef4444', marginBottom: '1rem' }}>{error}</div>}
        
        {loading ? (
          <div style={{ height: 350, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <Loader2 className="spin" size={40} color="#3b82f6" />
            <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Training model on 2-year historical data...</p>
          </div>
        ) : (
          <ReactApexChart
            options={options}
            series={series}
            type="line"
            height={350}
          />
        )}
      </Card>

      {/* Stats Dashboard */}
      {metrics && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ 
            background: 'rgba(30, 41, 59, 0.5)', 
            padding: '1.25rem', 
            borderRadius: '1rem', 
            border: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{ padding: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '0.75rem', color: '#3b82f6' }}>
              <Zap size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Exp. 30D Return</p>
              <h4 style={{ fontSize: '1.25rem', color: metrics.expected_return_30d >= 0 ? '#10b981' : '#ef4444' }}>
                {metrics.expected_return_30d >= 0 ? '+' : ''}{metrics.expected_return_30d}%
              </h4>
            </div>
          </div>

          <div style={{ 
            background: 'rgba(30, 41, 59, 0.5)', 
            padding: '1.25rem', 
            borderRadius: '1rem', 
            border: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{ padding: '0.75rem', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '0.75rem', color: '#a855f7' }}>
              <Target size={24} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Model Confidence</p>
              <h4 style={{ fontSize: '1.25rem', color: '#f8fafc' }}>{metrics.confidence_score}%</h4>
            </div>
          </div>

          <div style={{ 
            background: 'rgba(30, 41, 59, 0.5)', 
            padding: '1.25rem', 
            borderRadius: '1rem', 
            border: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}>
            <div style={{ 
              padding: '0.75rem', 
              background: metrics.trend === 'Bullish' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
              borderRadius: '0.75rem', 
              color: metrics.trend === 'Bullish' ? '#10b981' : '#ef4444' 
            }}>
              {metrics.trend === 'Bullish' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Market Bias</p>
              <h4 style={{ fontSize: '1.25rem', color: '#f8fafc' }}>{metrics.trend}</h4>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
