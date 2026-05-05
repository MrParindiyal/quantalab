import React, { useState } from 'react';
import ReactApexChart from 'react-apexcharts';
import { Loader2, Play, TrendingUp, TrendingDown, Trophy, BarChart3, Target, Zap, AlertTriangle } from 'lucide-react';
import { Card } from './common/Card';

const MARKETS = {
  INDIA: {
    name: '🇮🇳 India', currency: '₹',
    tickers: {
      'RELIANCE.NS':'Reliance','TCS.NS':'TCS','INFY.NS':'Infosys','HDFCBANK.NS':'HDFC Bank',
      'ICICIBANK.NS':'ICICI Bank','BHARTIARTL.NS':'Airtel','ITC.NS':'ITC',
      'LT.NS':'L&T','SBIN.NS':'SBI','HINDUNILVR.NS':'HUL'
    }
  },
  US: {
    name: '🇺🇸 US', currency: '$',
    tickers: {
      'AAPL':'Apple','MSFT':'Microsoft','GOOGL':'Alphabet','AMZN':'Amazon',
      'NVDA':'NVIDIA','META':'Meta','TSLA':'Tesla','BRK-B':'Berkshire',
      'LLY':'Eli Lilly','V':'Visa'
    }
  },
  EU: {
    name: '🇪🇺 EU', currency: '€',
    tickers: {
      'ASML.AS':'ASML','NESN.SW':'Nestlé','MC.PA':'LVMH','SAP.DE':'SAP',
      'SIE.DE':'Siemens','NOVN.SW':'Novartis','AZN.L':'AstraZeneca',
      'HSBA.L':'HSBC','SHEL.L':'Shell','ULVR.L':'Unilever'
    }
  }
};

const STRATEGIES = [
  { id:'sma_crossover', name:'SMA Crossover', description:'Buy when MA20 crosses above MA50. Sell on reverse.', icon:'📈', color:'#3b82f6' },
  { id:'rsi',           name:'RSI Reversion',  description:'Buy when RSI < 30 (oversold). Sell when RSI > 70.', icon:'🔄', color:'#a855f7' },
  { id:'macd',          name:'MACD Signal',    description:'Buy on MACD bullish cross. Sell on bearish cross.', icon:'⚡', color:'#10b981' }
];

const PERIODS = [
  { label:'6M', value:'6mo' },{ label:'1Y', value:'1y' },
  { label:'2Y', value:'2y' },{ label:'5Y', value:'5y' }
];

const fmt = (v,d=2) => v!=null ? Number(v).toLocaleString('en-IN',{minimumFractionDigits:d,maximumFractionDigits:d}) : '—';

