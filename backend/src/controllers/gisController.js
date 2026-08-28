import { query } from '../db/pool.js';
export async function floodGeoJson(req,res){
 const {rows}=await query(`SELECT zone_code AS id,risk_level AS risk,risk_score AS score,ST_AsGeoJSON(geometry)::json AS geometry,updated_at FROM flood_zones ORDER BY risk_score DESC`);
 res.json({type:'FeatureCollection',features:rows.map(r=>({type:'Feature',properties:{id:r.id,risk:r.risk,score:Number(r.score),updatedAt:r.updated_at},geometry:r.geometry}))});
}
export async function drains(req,res){const {rows}=await query(`SELECT drain_code id,zone,water_level_percent::float water_level,available_capacity_percent::float capacity,blockage,severity,status,ST_Y(location::geometry) latitude,ST_X(location::geometry) longitude,TO_CHAR(last_maintenance,'YYYY-MM-DD') last_maintenance FROM drains ORDER BY severity DESC`);res.json(rows);}
export async function roads(req,res){const {rows}=await query(`SELECT road_code id,name,risk_level risk,flooded,ST_AsGeoJSON(geometry)::json geometry FROM roads`);res.json(rows.map(r=>({...r,coordinates:r.geometry.coordinates.map(([lng,lat])=>[lat,lng])})));}
export async function sensors(req,res){const {rows}=await query(`SELECT s.sensor_code id,s.type,s.zone,s.status,s.health,ST_Y(s.location::geometry) latitude,ST_X(s.location::geometry) longitude,EXTRACT(EPOCH FROM (NOW()-s.last_seen_at))::int seconds_since_update,s.last_seen_at,
 (SELECT rainfall_mm_hr::float FROM rainfall_readings r WHERE r.sensor_id=s.id ORDER BY recorded_at DESC LIMIT 1) rainfall_mm_hr,
 (SELECT water_level_percent::float FROM water_level_readings w WHERE w.sensor_id=s.id ORDER BY recorded_at DESC LIMIT 1) water_level_percent
 FROM sensors s ORDER BY s.sensor_code`);res.json(rows);}
