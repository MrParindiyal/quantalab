import React, { useState, useEffect } from 'react';
import { Card } from './common/Card';
import { Loader2 } from 'lucide-react';

export function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTransactions = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/transactions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const data = await res.json();
      setTransactions(data);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  return (
    <Card style={{ padding: '1.5rem' }}>
      <h3 style={{ marginBottom: '1.5rem' }}>Transaction History</h3>
      {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem' }}>{error}</div>}
      
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem 0' }}>
          <Loader2 className="spin" size={32} />
        </div>
      ) : transactions.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 0' }}>
          No transactions found.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '1rem 0.5rem', fontWeight: 500 }}>Symbol</th>
                <th style={{ padding: '1rem 0.5rem', fontWeight: 500 }}>Type</th>
                <th style={{ padding: '1rem 0.5rem', fontWeight: 500 }}>Quantity</th>
                <th style={{ padding: '1rem 0.5rem', fontWeight: 500 }}>Price</th>
                <th style={{ padding: '1rem 0.5rem', fontWeight: 500 }}>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, idx) => (
                <tr key={tx.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>{tx.stock_symbol}</td>
                  <td style={{ 
                    padding: '1rem 0.5rem', 
                    color: tx.transaction_type?.toLowerCase() === 'buy' ? 'var(--success)' : 'var(--danger)',
                    textTransform: 'uppercase',
                    fontWeight: 600
                  }}>
                    {tx.transaction_type}
                  </td>
                  <td style={{ padding: '1rem 0.5rem' }}>{tx.quantity}</td>
                  <td style={{ padding: '1rem 0.5rem' }}>${parseFloat(tx.price).toFixed(2)}</td>
                  <td style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>
                    {new Date(tx.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
