import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import './Toast.css';

const ICONS = {
  success: <CheckCircle size={18} />,
  error: <AlertCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
};

export function Toast({ id, message, type = 'info', onClose }) {
  const [timeLeft, setTimeLeft] = useState(5000);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 100);
    }, 100);

    if (timeLeft <= 0) {
      onClose(id);
    }

    return () => clearInterval(timer);
  }, [timeLeft, isPaused, id, onClose]);

  return (
    <div 
      className={`toast-card ${type}`}
      onMouseEnter={() => { setIsPaused(true); setTimeLeft(5000); }}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="toast-icon">{ICONS[type]}</div>
      <div className="toast-content">{message}</div>
      <button className="toast-close" onClick={() => onClose(id)}>
        <X size={16} />
      </button>
      <div 
        className="toast-progress" 
        style={{ width: `${(timeLeft / 5000) * 100}%` }} 
      />
    </div>
  );
}