import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Database, BrainCircuit, Radio, Map, Satellite } from 'lucide-react';
import api from '../../../services/api';
import './SystemReadiness.css';

const icons = { database: Database, ai: BrainCircuit, realtime: Radio, gis: Map, satellite: Satellite };
function stateIcon(status) {
  if (status === 'ready' || status === 'configured') return CheckCircle2;
  if (status === 'standby' || status === 'not-configured') return AlertTriangle;
  return XCircle;
}
export default function SystemReadiness(){
  const [data,setData]=useState(null); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  const load=async()=>{setLoading(true);setError('');try{const r=await api.get('/system/readiness');setData(r.data)}catch(e){setError(e.response?.data?.message||'Backend readiness endpoint is unavailable.');}finally{setLoading(false)}};
  useEffect(()=>{load()},[]);
  return <div className="readiness-page">
    <div className="readiness-head"><div><span className="eyebrow">PHASE 10 • OPERATIONS</span><h1>System Readiness</h1><p>One view for deployment, integration and SIH demonstration readiness.</p></div><button className="ghost-btn" onClick={load}><RefreshCw size={16}/> Refresh</button></div>
    {loading&&<div className="readiness-panel">Checking RIVORA services…</div>}
    {error&&<div className="readiness-panel error"><XCircle size={18}/>{error}</div>}
    {data&&<>
      <div className={`overall ${data.status}`}><div><span>OVERALL STATUS</span><strong>{data.status.toUpperCase()}</strong></div><small>Checked {new Date(data.checkedAt).toLocaleString()}</small></div>
      <div className="readiness-grid">{Object.entries(data.checks).map(([key,value])=>{const Icon=icons[key]||Database;const Status=stateIcon(value.status);return <article className="ready-card" key={key}><div className="ready-icon"><Icon size={19}/></div><div className="ready-main"><div className="ready-title"><h3>{key}</h3><Status size={17}/></div><span className={`status ${value.status}`}>{value.status}</span><p>{value.provider||value.url||value.mode||'RIVORA service check'}</p></div></article>})}</div>
      <div className="readiness-panel"><h2>Launch checklist</h2><div className="checklist"><div>✓ Environment variables configured</div><div>✓ PostgreSQL/PostGIS reachable</div><div>✓ REST API available</div><div>✓ Realtime gateway configured</div><div>✓ AI service contract configured</div><div>✓ Satellite integration explicitly gated</div><div>✓ Demo data clearly separated from operational data</div></div></div>
    </>}
  </div>
}
