import {useEffect,useState} from 'react';
import {Activity,MapPinned,Play,RotateCcw,ShieldAlert,RadioTower,CloudRain,Route as RouteIcon} from 'lucide-react';
import PageHeader from '../../../components/layout/PageHeader';
import {getDigitalTwinOverview,runDigitalTwinScenario} from '../../../services/digitalTwinService';
import './DigitalTwin.css';

export default function DigitalTwin(){
 const [overview,setOverview]=useState(null); const [loading,setLoading]=useState(true); const [running,setRunning]=useState(false); const [result,setResult]=useState(null);
 const [form,setForm]=useState({rainfall:70,drainCapacity:65,blockedDrains:8,duration:3});
 useEffect(()=>{getDigitalTwinOverview().then(setOverview).catch(()=>{}).finally(()=>setLoading(false))},[]);
 const update=(k,v)=>setForm(f=>({...f,[k]:Number(v)}));
 const run=async()=>{setRunning(true);try{setResult(await runDigitalTwinScenario(form))}finally{setRunning(false)}};
 return <div className="animate-in"><PageHeader eyebrow="Urban resilience planning" title="City Digital Twin" copy="Model how changing rainfall and drainage conditions could affect the connected city before response decisions are made."/>
  <div className="twin-grid">
   <section className="panel glass twin-overview"><div className="panel-head"><div><div className="eyebrow">LIVE CITY STATE</div><h3>Infrastructure snapshot</h3></div><Activity size={18}/></div>
    {loading?<div className="twin-loading">Loading city state...</div>:<div className="twin-cards">
      <div><CloudRain size={17}/><span>Peak rainfall</span><strong>{overview?.rainfall?.peak??0} mm/hr</strong></div>
      <div><ShieldAlert size={17}/><span>High-risk zones</span><strong>{overview?.zones?.high_risk??0}</strong></div>
      <div><RadioTower size={17}/><span>Online sensors</span><strong>{overview?.sensors?.online??0}/{overview?.sensors?.total??0}</strong></div>
      <div><RouteIcon size={17}/><span>Impaired roads</span><strong>{overview?.roads?.impaired??0}</strong></div>
      <div><MapPinned size={17}/><span>Blocked drains</span><strong>{overview?.drains?.blocked??0}</strong></div>
    </div>}
   </section>
   <section className="panel glass twin-scenario"><div className="panel-head"><div><div className="eyebrow">WHAT-IF ENGINE</div><h3>Run resilience scenario</h3></div><MapPinned size={18}/></div>
    {Object.entries({rainfall:['Rainfall intensity','mm/hr',0,150],drainCapacity:['Drainage capacity','%',10,100],blockedDrains:['Blocked drains','',0,50],duration:['Duration','hours',1,12]}).map(([k,v])=><label key={k}>{v[0]} <strong>{form[k]} {v[1]}</strong><input type="range" min={v[2]} max={v[3]} value={form[k]} onChange={e=>update(k,e.target.value)}/></label>)}
    <div className="twin-actions"><button className="btn btn-primary" onClick={run} disabled={running}><Play size={15}/>{running?'Simulating...':'Run Digital Twin'}</button><button className="btn btn-ghost" onClick={()=>setResult(null)}><RotateCcw size={15}/>Reset</button></div>
    <p className="twin-note">Planning simulation only. Do not use simulated outputs as an emergency forecast until validated against local models and operational procedures.</p>
   </section>
  </div>
  <section className="panel glass twin-result"><div className="panel-head"><div><div className="eyebrow">SCENARIO IMPACT</div><h3>Projected city response</h3></div></div>
   {!result?<div className="twin-empty"><ShieldAlert size={25}/><p>Run a scenario to estimate affected zones, roads and population exposure.</p></div>:<div className="impact-grid"><div className={`impact-score impact-${result.level.toLowerCase()}`}><span>Risk</span><strong>{result.score}%</strong><b>{result.level}</b></div><div><span>Affected zones</span><strong>{result.affectedZones}</strong></div><div><span>Affected roads</span><strong>{result.affectedRoads}</strong></div><div><span>Population exposure</span><strong>{result.populationExposure.toLocaleString()}</strong></div><div className="recommendations"><span>Recommended planning actions</span>{result.recommendations.map(x=><div key={x}>• {x}</div>)}</div></div>}
  </section>
 </div>
}
