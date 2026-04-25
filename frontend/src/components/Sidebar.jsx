import React from 'react';
import { LayoutDashboard, PieChart, TrendingUp, GitCompare, Settings, LogOut, List } from 'lucide-react';
import './Sidebar.css';

export function Sidebar({ activeTab, setActiveTab, onLogout }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { id: 'portfolio', label: 'Portfolio', icon: <PieChart size={20} /> },
    { id: 'transactions', label: 'Transactions', icon: <List size={20} /> },
    { id: 'compare', label: 'Compare', icon: <GitCompare size={20} /> },
    { id: 'predictions', label: 'AI Predictions', icon: <TrendingUp size={20} /> },
  ];

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
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button className="sidebar-tab" onClick={onLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}
