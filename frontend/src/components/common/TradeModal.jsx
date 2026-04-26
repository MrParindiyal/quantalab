import React, { useState, useRef, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import './TradeModal.css';
import { useToast } from '../../context/ToastContext';

export function TradeModal({ isOpen, onClose, symbol, stockData, type }) {
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const modalOverlayRef = useRef();
  const showToast = useToast();
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setLoading(false);
    }
  }, [isOpen, type]); 
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (modalOverlayRef.current === e.target) {
      onClose();
    }
  };

  const handleExecuteTrade = async () => {
    // 1. Validation check (safety first)
    if (quantity <= 0) return;

    setLoading(true);
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`http://localhost:8000/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          stock_symbol: symbol,
          transaction_type: type, // 'buy' or 'sell'
          quantity: parseFloat(quantity),
          price: currentPrice // Backend calculates this, but schema allows it
        })
      });

      const data = await response.json();

      if (!response.ok) {
        showToast(data.detail || 'Transaction failed', 'error');
        throw new Error();
        }
      // 2. Success Feedback
      showToast(`Successfully ${type === 'buy' ? 'bought' : 'sold'} ${quantity} shares of ${symbol} at $${data.executed_price}`, 'success');
      
      onClose(); // Close the modal on success
      
      // 3. Optional: Trigger a dashboard refresh
      // If you have a refresh function passed as a prop, call it here
      // window.location.reload(); // Simple but aggressive way to update balance/portfolio

    } catch (err) {
      console.error('Trade Error:', err);
    //   alert(err.message); // Show the specific backend error to the user
    // showToast(err.message || 'A network error occurred. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const currentPrice = stockData?.metrics?.currentPrice || 0;
  const isBuy = type === 'buy';
  const increments = [5, 10, 20, 50];

  return (
    <div 
      className="modal-overlay" 
      ref={modalOverlayRef} 
      onClick={handleOverlayClick}
    >
      <div className="modal-content">
        <button className="close-btn" onClick={onClose}><X size={20} /></button>
        
        <div className="modal-body">
          {/* Left Side: Stats */}
          <div className="modal-stats-section">
            <div className="price-header">
              <span className="symbol-tag">{symbol}</span>
              <h2>${currentPrice.toLocaleString()}</h2>
              <p className="label">Current Market Price</p>
            </div>

            <div className="stats-list">
              <div className="stat-item">
                <span>24h Change</span>
                <span className={stockData?.metrics?.changePct >= 0 ? 'pos' : 'neg'}>
                  {stockData?.metrics?.changePct}%
                </span>
              </div>
              <div className="stat-item">
                <span>7d Performance</span>
                <span className="pos">+2.4%</span>
              </div>
              <div className="stat-item">
                <span>1m Performance</span>
                <span className="neg">-1.1%</span>
              </div>
            </div>
          </div>

          {/* Right Side: Execution */}
          <div className="modal-action-section">
            <h3>{isBuy ? 'Buy' : 'Sell'} Order</h3>
            
            <div className="input-group">
              <label>Quantity</label>
              <input 
                type="number" 
                value={quantity} 
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
              />
            </div>

            <div className="pill-container">
              {increments.map(val => (
                <button 
                  key={val} 
                  className="increment-pill"
                  onClick={() => setQuantity(prev => prev + val)}
                >
                  +{val}
                </button>
              ))}
            </div>

            {/* Conditional Sell Message */}
            {!isBuy && (
              <p className="inventory-note">
                Note: Orders exceeding owned quantity will fail.  
                View <strong>Portfolio</strong> to verify ownership.
              </p>
            )}
            {/* Conditional Sell Message */}
            {isBuy && (
              <p className="inventory-note">
                Note: Orders exceeding balance will fail.
                View <strong>Balance</strong> to verify ownership.
              </p>
            )}

            <div className="total-preview">
              <span>Estimated Total:</span>
              <span>${(currentPrice * quantity).toLocaleString()}</span>
            </div>

            <button 
                className={`execute-btn ${isBuy ? 'buy' : 'sell'}`}
                onClick={handleExecuteTrade}
                disabled={loading || quantity <= 0}
                >
                {loading ? (
                    <Loader2 size={20} className="spin" />
                ) : (
                    `Confirm ${isBuy ? 'Purchase' : 'Sale'}`
                )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}