import {useEffect,useState} from 'react';
import {MapPin,WifiOff,Wifi,CheckCircle2,Navigation,Camera,RefreshCw} from 'lucide-react';
import {fieldMobileService} from '../../../services/fieldMobileService';
import './FieldMobile.css';

const QUEUE_KEY='aquaguard.field.queue';
export default function FieldMobile(){
 const [data,setData]=useState({tasks:[],crews:[]}); const [selected,setSelected]=useState(null); const [online,setOnline]=useState(navigator.onLine); const [coords,setCoords]=useState(null); const [message,setMessage]=useState(''); const [busy,setBusy]=useState(false);
 const load=async()=>{try{const r=await fieldMobileService.overview();setData(r)}catch(e){setMessage('Unable to load field tasks. Check the API connection.')}};
 useEffect(()=>{load(); const on=()=>setOnline(true),off=()=>setOnline(false); addEventListener('online',on);addEventListener('offline',off);return()=>{removeEventListener('online',on);removeEventListener('offline',off)}},[]);
 const locate=()=>navigator.geolocation?.getCurrentPosition(p=>setCoords({lat:p.coords.latitude,lng:p.coords.longitude}),()=>setMessage('Location permission was not available.'));
 const update=async(status)=>{if(!selected)return;setBusy(true);const payload={taskId:selected.id,status,lat:coords?.lat,lng:coords?.lng};try{if(online){await fieldMobileService.updateTask(selected.id,payload);setSelected(prev=>prev?{...prev,status}:prev);} else {const q=JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]');q.push(payload);localStorage.setItem(QUEUE_KEY,JSON.stringify(q));setSelected(prev=>prev?{...prev,status}:prev);}setMessage(online?'Task updated.':'Saved offline. It will sync when connected.');await load()}catch(e){setMessage(e?.response?.data?.message||'Update failed.')}finally{setBusy(false)}};
 const sync=async()=>{if(!online)return;const q=JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]');if(!q.length){setMessage('No offline updates to sync.');return}for(const x of q){await fieldMobileService.updateTask(x.taskId,x)}localStorage.removeItem(QUEUE_KEY);setMessage(`${q.length} offline update(s) synchronized.`);await load()};
 return <div className="field-mobile"><header><div><span className="eyebrow">FIELD RESPONSE</span><h1>Crew Mobile</h1><p>Use this compact interface for on-site dispatch updates and location check-ins.</p></div><div className={online?'net online':'net'}>{online?<Wifi size={16}/>:<WifiOff size={16}/>} {online?'ONLINE':'OFFLINE'}</div></header>
 <div className="mobile-actions"><button onClick={locate}><MapPin size={17}/> Share Location</button><button onClick={sync} disabled={!online}><RefreshCw size={17}/> Sync Queue</button></div>
 {coords&&<div className="location-chip"><Navigation size={15}/> {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</div>}
 {message&&<div className="mobile-message">{message}</div>}
 <section className="task-grid">{data.tasks?.length?data.tasks.map(t=><article className="task-card" key={t.id}><div className="task-top"><strong>{t.task_code}</strong><span className={`priority ${t.priority.toLowerCase()}`}>{t.priority}</span></div><h3>{t.task_type.replaceAll('_',' ')}</h3><p>{t.description}</p><div className="task-meta"><span>{t.crew_name||'Unassigned'}</span><span>{t.status}</span></div><button className="open-task" onClick={()=>setSelected(t)}>Open Task</button></article>):<div className="empty">No active field tasks.</div>}</section>
 {selected&&<div className="task-modal"><div className="task-panel"><button className="close" onClick={()=>setSelected(null)}>×</button><span className="eyebrow">{selected.task_code}</span><h2>{selected.task_type.replaceAll('_',' ')}</h2><p>{selected.description}</p><div className="proof-row"><button onClick={locate}><MapPin size={16}/> Check-in</button><button disabled title='Evidence upload is not implemented in Phase 18'><Camera size={16}/> Add Evidence - Coming next</button></div><div className="status-actions">{['EN_ROUTE','ON_SITE','COMPLETED'].map(s=><button key={s} disabled={busy} onClick={()=>update(s)}>{s==='COMPLETED'?<CheckCircle2 size={16}/>:null}{s.replaceAll('_',' ')}</button>)}</div></div></div>}
 </div>
}
