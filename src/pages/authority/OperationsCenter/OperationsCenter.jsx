import {useEffect,useState} from 'react';
import {Activity,Database,Radio,BrainCircuit,Satellite,ShieldCheck,RefreshCw} from 'lucide-react';
import {getOperationsOverview} from '../../../services/operationsService';
import './OperationsCenter.css';
const statusClass=s=>s==='UP'||s==='ENABLED'||s==='CONFIGURED'?'good':s==='STANDBY'?'warn':'bad';
export default function OperationsCenter(){
 const [data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=async()=>{setLoading(true);setError('');try{setData(await getOperationsOverview())}catch(e){setError(e?.response?.data?.error||'Unable to load operations status')}finally{setLoading(false)}};
 useEffect(()=>{load()},[]);
 const systems=data?[['API',data.api.status,Activity],['Database',data.database.status,Database],['Realtime',data.realtime.status,Radio],['AI',data.ai.status,BrainCircuit],['Satellite',data.satellite.status,Satellite]]:[];
 return <section className="ops-page"><div className="ops-head"><div><span className="eyebrow">PRODUCTION OPERATIONS</span><h1>Operations Center</h1><p>Live service health, operational counters and release readiness.</p></div><button className="ops-refresh" onClick={load}><RefreshCw size={16}/> Refresh</button></div>
 {loading&&<div className="ops-panel">Checking RIVORA services…</div>}
 {error&&<div className="ops-panel ops-error">{error}</div>}
 {data&&<><div className="ops-hero"><div><ShieldCheck size={20}/><strong>{data.status.toUpperCase()}</strong><span>Environment: {data.environment}</span></div><small>Checked {new Date(data.checkedAt).toLocaleString()}</small></div>
 <div className="ops-grid">{systems.map(([name,status,Icon])=><div className="ops-card" key={name}><Icon size={19}/><span>{name}</span><b className={statusClass(status)}>{status}</b></div>)}</div>
 <div className="ops-metrics"><div><small>ONLINE SENSORS</small><strong>{data.metrics.online_sensors}</strong></div><div><small>ACTIVE ALERTS</small><strong>{data.metrics.active_alerts}</strong></div><div><small>OPEN INCIDENTS</small><strong>{data.metrics.open_incidents}</strong></div><div><small>DB LATENCY</small><strong>{data.database.latencyMs} ms</strong></div></div>
 <div className="ops-panel"><h2>Release gate</h2><ul><li>Database connectivity verified</li><li>Realtime gateway configured</li><li>AI and satellite states are explicitly reported</li><li>Run the smoke, validation and incident tests before production release</li></ul></div></>}
 </section>
}
