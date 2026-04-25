import React from 'react';
import ReactApexChart from 'react-apexcharts';

export function CandlestickChart({ data, symbol }) {
  if (!data || data.length === 0) return null;

  // Format data for Candlestick
  const seriesData = data.map(item => ({
    x: new Date(item.date),
    y: [item.open, item.high, item.low, item.price] // price is close
  }));

  const volumeData = data.map(item => ({
    x: new Date(item.date),
    y: item.volume
  }));

  const ma50Data = data.map(item => ({
    x: new Date(item.date),
    y: item.ma50
  }));

  const ma200Data = data.map(item => ({
    x: new Date(item.date),
    y: item.ma200
  }));

  const candlestickOptions = {
    chart: {
      type: 'candlestick',
      id: 'candles',
      group: 'stock-charts',
      toolbar: { autoSelected: 'pan', show: false },
      background: 'transparent',
      animations: { enabled: false }
    },
    title: {
      text: `${symbol} Price`,
      align: 'left',
      style: { color: '#94a3b8' }
    },
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: '#94a3b8' } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: { style: { colors: '#94a3b8' } },
      tooltip: { enabled: true }
    },
    grid: { borderColor: 'rgba(255,255,255,0.05)' },
    theme: { mode: 'dark' },
    stroke: { width: [1, 2, 2] },
    colors: ['#00ff88', '#3b82f6', '#ef4444'],
    plotOptions: {
      candlestick: {
        colors: {
          upward: '#10b981',
          downward: '#ef4444'
        }
      }
    }
  };

  const volumeOptions = {
    chart: {
      type: 'bar',
      id: 'volume',
      group: 'stock-charts',
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: false }
    },
    colors: ['#3b82f6'],
    dataLabels: { enabled: false },
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: '#94a3b8' } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: { 
        style: { colors: '#94a3b8' },
        formatter: (val) => { return (val / 1000000).toFixed(1) + 'M' }
      }
    },
    grid: { borderColor: 'rgba(255,255,255,0.05)' },
    theme: { mode: 'dark' }
  };

  return (
    <div key={symbol} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ height: 350 }}>
        <ReactApexChart 
          options={candlestickOptions} 
          series={[
            { name: 'Price', type: 'candlestick', data: seriesData },
            { name: 'MA50', type: 'line', data: ma50Data },
            { name: 'MA200', type: 'line', data: ma200Data }
          ]} 
          type="line" 
          height={350} 
        />
      </div>
      <div style={{ height: 150 }}>
        <ReactApexChart 
          options={volumeOptions} 
          series={[{ name: 'Volume', data: volumeData }]} 
          type="bar" 
          height={150} 
        />
      </div>
    </div>
  );
}
