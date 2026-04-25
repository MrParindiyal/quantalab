import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';
import { Card } from './common/Card';
import { Button } from './common/Button';
import { Input } from './common/Input';
import { Loader2 } from 'lucide-react';

export function Portfolio() {
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [symbol, setSymbol] = useState('');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPortfolio = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/portfolio', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPortfolio(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!symbol || !quantity || !price) return;
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await fetch('http://localhost:8000/api/portfolio', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          stock_symbol: symbol.toUpperCase(),
          quantity: parseFloat(quantity),
          average_price: parseFloat(price)
        })
      });
      setSymbol(''); setQuantity(''); setPrice('');
      await fetchPortfolio();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const pieSeries = portfolio.map(item => parseFloat(item.quantity) * parseFloat(item.average_price));
  const pieLabels = portfolio.map(item => item.stock_symbol);

  const pieOptions = {
    chart: { type: 'pie', background: 'transparent' },
    labels: pieLabels,
    theme: { mode: 'dark' },
    stroke: { show: false },
    legend: { position: 'bottom', labels: { colors: '#f8fafc' } }
  };

  return (
    <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 400px' }}>
        <Card style={{ padding: '1.5rem', height: '100%' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>Portfolio Allocation</h3>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center' }}><Loader2 className="spin" /></div>
          ) : portfolio.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No investments found.</p>
          ) : (
            <ReactApexChart options={pieOptions} series={pieSeries} type="pie" height={300} />
          )}
        </Card>
      </div>

      <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <Card style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Add Investment</h3>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input 
              placeholder="Symbol (e.g. AAPL)" 
              value={symbol} 
              onChange={e => setSymbol(e.target.value)} 
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Input 
                type="number" 
                placeholder="Quantity" 
                value={quantity} 
                onChange={e => setQuantity(e.target.value)} 
                step="any"
              />
              <Input 
                type="number" 
                placeholder="Avg Price" 
                value={price} 
                onChange={e => setPrice(e.target.value)} 
                step="any"
              />
            </div>
            <Button type="submit" disabled={submitting} variant="primary">
              {submitting ? <Loader2 className="spin" size={16} /> : 'Add to Portfolio'}
            </Button>
          </form>
        </Card>

        <Card style={{ padding: '1.5rem', flex: 1 }}>
          <h3 style={{ marginBottom: '1rem' }}>Holdings</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {portfolio.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem' }}>
                <span style={{ fontWeight: 600 }}>{p.stock_symbol}</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {p.quantity} @ {parseFloat(p.average_price).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
