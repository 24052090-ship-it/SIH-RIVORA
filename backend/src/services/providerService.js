import { env } from '../config/env.js';
const BENGALURU={lat:12.9716,lng:77.5946};let sentinelTokenCache={token:null,expiresAt:0};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function providerStatus(){return{generatedAt:new Date().toISOString(),providers:[
{id:'open-meteo',name:'Open-Meteo',category:'Weather nowcast',configured:true,mode:'LIVE_NO_KEY',capabilities:['hourly precipitation','rain probability','temperature','humidity','wind'],note:'Live public forecast API; no key required.'},
{id:'google-maps',name:'Google Maps Platform',category:'Traffic-aware mobility',configured:Boolean(env.googleMapsApiKey),mode:env.googleMapsApiKey?'LIVE':'READY_FOR_KEY',capabilities:['Routes API','traffic-aware ETA','route polyline','route comparison'],note:env.googleMapsApiKey?'Server-side Routes API key configured.':'Add GOOGLE_MAPS_API_KEY to enable live routing.'},
{id:'sentinel-hub',name:'Sentinel Hub',category:'Satellite intelligence',configured:Boolean(env.sentinelHubClientId&&env.sentinelHubClientSecret),mode:env.sentinelHubClientId&&env.sentinelHubClientSecret?'LIVE':'READY_FOR_OAUTH',capabilities:['Sentinel-2 catalog','scene quality filtering','water-index pipeline','imagery processing hook'],note:env.sentinelHubClientId&&env.sentinelHubClientSecret?'OAuth client configured.':'Add Sentinel Hub OAuth client credentials.'},
{id:'postgis',name:'PostgreSQL + PostGIS',category:'Spatial data fabric',configured:true,mode:'INTERNAL',capabilities:['risk polygons','drain/sensor geometry','spatial joins','flood-aware routing'],note:'Primary operational geospatial store.'},
{id:'aquaguard-ai',name:'AquaGuard AI Service',category:'AI / ML',configured:true,mode:'INTERNAL',capabilities:['XGBoost flood risk','YOLO drainage vision','multi-signal fusion'],note:`FastAPI service target: ${env.aiServiceUrl}`}
]}}
export async function getWeatherNowcast({lat=BENGALURU.lat,lng=BENGALURU.lng,hours=12}={}){const safe=clamp(Number(hours)||12,1,48);const u=new URL('https://api.open-meteo.com/v1/forecast');u.searchParams.set('latitude',lat);u.searchParams.set('longitude',lng);u.searchParams.set('hourly','precipitation,precipitation_probability,temperature_2m,relative_humidity_2m,wind_speed_10m');u.searchParams.set('forecast_days','2');u.searchParams.set('timezone',env.weatherTimezone);const r=await fetch(u,{headers:{Accept:'application/json'}});if(!r.ok)throw new Error(`Open-Meteo returned ${r.status}`);const d=await r.json(),h=d.hourly||{},now=Date.now();const rows=(h.time||[]).map((time,i)=>({time,timestamp:Date.parse(time),precipitationMm:Number(h.precipitation?.[i]||0),probabilityPct:Number(h.precipitation_probability?.[i]||0),temperatureC:Number(h.temperature_2m?.[i]||0),humidityPct:Number(h.relative_humidity_2m?.[i]||0),windKmh:Number(h.wind_speed_10m?.[i]||0)})).filter(x=>Number.isFinite(x.timestamp)&&x.timestamp>=now-3600000).slice(0,safe);const total=rows.reduce((s,x)=>s+x.precipitationMm,0),peak=rows.reduce((b,x)=>x.precipitationMm>(b?.precipitationMm??-1)?x:b,null),wet=rows.filter(x=>x.precipitationMm>=2).length;const severity=total>=80||(peak?.precipitationMm||0)>=25?'CRITICAL':total>=45||(peak?.precipitationMm||0)>=15?'HIGH':total>=20||wet>=4?'MEDIUM':'LOW';return{provider:'OPEN_METEO',location:{lat:Number(lat),lng:Number(lng)},timezone:d.timezone||env.weatherTimezone,summary:{horizonHours:rows.length,totalPrecipitationMm:Number(total.toFixed(1)),peakHourlyMm:Number((peak?.precipitationMm||0).toFixed(1)),peakTime:peak?.time||null,wetHours:wet,severity},hourly:rows}}
export async function computeGoogleRoute({origin,destination,travelMode='DRIVE'}){if(!env.googleMapsApiKey)return{configured:false,provider:'GOOGLE_ROUTES',message:'GOOGLE_MAPS_API_KEY is not configured.',demo:{distanceMeters:6400,durationSeconds:1120,trafficDurationSeconds:1280,routeLabel:'Traffic-aware baseline route',note:'Demo metadata only; AquaGuard flood-aware routing remains available from /api/routes/safe.'}};const wp=v=>v?.lat!=null&&v?.lng!=null?{location:{latLng:{latitude:Number(v.lat),longitude:Number(v.lng)}}}:v?.address?{address:v.address}:(()=>{throw new Error('Waypoint requires lat/lng or address.')})();const body={origin:wp(origin),destination:wp(destination),travelMode,routingPreference:travelMode==='DRIVE'?'TRAFFIC_AWARE':undefined,computeAlternativeRoutes:true,languageCode:'en-IN',units:'METRIC'};const r=await fetch('https://routes.googleapis.com/directions/v2:computeRoutes',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':env.googleMapsApiKey,'X-Goog-FieldMask':'routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline.encodedPolyline,routes.routeLabels,routes.travelAdvisory'},body:JSON.stringify(body)});if(!r.ok){const t=await r.text();throw new Error(`Google Routes returned ${r.status}: ${t.slice(0,200)}`)}const d=await r.json();return{configured:true,provider:'GOOGLE_ROUTES',routes:d.routes||[]}}
async function sentinelToken(){const now=Date.now();if(sentinelTokenCache.token&&sentinelTokenCache.expiresAt>now+60000)return sentinelTokenCache.token;if(!env.sentinelHubClientId||!env.sentinelHubClientSecret)throw new Error('Sentinel Hub OAuth credentials are not configured.');const f=new URLSearchParams({grant_type:'client_credentials',client_id:env.sentinelHubClientId,client_secret:env.sentinelHubClientSecret});const r=await fetch('https://services.sentinel-hub.com/auth/realms/main/protocol/openid-connect/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:f});if(!r.ok)throw new Error(`Sentinel Hub auth returned ${r.status}`);const d=await r.json();sentinelTokenCache={token:d.access_token,expiresAt:now+Number(d.expires_in||600)*1000};return d.access_token}
export async function searchSentinelScenes({bbox=[77.45,12.82,77.78,13.12],days=7,maxCloud=40}={}){if(!env.sentinelHubClientId||!env.sentinelHubClientSecret)return{configured:false,provider:'SENTINEL_HUB',collection:env.satelliteCollection,message:'Sentinel Hub credentials are not configured.',scenes:[]};const token=await sentinelToken(),end=new Date(),start=new Date(end.getTime()-clamp(Number(days)||7,1,60)*86400000);const r=await fetch('https://services.sentinel-hub.com/api/v1/catalog/1.0.0/search',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',Accept:'application/geo+json'},body:JSON.stringify({collections:[env.satelliteCollection],bbox:bbox.map(Number),datetime:`${start.toISOString()}/${end.toISOString()}`,limit:20})});if(!r.ok)throw new Error(`Sentinel Hub Catalog returned ${r.status}`);const d=await r.json();const scenes=(d.features||[]).map(f=>({id:f.id,datetime:f.properties?.datetime||f.properties?.date,cloudCoverPct:Number(f.properties?.['eo:cloud_cover']??f.properties?.cloudCover??0),bbox:f.bbox,geometry:f.geometry,platform:f.properties?.platform||'Sentinel-2'})).filter(x=>x.cloudCoverPct<=Number(maxCloud));return{configured:true,provider:'SENTINEL_HUB',collection:env.satelliteCollection,scenes}}


export async function geocodeAddress(query,nearLat=null,nearLng=null){
  const q=String(query||'').trim();
  if(!q) throw new Error('Destination is required.');
  const u=new URL('https://nominatim.openstreetmap.org/search');
  u.searchParams.set('q',q);
  u.searchParams.set('format','jsonv2');
  u.searchParams.set('limit','1');
  u.searchParams.set('addressdetails','1');
  u.searchParams.set('countrycodes','in');
  const nearLatitude=Number(nearLat),nearLongitude=Number(nearLng);
  if(Number.isFinite(nearLatitude)&&Number.isFinite(nearLongitude)){
    const span=0.75;
    u.searchParams.set('viewbox',`${nearLongitude-span},${nearLatitude+span},${nearLongitude+span},${nearLatitude-span}`);
  }
  const r=await fetch(u,{headers:{Accept:'application/json','User-Agent':'AquaGuard-SIH/31.0'}});
  if(!r.ok) throw new Error(`Geocoding provider returned ${r.status}`);
  const rows=await r.json();
  const candidates=Array.isArray(rows)?rows:[];
  let item=candidates[0]||null;
  if(Number.isFinite(nearLatitude)&&Number.isFinite(nearLongitude)&&candidates.length>1){
    const distanceScore=(x)=>{
      const lat=Number(x.lat),lng=Number(x.lon);
      if(!Number.isFinite(lat)||!Number.isFinite(lng)) return Number.POSITIVE_INFINITY;
      const xScale=Math.cos(nearLatitude*Math.PI/180);
      return ((lat-nearLatitude)**2)+(((lng-nearLongitude)*xScale)**2);
    };
    item=[...candidates].sort((a,b)=>distanceScore(a)-distanceScore(b))[0]||item;
  }
  if(!item) return null;
  return {provider:'OPENSTREETMAP_NOMINATIM',label:item.display_name,lat:Number(item.lat),lng:Number(item.lon),address:item.address||{}};
}

export async function reverseGeocodeLocation(lat,lng){
  const latitude=Number(lat),longitude=Number(lng);
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)) throw new Error('Valid lat/lng are required.');
  const u=new URL('https://nominatim.openstreetmap.org/reverse');
  u.searchParams.set('lat',String(latitude));
  u.searchParams.set('lon',String(longitude));
  u.searchParams.set('format','jsonv2');
  u.searchParams.set('addressdetails','1');
  u.searchParams.set('zoom','10');
  const r=await fetch(u,{headers:{Accept:'application/json','User-Agent':'AquaGuard-SIH/31.0'}});
  if(!r.ok) throw new Error(`Reverse geocoding provider returned ${r.status}`);
  const item=await r.json();
  const a=item?.address||{};
  const city=a.city||a.town||a.village||a.municipality||a.city_district||a.state_district||a.county||a.state||null;
  return {provider:'OPENSTREETMAP_NOMINATIM',label:item?.display_name||null,city,locality:a.suburb||a.neighbourhood||null,state:a.state||null,country:a.country||null,lat:latitude,lng:longitude};
}


export function phase27ProviderContracts() {
  return {
    WeatherProvider: {
      implementation: 'Open-Meteo',
      authentication: 'No provider key required',
      rateLimits: 'Provider-managed; AquaGuard weather sync interval is server-configured',
      units: {
        precipitation: 'mm',
        temperature: 'C',
        humidity: 'percent',
        wind: 'km/h'
      },
      coordinateSystem: 'EPSG:4326 latitude/longitude',
      freshness: 'Forecast timestamps are retained from the provider response',
      attributionLicense: 'External provider terms apply; do not strip provider attribution',
      retryBehavior: 'Caller may retry after a transient provider failure',
      failureBehavior: 'Provider errors are surfaced; AquaGuard does not fabricate weather observations'
    },

    SatelliteProvider: {
      implementation: 'Sentinel Hub',
      authentication: 'OAuth client credentials stored only on the backend',
      rateLimits: 'Provider/account limits apply',
      units: 'Provider-native imagery and metadata',
      coordinateSystem: 'EPSG:4326 bbox input; scene geometry retained from provider',
      freshness: 'Scene datetime is retained for every returned scene',
      attributionLicense: 'Sentinel/Copernicus and provider terms apply',
      retryBehavior: 'OAuth token is cached; failed provider calls are surfaced',
      failureBehavior: 'Missing credentials returns configured=false and no synthetic scenes'
    },

    GISProvider: {
      implementation: 'PostgreSQL + PostGIS',
      authentication: 'Backend database credentials only',
      rateLimits: 'Internal database capacity limits',
      units: 'Stored operational units; spatial geometries use SRID 4326',
      coordinateSystem: 'EPSG:4326',
      freshness: 'Operational rows expose update/observation timestamps where available',
      attributionLicense: 'Depends on the source dataset loaded into PostGIS',
      retryBehavior: 'Database errors are surfaced to backend error handling',
      failureBehavior: 'No geographic fallback is silently invented'
    },

    DeviceTelemetryProvider: {
      implementation: 'AquaGuard Phase 27 JSON IoT ingest',
      endpoint: '/api/telemetry/ingest/device',
      authentication: 'x-device-key checked server-side',
      transport: env.deviceRequireTls
        ? 'TLS required'
        : 'TLS optional only for local development; enable DEVICE_REQUIRE_TLS=true for deployment',
      rateLimits: '60 requests per minute per IP/path in the application limiter',
      units: {
        rainfallMmHr: 'mm/hour',
        waterLevelCm: 'cm',
        batteryPct: 'percent',
        signalRssi: 'dBm'
      },
      coordinateSystem: 'EPSG:4326 latitude/longitude',
      freshness: {
        futureClockSkewMs: env.deviceMaxClockSkewMs,
        offlineBufferWindowMs: env.deviceMaxBufferAgeMs,
        monotonicPerDevice: true
      },
      replayProtection: 'SHA-256 replay key plus monotonic per-device timestamp',
      calibration: (
        'Raw waterLevelCm is always preserved. Percent conversion occurs only ' +
        'when registered sensor calibration.waterLevelMaxCm metadata exists.'
      ),
      retryBehavior: (
        'Devices may buffer offline and resend in timestamp order within the configured window.'
      ),
      failureBehavior: (
        'Invalid auth/schema/clock/replay payloads are rejected with 4xx; missing calibration is explicit.'
      )
    }
  };
}
