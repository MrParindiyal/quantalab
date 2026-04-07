import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { LogOut, ArrowUpRight, TrendingDown } from 'lucide-react';
import './Dashboard.css';

export function Dashboard() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');

  useEffect(() => {
    const user = localStorage.getItem('username');
    if (user) {
      setUsername(user);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('username');
    navigate('/');
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-title">
          <h2>QuantaLab Dashboard</h2>
          <span className="user-badge">Welcome, {username}</span>
        </div>
        <Button variant="secondary" onClick={handleLogout}>
          <LogOut size={16} /> Logout
        </Button>
      </header>

      <main className="dashboard-main">
        {/* Placeholder Metrics */}
        <div className="metrics-grid">
          <Card className="metric-card">
            <h3 className="metric-title">Portfolio Value</h3>
            <div className="metric-value">$124,500.00</div>
            <div className="metric-change positive">
              <ArrowUpRight size={16} /> +2.4% today
            </div>
          </Card>
          <Card className="metric-card">
            <h3 className="metric-title">S&P 500</h3>
            <div className="metric-value">4,123.45</div>
            <div className="metric-change negative">
              <TrendingDown size={16} /> -0.8% today
            </div>
          </Card>
          <Card className="metric-card">
            <h3 className="metric-title">Active Algorithms</h3>
            <div className="metric-value">3</div>
            <div className="metric-change neutral">
              No change
            </div>
          </Card>
        </div>

        {/* Chart Area */}
        <div className="chart-section">
          <Card className="chart-card">
            <div className="chart-header">
              <h3>Market Overview</h3>
              <div className="chart-controls">
                <Button variant="secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>1D</Button>
                <Button variant="primary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>1W</Button>
                <Button variant="secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}>1M</Button>
              </div>
            </div>
            <div className="chart-placeholder">
              [Recharts / Plotly Line Chart Placeholder]
              <br />
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Stock data visualization migrating from Streamlit...
              </span>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
