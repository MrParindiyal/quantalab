import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { LineChart, TrendingUp } from 'lucide-react';
import './LandingPage.css';

// Simple mock DB to persist within session for demonstration
const mockDB = {
  users: [
    { username: 'admin', password: 'password123' },
    { username: 'user', password: 'password' }
  ]
};

export function LandingPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    
    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    const user = mockDB.users.find(u => u.username === username);
    
    if (!user) {
      setError('User not registered.');
      return;
    }
    
    if (user.password !== password) {
      setError('Incorrect password.');
      return;
    }
    
    // Success scenario
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('username', username);
    setSuccessMsg('Login successful! Redirecting...');
    
    setTimeout(() => {
      navigate('/dashboard');
    }, 1000);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    const userExists = mockDB.users.find(u => u.username === username);
    
    if (userExists) {
      setError('Username already registered.');
      return;
    }

    // Register new user
    mockDB.users.push({ username, password });
    setSuccessMsg('Registration successful! You can now log in.');
  };

  return (
    <div className="landing-container">
      <div className="landing-content">
        <div className="hero-section">
          <div className="logo">
            <TrendingUp size={48} color="var(--primary)" />
            <h1>QuantaLab</h1>
          </div>
          <p className="subtitle">Advanced AI Stock Market Dashboard & Simulator</p>
          <div className="features">
            <div className="feature-item">
              <LineChart size={24} />
              <span>Real-time technical analysis</span>
            </div>
            <div className="feature-item">
              <span style={{ fontSize: '1.5rem' }}>🧠</span>
              <span>Machine Learning predictions</span>
            </div>
            <div className="feature-item">
              <span style={{ fontSize: '1.5rem' }}>🧪</span>
              <span>Algorithm backtesting environment</span>
            </div>
          </div>
        </div>

        <div className="auth-section">
          <Card className="auth-card">
            <h2>Welcome Back</h2>
            <p className="auth-desc">Sign in or create an account to access the dashboard</p>
            
            <form className="auth-form">
              <Input 
                label="Username" 
                placeholder="Enter your username" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <Input 
                label="Password" 
                type="password"
                placeholder="Enter your password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              
              {error && <div className="form-alert error">{error}</div>}
              {successMsg && <div className="form-alert success">{successMsg}</div>}
              
              <div className="auth-buttons">
                <Button onClick={handleLogin} variant="primary" style={{ flex: 1 }}>
                  Login
                </Button>
                <Button onClick={handleRegister} variant="secondary" style={{ flex: 1 }}>
                  Register
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