export function Backtest() {
  const [market,   setMarket]   = useState('INDIA');
  const [symbol,   setSymbol]   = useState('RELIANCE.NS');
  const [strategy, setStrategy] = useState('sma_crossover');
  const [period,   setPeriod]   = useState('1y');
  const [capital,  setCapital]  = useState(100000);
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);
  const [error,    setError]    = useState('');

  const cur = MARKETS[market].currency;

  const handleMarketChange = (mk) => {
    setMarket(mk);
    setSymbol(Object.keys(MARKETS[mk].tickers)[0]);
    setResult(null);
  };

  const runBacktest = async () => {
    if (!symbol) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(
        `http://localhost:8000/api/backtest?symbol=${symbol}&strategy=${strategy}&period=${period}&capital=${capital}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail||'Failed'); }
      setResult(await res.json());
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  const m = result?.metrics;
  const isPositive = (m?.total_return ?? 0) >= 0;
  const beatMarket = (m?.alpha ?? 0) > 0;

  // ── Equity curve ──────────────────────────────────────────────────────
  const ec = result?.equity_curve ?? [];
  const ecX = ec.map(e => new Date(e.date).getTime());
  const ecY = ec.map(e => e.value);
  const bhY = ecX.map((_,i) => {
    if(!m) return 0;
    const t = i/(ecX.length-1||1);
    return m.initial_capital + m.initial_capital*(m.buy_hold_return/100)*t;
  });

  // Annotate BUY/SELL points on the equity curve
  const tradeAnnotations = (result?.trades??[]).map(t => ({
    x: new Date(t.date).getTime(),
    strokeDashArray: 0,
    borderColor: t.action==='BUY' ? '#10b981' : '#ef4444',
    label: {
      style: { color:'#fff', background: t.action==='BUY' ? '#10b981' : '#ef4444', fontSize:'11px', padding:{top:4,bottom:4,left:6,right:6} },
      text: `${t.action} ${cur}${fmt(t.price,0)}`
    }
  }));

  const equityOptions = {
    chart: { type:'area', background:'transparent', toolbar:{show:false}, animations:{enabled:true,speed:700}, zoom:{enabled:false} },
    colors: ['#3b82f6','#64748b'],
    stroke: { width:[2.5,1.5], curve:'smooth', dashArray:[0,6] },
    fill: {
      type:'gradient',
      gradient:{ type:'vertical', shadeIntensity:1, opacityFrom:[0.3,0.05], opacityTo:[0.02,0.0], stops:[0,100] }
    },
    xaxis: {
      type:'datetime',
      labels:{ style:{colors:'#64748b',fontFamily:'Inter'}, datetimeUTC:false },
      axisBorder:{show:false}, axisTicks:{show:false}
    },
    yaxis: {
      labels:{
        style:{colors:'#64748b',fontFamily:'Inter'},
        formatter: v => `${cur}${(v/1000).toFixed(0)}k`
      }
    },
    grid:{ borderColor:'rgba(255,255,255,0.04)', strokeDashArray:4 },
    tooltip:{
      theme:'dark',
      shared:true, intersect:false,
      x:{ format:'dd MMM yyyy' },
      y:{ formatter: v => `${cur}${fmt(v)}` }
    },
    legend:{
      position:'top', horizontalAlign:'right',
      labels:{colors:'#f8fafc'},
      markers:{width:12,height:3,radius:0}
    },
    annotations: { xaxis: tradeAnnotations.slice(0,10) },  // limit annotations for clarity
    markers: { size:0 }
  };

  const equitySeries = [
    { name:`Strategy (${result?.strategy??''})`, data: ecX.map((x,i)=>({x,y:ecY[i]})) },
    { name:'Buy & Hold Baseline',                data: ecX.map((x,i)=>({x,y:bhY[i]})) }
  ];

  // Final value labels
  const lastStrategy = ecY[ecY.length-1];
  const lastBH       = bhY[bhY.length-1];

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'1.5rem'}}>

      {/* Header */}
      <div>
        <h2 style={{fontSize:'1.75rem',fontWeight:'700',marginBottom:'0.25rem'}}>Strategy Backtesting</h2>
        <p style={{color:'#94a3b8',fontSize:'0.9rem'}}>Simulate real strategies on historical data · Does it beat buy &amp; hold?</p>
      </div>

      {/* Controls Card */}
      <Card style={{padding:'1.75rem'}}>

        {/* Row 1: Market | Company | Capital | Period */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'1.25rem',marginBottom:'1.5rem'}}>

          {/* Market Selector */}
          <div style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
            <label style={LS}>Market</label>
            <div style={{display:'flex',gap:'0.4rem'}}>
              {Object.entries(MARKETS).map(([k,v])=>(
                <button key={k} onClick={()=>handleMarketChange(k)} style={{
                  flex:1, padding:'0.5rem 0.4rem', borderRadius:'0.5rem', cursor:'pointer', fontSize:'0.8rem',
                  border:'1px solid rgba(255,255,255,0.1)',
                  background: market===k ? 'rgba(59,130,246,0.2)' : 'rgba(30,41,59,0.5)',
                  color: market===k ? '#60a5fa' : '#94a3b8',
                  fontWeight: market===k ? '600' : '400', transition:'all 0.15s'
                }}>{v.name}</button>
              ))}
            </div>
          </div>

          {/* Company Dropdown */}
          <div style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
            <label style={LS}>Company</label>
            <select value={symbol} onChange={e=>{setSymbol(e.target.value);setResult(null);}} style={IS}>
              {Object.entries(MARKETS[market].tickers).map(([ticker,name])=>(
                <option key={ticker} value={ticker}>{name} ({ticker})</option>
              ))}
            </select>
          </div>

          {/* Capital */}
          <div style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
            <label style={LS}>Capital ({cur})</label>
            <input type="number" value={capital} onChange={e=>setCapital(Number(e.target.value))}
              min={1000} step={10000} style={IS} />
          </div>

          {/* Period */}
          <div style={{display:'flex',flexDirection:'column',gap:'0.4rem'}}>
            <label style={LS}>Period</label>
            <div style={{display:'flex',gap:'0.4rem'}}>
              {PERIODS.map(p=>(
                <button key={p.value} onClick={()=>setPeriod(p.value)} style={{
                  flex:1, padding:'0.5rem 0', borderRadius:'0.5rem', cursor:'pointer', fontSize:'0.8rem',
                  border:'1px solid rgba(255,255,255,0.1)',
                  background: period===p.value ? 'rgba(59,130,246,0.2)' : 'rgba(30,41,59,0.5)',
                  color: period===p.value ? '#60a5fa' : '#94a3b8',
                  fontWeight: period===p.value ? '600' : '400', transition:'all 0.15s'
                }}>{p.label}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Strategy Picker */}
        <div style={{marginBottom:'1.5rem'}}>
          <label style={{...LS,display:'block',marginBottom:'0.5rem'}}>Strategy</label>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'0.75rem'}}>
            {STRATEGIES.map(s=>(
              <button key={s.id} onClick={()=>setStrategy(s.id)} style={{
                padding:'1rem 1.25rem', borderRadius:'0.75rem', cursor:'pointer', textAlign:'left',
                border: strategy===s.id ? `1px solid ${s.color}55` : '1px solid rgba(255,255,255,0.07)',
                background: strategy===s.id ? `${s.color}15` : 'rgba(30,41,59,0.5)',
                transition:'all 0.2s'
              }}>
                <div style={{fontSize:'1.25rem',marginBottom:'0.35rem'}}>{s.icon}</div>
                <div style={{fontWeight:'600',color:strategy===s.id?'#f8fafc':'#94a3b8',marginBottom:'0.2rem'}}>{s.name}</div>
                <div style={{fontSize:'0.78rem',color:'#64748b',lineHeight:1.4}}>{s.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Run */}
        <button onClick={runBacktest} disabled={loading} style={{
          display:'flex',alignItems:'center',gap:'0.6rem',
          padding:'0.85rem 2rem',borderRadius:'0.75rem',cursor:'pointer',
          background: loading ? 'rgba(59,130,246,0.3)' : 'linear-gradient(135deg,#3b82f6,#2563eb)',
          border:'none',color:'white',fontWeight:'700',fontSize:'1rem',
          boxShadow: loading ? 'none' : '0 4px 15px rgba(59,130,246,0.35)',
          transition:'all 0.2s'
        }}>
          {loading ? <><Loader2 size={18} className="spin"/>Running Simulation…</> : <><Play size={18}/>Run Backtest</>}
        </button>
      </Card>

      {/* Error */}
      {error && (
        <div style={{padding:'1rem 1.25rem',background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:'0.75rem',color:'#fca5a5',display:'flex',alignItems:'center',gap:'0.75rem'}}>
          <AlertTriangle size={18}/>{error}
        </div>
      )}

      {/* Results */}
      {result && !loading && (<>

        {/* Summary Banner */}
        <div style={{
          padding:'1.5rem 2rem',borderRadius:'1.25rem',display:'flex',alignItems:'center',gap:'1.5rem',flexWrap:'wrap',
          background: isPositive ? 'linear-gradient(135deg,rgba(16,185,129,0.12),rgba(6,182,212,0.06))' : 'linear-gradient(135deg,rgba(239,68,68,0.12),rgba(168,85,247,0.06))',
          border:`1px solid ${isPositive?'rgba(16,185,129,0.25)':'rgba(239,68,68,0.25)'}`
        }}>
          <div style={{fontSize:'2.5rem'}}>{beatMarket?'🏆':'📊'}</div>
          <div>
            <p style={{color:'#94a3b8',fontSize:'0.8rem',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:'0.25rem'}}>
              {result.strategy} · {result.symbol} · {period}
            </p>
            <h3 style={{fontSize:'1.5rem',fontWeight:'800',color:isPositive?'#10b981':'#ef4444',marginBottom:'0.2rem'}}>
              {isPositive?'+':''}{m.total_return}% Strategy Return
            </h3>
            <p style={{color:'#64748b',fontSize:'0.875rem'}}>
              {cur}{fmt(m.initial_capital)} → {cur}{fmt(m.final_capital)}&nbsp;·&nbsp;
              Buy &amp; Hold: {m.buy_hold_return>=0?'+':''}{m.buy_hold_return}%&nbsp;·&nbsp;
              <span style={{color:beatMarket?'#10b981':'#ef4444',fontWeight:'600'}}>
                Alpha: {m.alpha>=0?'+':''}{m.alpha}%
              </span>
            </p>
          </div>
        </div>

        {/* Metric Cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))',gap:'1rem'}}>
          {[
            {label:'Total Trades', value:m.total_trades,                          icon:<BarChart3 size={20}/>, color:'#3b82f6'},
            {label:'Win Rate',     value:`${m.win_rate}%`,                        icon:<Trophy size={20}/>,   color:'#f59e0b'},
            {label:'Sharpe Ratio', value:m.sharpe_ratio,                          icon:<Zap size={20}/>,      color:'#a855f7'},
            {label:'Max Drawdown', value:`${m.max_drawdown}%`,                    icon:<TrendingDown size={20}/>, color:'#ef4444'},
            {label:'Alpha',        value:`${m.alpha>=0?'+':''}${m.alpha}%`,       icon:<Target size={20}/>,   color:m.alpha>=0?'#10b981':'#ef4444'}
          ].map(c=>(
            <div key={c.label} style={{background:'rgba(30,41,59,0.6)',padding:'1.1rem 1.25rem',borderRadius:'0.9rem',border:'1px solid rgba(255,255,255,0.05)'}}>
              <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'0.5rem'}}>
                <span style={{color:c.color}}>{c.icon}</span>
                <span style={{fontSize:'0.7rem',color:'#64748b',textTransform:'uppercase',letterSpacing:'0.06em'}}>{c.label}</span>
              </div>
              <div style={{fontSize:'1.4rem',fontWeight:'700',color:'#f8fafc'}}>{c.value}</div>
            </div>
          ))}
        </div>

        {/* Equity Curve — improved */}
        <Card style={{padding:'1.5rem'}}>
          <div style={{marginBottom:'1rem'}}>
            <h3 style={{fontSize:'1.1rem',fontWeight:'600',color:'#f8fafc',marginBottom:'0.25rem'}}>Portfolio Equity Curve</h3>
            <p style={{color:'#64748b',fontSize:'0.8rem'}}>
              How your capital grew over time. Vertical lines show actual trade entries.
              <span style={{marginLeft:'1rem',color:'#10b981'}}>▐ BUY</span>
              <span style={{marginLeft:'0.75rem',color:'#ef4444'}}>▐ SELL</span>
            </p>
          </div>

          {/* End value comparison pills */}
          {lastStrategy!=null && lastBH!=null && (
            <div style={{display:'flex',gap:'1rem',marginBottom:'1rem',flexWrap:'wrap'}}>
              <div style={{padding:'0.4rem 0.9rem',borderRadius:'1rem',background:'rgba(59,130,246,0.15)',border:'1px solid rgba(59,130,246,0.3)',fontSize:'0.82rem'}}>
                <span style={{color:'#94a3b8'}}>Strategy end: </span>
                <span style={{color:'#60a5fa',fontWeight:'700'}}>{cur}{fmt(lastStrategy)}</span>
              </div>
              <div style={{padding:'0.4rem 0.9rem',borderRadius:'1rem',background:'rgba(100,116,139,0.15)',border:'1px solid rgba(100,116,139,0.3)',fontSize:'0.82rem'}}>
                <span style={{color:'#94a3b8'}}>B&amp;H end: </span>
                <span style={{color:'#94a3b8',fontWeight:'700'}}>{cur}{fmt(lastBH)}</span>
              </div>
              <div style={{padding:'0.4rem 0.9rem',borderRadius:'1rem',background: beatMarket?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)',border:`1px solid ${beatMarket?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`,fontSize:'0.82rem'}}>
                <span style={{color:'#94a3b8'}}>Alpha: </span>
                <span style={{color:beatMarket?'#10b981':'#ef4444',fontWeight:'700'}}>{m.alpha>=0?'+':''}{m.alpha}%</span>
              </div>
            </div>
          )}

          <ReactApexChart options={equityOptions} series={equitySeries} type="area" height={340}/>
        </Card>

        {/* Trade Log */}
        <Card style={{padding:'1.5rem',overflow:'auto'}}>
          <h3 style={{fontSize:'1.1rem',fontWeight:'600',marginBottom:'1.25rem',color:'#f8fafc'}}>
            Trade Log&nbsp;<span style={{color:'#64748b',fontWeight:'400',fontSize:'0.875rem'}}>({result.trades.length} trades)</span>
          </h3>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.875rem'}}>
            <thead>
              <tr>
                {['Date','Action','Price','Qty','Value','P&L'].map(col=>(
                  <th key={col} style={{padding:'0.6rem 0.75rem',textAlign:col==='Date'||col==='Action'?'left':'right',color:'#64748b',fontWeight:'600',fontSize:'0.72rem',textTransform:'uppercase',letterSpacing:'0.05em',borderBottom:'1px solid rgba(255,255,255,0.07)'}}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.trades.map((t,i)=>{
                const profit = t.pnl!=null&&t.pnl>=0;
                const ac = t.action==='BUY'?'#10b981':t.action==='SELL'?'#ef4444':'#f59e0b';
                return (
                  <tr key={i} onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.03)'} onMouseLeave={e=>e.currentTarget.style.background='transparent'} style={{transition:'background 0.15s'}}>
                    <td style={{...TDS,textAlign:'left'}}>{t.date}</td>
                    <td style={{...TDS,textAlign:'left'}}>
                      <span style={{padding:'0.2rem 0.7rem',borderRadius:'1rem',fontSize:'0.75rem',fontWeight:'700',background:`${ac}20`,color:ac}}>{t.action}</span>
                    </td>
                    <td style={TDS}>{cur}{fmt(t.price)}</td>
                    <td style={TDS}>{t.qty}</td>
                    <td style={TDS}>{cur}{fmt(t.value)}</td>
                    <td style={{...TDS,color:t.pnl==null?'#64748b':profit?'#10b981':'#ef4444',fontWeight:'600'}}>
                      {t.pnl==null?'—':`${profit?'+':''}${cur}${fmt(t.pnl)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>

        {/* Disclaimer */}
        <div style={{padding:'0.875rem 1.25rem',background:'rgba(251,191,36,0.05)',border:'1px solid rgba(251,191,36,0.15)',borderRadius:'0.75rem',color:'#fbbf24',fontSize:'0.78rem',lineHeight:1.6}}>
          ⚠️ <strong>Disclaimer:</strong> Past backtested performance does not guarantee future results. For educational simulation only.
        </div>

      </>)}
    </div>
  );
}

const LS = { fontSize:'0.8rem', color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.05em' };
const IS = { background:'rgba(15,23,42,0.6)', border:'1px solid rgba(255,255,255,0.1)', color:'#f8fafc', padding:'0.65rem 1rem', borderRadius:'0.6rem', fontSize:'0.9rem', outline:'none', width:'100%', cursor:'pointer' };
const TDS = { padding:'0.85rem 0.75rem', textAlign:'right', color:'#cbd5e1', borderBottom:'1px solid rgba(255,255,255,0.04)', whiteSpace:'nowrap' };
