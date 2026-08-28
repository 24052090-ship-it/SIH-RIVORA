import { useState } from 'react';
import { Gauge, Play, RotateCcw, ShieldAlert } from 'lucide-react';
import PageHeader from '../../../components/layout/PageHeader';
import FloodMap from '../../../components/map/FloodMap';
import RiskFactors from '../../../components/flood/RiskFactors/RiskFactors';
import { simulationDefaults } from '../../../data/mockRisk';
import { runFloodSimulation } from '../../../services/simulationService';
import './Simulation.css';

export default function Simulation(){
  const [form,setForm]=useState(simulationDefaults);
  const [result,setResult]=useState(null);
  const [loading,setLoading]=useState(false);
  const update=(key,value)=>setForm(v=>({...v,[key]:Number(value)}));
  const run=async()=>{setLoading(true);try{setResult(await runFloodSimulation(form));}finally{setLoading(false)}};
  const reset=()=>{setForm(simulationDefaults);setResult(null)};
  return <div className="animate-in"><PageHeader eyebrow="Authority decision support" title="Flood Simulation" copy="Test how rainfall and drainage conditions could change city risk before deploying response teams."/>
    <div className="simulation-grid">
      <section className="panel glass simulation-controls"><div className="panel-head"><div><div className="eyebrow">SCENARIO BUILDER</div><h3>What-if conditions</h3></div><Gauge size={18}/></div>
        <label>Rainfall intensity <strong>{form.rainfall} mm/hr</strong><input type="range" min="0" max="150" value={form.rainfall} onChange={e=>update('rainfall',e.target.value)}/></label>
        <label>Drainage capacity <strong>{form.drainCapacity}%</strong><input type="range" min="10" max="100" value={form.drainCapacity} onChange={e=>update('drainCapacity',e.target.value)}/></label>
        <label>Blocked drains <strong>{form.blockedDrains}</strong><input type="range" min="0" max="50" value={form.blockedDrains} onChange={e=>update('blockedDrains',e.target.value)}/></label>
        <label>Duration <strong>{form.duration} hours</strong><input type="range" min="1" max="12" value={form.duration} onChange={e=>update('duration',e.target.value)}/></label>
        <div className="simulation-buttons"><button className="btn btn-primary" onClick={run} disabled={loading}><Play size={15}/>{loading?'Running...':'Run Simulation'}</button><button className="btn btn-ghost" onClick={reset}><RotateCcw size={15}/>Reset</button></div>
        <div className="simulation-note"><ShieldAlert size={14}/><span>Phase 1 uses a transparent mock risk formula. Phase 8 will replace it with the FastAPI flood model.</span></div>
      </section>
      <section className="panel glass"><div className="panel-head"><div><div className="eyebrow">GIS RESPONSE AREA</div><h3>Projected impact</h3></div></div><div className="simulation-map"><FloodMap/></div></section>
    </div>
    <div className="simulation-results">
      <section className="panel glass"><div className="panel-head"><div><div className="eyebrow">BASELINE INTELLIGENCE</div><h3>Current risk factors</h3></div></div><RiskFactors/></section>
      <section className="panel glass"><div className="panel-head"><div><div className="eyebrow">SCENARIO OUTPUT</div><h3>Projected response</h3></div></div>{result?<div className="result-grid"><div className={`result-score result-${result.level.toLowerCase()}`}><span>Projected risk</span><strong>{result.score}%</strong><b>{result.level}</b></div><div><span>Affected zones</span><strong>{result.affectedZones}</strong></div><div><span>Affected roads</span><strong>{result.affectedRoads}</strong></div><div><span>Population exposure</span><strong>{result.populationExposure.toLocaleString()}</strong></div><div className="result-recommendation"><span>Recommended action</span><strong>{result.recommendation}</strong></div></div>:<div className="empty-simulation"><Gauge size={24}/><p>Configure a scenario and run the simulation to estimate impact.</p></div>}</section>
    </div>
  </div>;
}
