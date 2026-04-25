import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { Loader2 } from 'lucide-react';
import { Card } from '../common/Card';

export function PredictionChart({ symbol, historicalData }) {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPrediction = async () => {
      if (!symbol) return;
      setLoading(true);
      setError('');
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:8000/api/predict/${symbol}?days=30`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Prediction failed');
        const data = await res.json();
        setForecast(data.forecast);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPrediction();
  }, [symbol]);

  if (!historicalData || historicalData.length === 0) return null;

  // We only want the last 30 days of historical data for context
  const recentHistory = historicalData.slice(-30).map(item => ({
    x: new Date(item.date).getTime(),
    y: item.price
  }));

  const forecastSeries = forecast ? forecast.map(item => ({
    x: new Date(item.date).getTime(),
    y: item.predicted_price
  })) : [];

  const options = {
    chart: {
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: false }
    },
    title: {
      text: '30-Day AI Forecast (Linear Regression)',
      style: { color: '#94a3b8' }
    },
    colors: ['#3b82f6', '#a855f7'],
    stroke: { width: 2, dashArray: [0, 4] },
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: '#94a3b8' } }
    },
    yaxis: {
      labels: { style: { colors: '#94a3b8' } }
    },
    grid: { borderColor: 'rgba(255,255,255,0.05)' },
    theme: { mode: 'dark' },
    legend: { position: 'top', horizontalAlign: 'right', labels: { colors: '#f8fafc' } }
  };

  return (
    <Card style={{ padding: '1.5rem' }}>
      {error && <div style={{ color: '#ef4444' }}>{error}</div>}
      {loading ? (
        <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 className="spin" size={32} />
        </div>
      ) : (
        <ReactApexChart
          options={options}
          series={[
            { name: 'Historical', data: recentHistory },
            { name: 'Predicted', data: forecastSeries }
          ]}
          type="line"
          height={350}
        />
      )}
    </Card>
  );
}
