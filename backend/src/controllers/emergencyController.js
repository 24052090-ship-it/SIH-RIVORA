import { query } from '../db/pool.js';

const validLevels=['ADVISORY','WARNING','EVACUATE'];
const validSeverity=['INFO','WARNING','HIGH','CRITICAL'];
const validChannels=['IN_APP','WEB','SMS','EMAIL','SIREN'];

export async function emergencyOverview(req,res,next){
  try{
    const [zones,shelters,broadcasts]=await Promise.all([
      query(`SELECT ez.id,ez.zone_code,ez.name,ez.level,ez.active,ST_AsGeoJSON(ez.geometry)::json AS geometry, s.name AS shelter_name FROM emergency_zones ez LEFT JOIN shelters s ON s.id=ez.shelter_id WHERE ez.active=true ORDER BY CASE ez.level WHEN 'EVACUATE' THEN 1 WHEN 'WARNING' THEN 2 ELSE 3 END,ez.name`),
      query(`SELECT id,shelter_code,name,ST_Y(location::geometry) latitude,ST_X(location::geometry) longitude,capacity,occupied,status,contact,updated_at,CASE WHEN capacity=0 THEN 0 ELSE ROUND((occupied::numeric/capacity)*100) END occupancy_pct FROM shelters ORDER BY occupancy_pct DESC,name`),
      query(`SELECT eb.id,eb.broadcast_code,eb.severity,eb.title,eb.message,eb.channel,eb.status,eb.sent_at,eb.expires_at,eb.created_at,ez.name zone_name FROM emergency_broadcasts eb LEFT JOIN emergency_zones ez ON ez.id=eb.zone_id ORDER BY eb.created_at DESC LIMIT 30`)
    ]);
    res.json({generatedAt:new Date().toISOString(),zones:zones.rows,shelters:shelters.rows,broadcasts:broadcasts.rows});
  }catch(e){next(e)}
}

export async function nearbySafety(req,res,next){
  try{
    const lat=Number(req.query.lat), lng=Number(req.query.lng), radius=Number(req.query.radius||5000);
    if(!Number.isFinite(lat)||!Number.isFinite(lng)) return res.status(400).json({message:'lat and lng are required'});
    const zones=await query(`SELECT id,zone_code,name,level,ST_AsGeoJSON(geometry)::json AS geometry FROM emergency_zones WHERE active=true AND ST_DWithin(geometry::geography,ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,$3) ORDER BY CASE level WHEN 'EVACUATE' THEN 1 WHEN 'WARNING' THEN 2 ELSE 3 END`,[lng,lat,radius]);
    const shelters=await query(`SELECT id,shelter_code,name,ST_Y(location::geometry) latitude,ST_X(location::geometry) longitude,capacity,occupied,status,ROUND(ST_Distance(location,ST_SetSRID(ST_MakePoint($1,$2),4326)::geography))::int distance_m FROM shelters WHERE status IN ('OPEN','STANDBY') AND ST_DWithin(location,ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,$3) ORDER BY distance_m ASC LIMIT 5`,[lng,lat,radius]);
    const alerts=await query(`SELECT eb.id,eb.severity,eb.title,eb.message,ez.name zone_name,eb.sent_at,eb.expires_at FROM emergency_broadcasts eb LEFT JOIN emergency_zones ez ON ez.id=eb.zone_id WHERE eb.status='SENT' AND (eb.expires_at IS NULL OR eb.expires_at>NOW()) ORDER BY eb.sent_at DESC LIMIT 20`);
    res.json({generatedAt:new Date().toISOString(),zones:zones.rows,shelters:shelters.rows,broadcasts:alerts.rows});
  }catch(e){next(e)}
}

export async function createBroadcast(req,res,next){
  try{
    const {severity='WARNING',title,message,zoneId=null,channel=['IN_APP'],expiresAt=null}=req.body||{};
    if(!title||!message)return res.status(400).json({message:'title and message are required'});
    if(!validSeverity.includes(severity))return res.status(400).json({message:'Invalid severity'});
    const channels=Array.isArray(channel)?channel.filter(c=>validChannels.includes(c)):['IN_APP'];
    const code=`BR-${Date.now().toString().slice(-8)}`;
    const r=await query(`INSERT INTO emergency_broadcasts(broadcast_code,severity,title,message,zone_id,channel,created_by,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[code,severity,title,message,zoneId||null,channels,req.user?.id||null,expiresAt||null]);
    res.status(201).json(r.rows[0]);
  }catch(e){next(e)}
}

export async function sendBroadcast(req,res,next){
  try{
    const id=Number(req.params.id);
    const r=await query(`UPDATE emergency_broadcasts SET status='SENT',sent_at=NOW() WHERE id=$1 AND status IN ('DRAFT','SCHEDULED') RETURNING *`,[id]);
    if(!r.rowCount)return res.status(404).json({message:'Broadcast not found or already sent'});
    const b=r.rows[0];
    for(const channel of b.channel){await query(`INSERT INTO broadcast_deliveries(broadcast_id,channel,recipient_scope,status,delivered_at) VALUES($1,$2,$3,'QUEUED',NOW())`,[b.id,channel,b.zone_id?`ZONE:${b.zone_id}`:'GLOBAL']);}
    const io=req.app.get('io'); if(io) io.emit('emergencyBroadcastSent',b);
    res.json(b);
  }catch(e){next(e)}
}
