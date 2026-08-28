import {providerStatus,getWeatherNowcast,computeGoogleRoute,searchSentinelScenes,geocodeAddress,reverseGeocodeLocation,phase27ProviderContracts} from '../services/providerService.js';const num=(v,f)=>Number.isFinite(Number(v))?Number(v):f;
export async function status(req,res){
  const base=providerStatus();
  res.json({
    ...base,
    providers:[
      ...(base.providers||[]),
      {
        id:'device-telemetry',
        name:'AquaGuard Device Telemetry',
        category:'IoT ingestion',
        configured:Boolean(process.env.DEVICE_API_KEY),
        mode:'SERVER_SIDE_CONNECTOR',
        capabilities:[
          'ESP32 JSON telemetry',
          'clock validation',
          'replay protection',
          'offline buffering',
          'device health metadata'
        ],
        note:'Phase 27 connector is separate from development simulators.'
      }
    ],
    contracts:phase27ProviderContracts(),
    simulatorSeparation:{
      productionConnectors:[
        'DeviceTelemetryProvider',
        'WeatherProvider',
        'SatelliteProvider',
        'GISProvider'
      ],
      developmentSimulators:'Explicitly separate; simulator data is never represented as live provider data.'
    }
  })
}
export async function weatherNowcast(req,res){res.json(await getWeatherNowcast({lat:num(req.query.lat,12.9716),lng:num(req.query.lng,77.5946),hours:num(req.query.hours,12)}))}
export async function googleRoute(req,res){res.json(await computeGoogleRoute(req.body||{}))}
export async function sentinelScenes(req,res){const bbox=String(req.query.bbox||'77.45,12.82,77.78,13.12').split(',').map(Number);if(bbox.length!==4||bbox.some(x=>!Number.isFinite(x)))return res.status(400).json({error:'bbox must contain west,south,east,north'});res.json(await searchSentinelScenes({bbox,days:num(req.query.days,7),maxCloud:num(req.query.maxCloud,40)}))}


export async function geocode(req,res){
  const q=String(req.query.q||'').trim();
  if(!q) return res.status(400).json({error:'q is required'});
  const result=await geocodeAddress(q,req.query.lat,req.query.lng);
  if(!result) return res.status(404).json({error:'Destination not found'});
  res.json(result);
}

export async function reverseGeocode(req,res){
  const lat=Number(req.query.lat),lng=Number(req.query.lng);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)) return res.status(400).json({error:'Valid lat and lng are required'});
  res.json(await reverseGeocodeLocation(lat,lng));
}
