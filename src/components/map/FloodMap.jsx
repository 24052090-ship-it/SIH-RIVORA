import {useEffect,useMemo,useState} from 'react';
import {MapContainer,TileLayer,Polygon,Marker,Popup,Polyline,CircleMarker,useMap} from 'react-leaflet';
import L from 'leaflet';
import {floodZones as mockFloodZones} from '../../data/mockFloodZones';
import {drains as mockDrains} from '../../data/mockDrains';
import {roads as mockRoads} from '../../data/mockRoads';
import {sensors as mockSensors} from '../../data/mockSensors';
import {getFloodZones,getDrains,getRoads,getSensors} from '../../services/gisService';
import {MapProvider,useMapProvider} from './MapProvider/MapProvider';
import MapControls from './MapControls/MapControls';
import DataFreshness from '../common/DataFreshness/DataFreshness';
import './FloodMap.css';
const colors={LOW:'#22c55e',MEDIUM:'#facc15',HIGH:'#f97316',CRITICAL:'#ef4444'};
const pin=(color)=>L.divIcon({className:'custom-pin',html:`<span style="--pin:${color}"></span>`,iconSize:[18,18],iconAnchor:[9,9]});
function normalizeZones(data){return data?.features?.map(f=>({id:f.properties.id,risk:f.properties.risk,score:f.properties.score,coords:f.geometry.coordinates[0].map(([lng,lat])=>[lat,lng])}))||[]}
function MapViewport({currentLocation,routeData}){
 const map=useMap();
 useEffect(()=>{
  const routeCoords=(routeData?.routeGeometry?.coordinates||[]).map(([lng,lat])=>[Number(lat),Number(lng)]).filter(([lat,lng])=>Number.isFinite(lat)&&Number.isFinite(lng));
  if(routeCoords.length>1){map.fitBounds(routeCoords,{padding:[35,35],maxZoom:15});return}
  const lat=Number(currentLocation?.lat),lng=Number(currentLocation?.lng);
  if(Number.isFinite(lat)&&Number.isFinite(lng))map.setView([lat,lng],14);
 },[map,currentLocation?.lat,currentLocation?.lng,routeData]);
 return null;
}
function MapContent({routeLines=false,routeData=null,compact=false,currentLocation=null}){
 const {satellite}=useMapProvider(); const [layers,setLayers]=useState(['risk','rainfall','drains','reports','sensors','roads']); const [showSatellite,setShowSatellite]=useState(false);
 const [zones,setZones]=useState(mockFloodZones); const [drains,setDrains]=useState(mockDrains); const [roads,setRoads]=useState(mockRoads); const [sensors,setSensors]=useState(mockSensors.map((s,i)=>({...s,latitude:[12.958,12.951,12.948,12.964][i]||12.94,longitude:[77.612,77.658,77.685,77.686][i]||77.65})));
 useEffect(()=>{let active=true;Promise.all([getFloodZones(),getDrains(),getRoads(),getSensors()]).then(([z,d,r,s])=>{if(!active)return;if(z?.features) setZones(normalizeZones(z));if(d?.length)setDrains(d);if(r?.length)setRoads(r);if(s?.length)setSensors(s)}).catch(()=>{});return()=>{active=false}},[]);
 const baseUrl=showSatellite&&satellite?import.meta.env.VITE_SATELLITE_TILE_URL:'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
 const baseAttribution=showSatellite&&satellite?(import.meta.env.VITE_SATELLITE_ATTRIBUTION||'Satellite imagery provider'):'&copy; OpenStreetMap contributors';
 const sensorPins=useMemo(()=>sensors.map(s=>({id:s.id,pos:[Number(s.latitude),Number(s.longitude)],color:s.status==='ONLINE'?'#22c55e':'#f59e0b',status:s.status,type:s.type})),[sensors]);
 return <div className={`flood-map ${compact?'compact':''}`}><MapContainer center={currentLocation?[Number(currentLocation.lat),Number(currentLocation.lng)]:[12.94,77.65]} zoom={currentLocation?14:12} scrollWheelZoom={!compact}><TileLayer attribution={baseAttribution} url={baseUrl}/><MapViewport currentLocation={currentLocation} routeData={routeData}/>{currentLocation&&Number.isFinite(Number(currentLocation.lat))&&Number.isFinite(Number(currentLocation.lng))&&<CircleMarker center={[Number(currentLocation.lat),Number(currentLocation.lng)]} radius={9} pathOptions={{color:'#06b6d4',fillColor:'#06b6d4',fillOpacity:.9,weight:3}}><Popup><strong>Your current location</strong><br/>{Number(currentLocation.lat).toFixed(5)}, {Number(currentLocation.lng).toFixed(5)}</Popup></CircleMarker>}
 {layers.includes('risk')&&zones.map(z=><Polygon key={z.id} positions={z.coords} pathOptions={{color:colors[z.risk],fillColor:colors[z.risk],fillOpacity:.22,weight:1}}><Popup><strong>{z.id}</strong><br/>Risk: {z.risk}<br/>Score: {z.score}%</Popup></Polygon>)}
 {layers.includes('roads')&&roads.map(r=><Polyline key={r.id} positions={r.coordinates||[]} pathOptions={{color:r.flooded?colors.CRITICAL:r.risk==='HIGH'?colors.HIGH:colors.LOW,weight:r.flooded?5:3,opacity:.82,dashArray:r.flooded?'7 7':undefined}}><Popup><strong>{r.name}</strong><br/>Road risk: {r.risk}<br/>{r.flooded?'Flooded / blocked':'Passable'}</Popup></Polyline>)}
 {layers.includes('drains')&&drains.map(d=><Marker key={d.id} position={[Number(d.latitude),Number(d.longitude)]} icon={pin(colors[d.severity]||colors.LOW)}><Popup><strong>Drain #{d.id}</strong><br/>Status: {d.status}<br/>Severity: {d.severity}<br/>Water level: {d.waterLevel}%<br/>Capacity available: {d.capacity}%</Popup></Marker>)}
 {layers.includes('sensors')&&sensorPins.map(s=><Marker key={s.id} position={s.pos} icon={pin(s.color)}><Popup><strong>{s.id}</strong><br/>Type: {s.type}<br/>Status: {s.status}<br/>Last update from telemetry</Popup></Marker>)}
 {layers.includes('rainfall')&&<CircleMarker center={[12.9352,77.6245]} radius={10} pathOptions={{color:'#38bdf8',fillColor:'#38bdf8',fillOpacity:.22}}><Popup><strong>Rainfall station WX-BLR-01</strong><br/>Weather telemetry / Open-Meteo</Popup></CircleMarker>}
 {layers.includes('reports')&&<CircleMarker center={[12.925,77.662]} radius={7} pathOptions={{color:'#f59e0b',fillColor:'#f59e0b',fillOpacity:.8}}><Popup><strong>Citizen report RPT-5301</strong><br/>Flooding reported</Popup></CircleMarker>}
 {routeLines&&<><Polyline positions={(routeData?.routeGeometry?.coordinates||[[77.615,12.935],[77.625,12.955],[77.645,12.97],[77.66,12.968]]).map(([lng,lat])=>[lat,lng])} pathOptions={{color:'#22c55e',weight:6}}/><Polyline positions={[[12.935,77.62],[12.945,77.65],[12.95,77.68]]} pathOptions={{color:'#f97316',weight:4,dashArray:'8 8'}}/><Polyline positions={[[12.93,77.63],[12.94,77.66],[12.955,77.68]]} pathOptions={{color:'#ef4444',weight:4,dashArray:'5 8'}}/></>}
 </MapContainer><MapControls layers={layers} onChange={setLayers}/><div className="map-legend"><b>Risk</b>{Object.entries(colors).map(([k,v])=><span key={k}><i style={{background:v}}/> {k}</span>)}</div>{satellite&&<button className="satellite-toggle" onClick={()=>setShowSatellite(v=>!v)}>{showSatellite?'Street':'Satellite'}</button>}<div className="map-freshness"><DataFreshness/></div></div>
}
export default function FloodMap(props){return <MapProvider><MapContent {...props}/></MapProvider>}
