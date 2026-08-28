import { Layers3 } from 'lucide-react';
import './MapControls.css';
const defaults=['risk','rainfall','drains','reports','sensors','roads'];
export default function MapControls({layers=defaults,onChange}){const labels={risk:'Risk Zones',rainfall:'Rainfall',drains:'Drains',reports:'Citizen Reports',sensors:'Sensors',roads:'Roads'};return <div className="map-controls"><div className="map-controls-title"><Layers3 size={13}/> Layers</div>{defaults.map(key=><label key={key}><input type="checkbox" checked={layers.includes(key)} onChange={e=>{const next=e.target.checked?[...layers,key]:layers.filter(x=>x!==key);onChange?.(next)}}/><span>{labels[key]}</span></label>)}</div>}
