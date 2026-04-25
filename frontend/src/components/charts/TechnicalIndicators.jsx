import React from 'react';
import ReactApexChart from 'react-apexcharts';

export function TechnicalIndicators({ data }) {
  if (!data || data.length === 0) return null;

  const dates = data.map(item => new Date(item.date).getTime());

  // RSI Data
  const rsiData = data.map((item, i) => ({ x: dates[i], y: item.rsi }));
  
  // MACD Data
  const macdData = data.map((item, i) => ({ x: dates[i], y: item.macd }));
  const macdSignal = data.map((item, i) => ({ x: dates[i], y: item.macd_signal }));
  const macdHist = data.map((item, i) => ({ x: dates[i], y: item.macd_hist }));

  // Bollinger Bands Data
  const bbHigh = data.map((item, i) => ({ x: dates[i], y: item.bb_high }));
  const bbMid = data.map((item, i) => ({ x: dates[i], y: item.bb_mid }));
  const bbLow = data.map((item, i) => ({ x: dates[i], y: item.bb_low }));
  const priceData = data.map((item, i) => ({ x: dates[i], y: item.price }));

  const commonOptions = {
    chart: {
      background: 'transparent',
      toolbar: { show: false },
      animations: { enabled: false }
    },
    xaxis: {
      type: 'datetime',
      labels: { style: { colors: '#94a3b8' } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      labels: { style: { colors: '#94a3b8' } }
    },
    grid: { borderColor: 'rgba(255,255,255,0.05)' },
    theme: { mode: 'dark' },
    stroke: { width: 2 }
  };

  const rsiOptions = {
    ...commonOptions,
    title: { text: 'RSI (14)', style: { color: '#94a3b8' } },
    colors: ['#a855f7'],
    yaxis: { ...commonOptions.yaxis, min: 0, max: 100, tickAmount: 5 },
    annotations: {
      yaxis: [
        { y: 70, borderColor: '#ef4444', strokeDashArray: 4, label: { text: 'Overbought' } },
        { y: 30, borderColor: '#10b981', strokeDashArray: 4, label: { text: 'Oversold' } }
      ]
    }
  };

  const macdOptions = {
    ...commonOptions,
    title: { text: 'MACD', style: { color: '#94a3b8' } },
    colors: ['#3b82f6', '#ef4444', '#10b981'],
    stroke: { width: [2, 2, 0] }
  };

  const bbOptions = {
    ...commonOptions,
    title: { text: 'Bollinger Bands', style: { color: '#94a3b8' } },
    colors: ['#10b981', '#3b82f6', '#ef4444', '#a855f7'],
    stroke: { width: [1, 1, 1, 2] }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ height: 200 }}>
        <ReactApexChart 
          options={rsiOptions} 
          series={[{ name: 'RSI', data: rsiData }]} 
          type="line" 
          height={200} 
        />
      </div>
      <div style={{ height: 250 }}>
        <ReactApexChart 
          options={macdOptions} 
          series={[
            { name: 'MACD', type: 'line', data: macdData },
            { name: 'Signal', type: 'line', data: macdSignal },
            { name: 'Histogram', type: 'bar', data: macdHist }
          ]} 
          type="line" 
          height={250} 
        />
      </div>
      <div style={{ height: 300 }}>
        <ReactApexChart 
          options={bbOptions} 
          series={[
            { name: 'BB High', type: 'line', data: bbHigh },
            { name: 'BB Mid', type: 'line', data: bbMid },
            { name: 'BB Low', type: 'line', data: bbLow },
            { name: 'Price', type: 'line', data: priceData }
          ]} 
          type="line" 
          height={300} 
        />
      </div>
    </div>
  );
}
