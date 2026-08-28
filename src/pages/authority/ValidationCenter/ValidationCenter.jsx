import { useEffect, useState } from 'react';
import { RefreshCw, Database, BrainCircuit, CheckCircle2, AlertTriangle, Activity } from 'lucide-react';
import { getValidationSummary, getDataQuality } from '../../../services/validationService';
import './ValidationCenter.css';

export default function ValidationCenter(){
  const [summary,setSummary]=useState(null); const [quality,setQuality]=useState(null); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  const load=async()=>{setLoading(true);setError('');try{const [a,b]=await Promise.all([getValidationSummary(),getDataQuality()]);setSummary(a.data);setQuality(b.data)}catch(e){setError(e.response?.data?.message||'Validation service is unavailable.')}finally{setLoading(false)}};
  useEffect(()=>{load()},[]);
  return <div className="validation-page">
    <div className="validation-head"><div><span className="eyebrow">PHASE 11 • VALIDATION</span><h1>Data & AI Validation Center</h1><p>Verify data health and model readiness before operational or SIH demonstrations.</p></div><button className="validation-refresh" onClick={load}><RefreshCw size={16}/> Refresh</button></div>
    {loading&&<div className="validation-panel">Running validation checks…</div>}
    {error&&<div className="validation-panel validation-error">{error}</div>}
    {summary&&<>
      <div className="validation-grid">
        <article className="validation-card"><Database/><span>Rainfall Records</span><strong>{summary.dataQuality.rainfall.total}</strong><small>{summary.dataQuality.rainfall.last24h} in last 24h</small></article>
        <article className="validation-card"><Activity/><span>Online Sensors</span><strong>{summary.dataQuality.sensors.online}/{summary.dataQuality.sensors.total}</strong><small>current availability</small></article>
        <article className="validation-card"><CheckCircle2/><span>Recent Reports</span><strong>{summary.dataQuality.reports.last7d}</strong><small>last 7 days</small></article>
        <article className="validation-card"><AlertTriangle/><span>Open Maintenance</span><strong>{summary.dataQuality.maintenance.open}</strong><small>requires attention</small></article>
      </div>
      <section className="validation-panel"><div className="panel-title"><div><span className="eyebrow">MODEL GOVERNANCE</span><h2>{summary.model.model_name}</h2></div><span className={`model-status ${summary.model.status}`}>{summary.model.status}</span></div><div className="model-grid"><div><span>Version</span><strong>{summary.model.version}</strong></div><div><span>Dataset</span><strong>{summary.model.dataset_version}</strong></div><div><span>Accuracy</span><strong>{summary.model.metrics?.accuracy ?? '—'}</strong></div><div><span>Precision</span><strong>{summary.model.metrics?.precision ?? '—'}</strong></div><div><span>Recall</span><strong>{summary.model.metrics?.recall ?? '—'}</strong></div><div><span>F1</span><strong>{summary.model.metrics?.f1 ?? '—'}</strong></div><div><span>ROC-AUC</span><strong>{summary.model.metrics?.rocAuc ?? '—'}</strong></div></div><p className="validation-note">Model metrics are only operationally meaningful after validation on representative local historical flood data. Synthetic development metrics must not be presented as field accuracy.</p></section>
    </>}
    {quality&&<section className="validation-panel"><div className="panel-title"><div><span className="eyebrow">DATABASE QUALITY</span><h2>Data availability checks</h2></div><small>{new Date(quality.checkedAt).toLocaleString()}</small></div><div className="quality-table">{quality.checks.map(c=><div className="quality-row" key={c.table}><span>{c.table}</span><strong>{c.rows}</strong><span className={`quality-status ${c.status}`}>{c.status}</span></div>)}</div></section>}
  </div>
}
