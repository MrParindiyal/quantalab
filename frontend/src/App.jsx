import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { Dashboard } from './pages/Dashboard';

import Trade from './pages/Trade';

// A simple wrapper to protect routes (mocked for now)
function ProtectedRoute({ children }) {
  // In a real app, you'd check context/state or localStorage for a JWT
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
  
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/trade" 
        element={
          <ProtectedRoute>
            <Trade />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

export default App;
