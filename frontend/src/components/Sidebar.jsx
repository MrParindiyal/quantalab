import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, PieChart, TrendingUp, GitCompare, LogOut, List, FlaskConical, RefreshCw, User as UserIcon } from 'lucide-react';
import './Sidebar.css';

export function Sidebar({ activeTab, setActiveTab, onLogout }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const username = localStorage.getItem('username') || 'User';

  const tabs = [
    { id: 'dashboard',   label: 'Dashboard',      icon: <LayoutDashboard size={20} /> },
    { id: 'portfolio',   label: 'Portfolio',       icon: <PieChart size={20} />       },
    { id: 'transactions',label: 'Transactions',    icon: <List size={20} />           },
    { id: 'compare',     label: 'Compare',         icon: <GitCompare size={20} />     },
    { id: 'predictions', label: 'AI Predictions',  icon: <TrendingUp size={20} />     },
    { id: 'backtest',    label: 'Backtesting',     icon: <FlaskConical size={20} />   },
  ];

  const fetchSidebarData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Using the consolidated summary route
      const res = await fetch('http://localhost:8000/api/portfolio?summary=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const result = await res.json();
        setData(result);
      }
    } catch (err) {
      console.error("Sidebar fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSidebarData();
  }, []);

  const stats = data?.summary || {};
  const isPositive = stats.total_pnl_pct >= 0;


  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <h2>QuantaLab</h2>
      </div>
      <nav className="sidebar-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => {
              // If we are currently on /trade, we need to navigate back to dashboard first
              if (window.location.pathname === '/trade') {
                navigate('/dashboard', { state: { initialTab: tab.id } });
              } else {
                setActiveTab(tab.id);
              }
            }}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
        
      </nav>
      <div className="sidebar-footer">
        {/* --- Personalized Info Section --- */}
        <div className="sidebar-user-stats">
          <div className="stats-header">
            <span>Market Value</span>
            <button className="mini-refresh" onClick={fetchSidebarData} disabled={loading}>
              <RefreshCw size={12} className={loading ? 'spin' : ''} />
            </button>
          </div>
          
          <div className="portfolio-value">
            ₹{stats.total_value?.toLocaleString('en-IN') || '0.00'}
            <span className={`pnl-badge ${isPositive ? 'up' : 'down'}`}>
              {isPositive ? '+' : ''}{stats.total_pnl_pct || 0}%
            </span>
          </div>

          <div className="cash-value">
            <span className="label">Cash:</span> ₹{stats.cash_balance?.toLocaleString('en-IN') || '0.00'}
          </div>

          <div className="user-profile">
            <UserIcon size={16} />
            <span>{username}</span>
          </div>
        </div>

        <button className="sidebar-tab logout" onClick={onLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}