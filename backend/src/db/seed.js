import bcrypt from 'bcryptjs';
import { pool } from './pool.js';
const hash = await bcrypt.hash('password', 12);
await pool.query(`INSERT INTO users(name,email,password_hash,role) VALUES ($1,$2,$3,$4) ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name, password_hash=EXCLUDED.password_hash, role=EXCLUDED.role`, ['Demo Citizen','demo@aquaguard.ai',hash,'citizen']);
await pool.query(`INSERT INTO users(name,email,password_hash,role) VALUES ($1,$2,$3,$4) ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name, password_hash=EXCLUDED.password_hash, role=EXCLUDED.role`, ['Command Officer','authority@aquaguard.ai',hash,'authority']);

await pool.query(`INSERT INTO sensors(sensor_code,type,zone,status,health,location) VALUES
('SN-104','Rainfall','Zone 4','ONLINE',98,ST_SetSRID(ST_MakePoint(77.612,12.958),4326)::geography),
('SN-118','Water Level','Zone 2','ONLINE',94,ST_SetSRID(ST_MakePoint(77.658,12.951),4326)::geography),
('SN-203','Rainfall','Zone 7','DEGRADED',71,ST_SetSRID(ST_MakePoint(77.685,12.948),4326)::geography),
('SN-225','Drain Level','Zone 5','ONLINE',91,ST_SetSRID(ST_MakePoint(77.686,12.964),4326)::geography),
('WX-BLR-01','Weather API','Bengaluru','ONLINE',100,ST_SetSRID(ST_MakePoint(77.6245,12.9352),4326)::geography)
ON CONFLICT(sensor_code) DO NOTHING`);
await pool.query(`INSERT INTO rainfall_readings(sensor_id,rainfall_mm_hr,recorded_at,source) SELECT id,72,NOW(),'SEED' FROM sensors WHERE sensor_code='SN-104' AND NOT EXISTS (SELECT 1 FROM rainfall_readings r WHERE r.sensor_id=sensors.id)`);
await pool.query(`INSERT INTO rainfall_readings(sensor_id,rainfall_mm_hr,recorded_at,source) SELECT id,v,NOW() - ((8-i)*interval '3 hours'),'SEED' FROM sensors CROSS JOIN LATERAL (VALUES (12,0),(18,1),(24,2),(19,3),(31,4),(26,5),(38,6),(44,7)) AS x(v,i) WHERE sensor_code='SN-104'`);
await pool.query(`INSERT INTO drains(drain_code,zone,water_level_percent,available_capacity_percent,blockage,severity,status,location,last_maintenance) VALUES
('DR-104','Zone 4',87,65,true,'HIGH','BLOCKED',ST_SetSRID(ST_MakePoint(77.644,12.942),4326)::geography,NOW()-interval '12 days'),
('DR-117','Zone 2',62,78,false,'MEDIUM','OPERATIONAL',ST_SetSRID(ST_MakePoint(77.658,12.951),4326)::geography,NOW()-interval '4 days'),
('DR-203','Zone 7',94,42,true,'CRITICAL','BLOCKED',ST_SetSRID(ST_MakePoint(77.675,12.931),4326)::geography,NOW()-interval '21 days'),
('DR-311','Zone 5',38,91,false,'LOW','OPERATIONAL',ST_SetSRID(ST_MakePoint(77.686,12.964),4326)::geography,NOW()-interval '2 days')
ON CONFLICT(drain_code) DO NOTHING`);
await pool.query(`INSERT INTO flood_zones(zone_code,risk_level,risk_score,geometry) VALUES
('ZONE-01','LOW',22,ST_GeomFromText('POLYGON((77.58 12.96,77.61 12.97,77.62 12.94,77.58 12.94,77.58 12.96))',4326)),
('ZONE-02','MEDIUM',48,ST_GeomFromText('POLYGON((77.61 12.94,77.65 12.96,77.66 12.92,77.62 12.91,77.61 12.94))',4326)),
('ZONE-03','HIGH',68,ST_GeomFromText('POLYGON((77.63 12.92,77.68 12.94,77.69 12.89,77.64 12.88,77.63 12.92))',4326)),
('ZONE-04','CRITICAL',91,ST_GeomFromText('POLYGON((77.67 12.90,77.72 12.93,77.72 12.87,77.67 12.86,77.67 12.90))',4326))
ON CONFLICT(zone_code) DO NOTHING`);
await pool.query(`INSERT INTO roads(road_code,name,risk_level,flooded,geometry) VALUES
('RD-01','MG Road','LOW',false,ST_GeomFromText('LINESTRING(77.61 12.935,77.635 12.942,77.66 12.95)',4326)),
('RD-02','80 Feet Road','HIGH',false,ST_GeomFromText('LINESTRING(77.62 12.94,77.65 12.95,77.675 12.965)',4326)),
('RD-03','Inner Ring Road','CRITICAL',true,ST_GeomFromText('LINESTRING(77.63 12.925,77.66 12.94,77.69 12.955)',4326))
ON CONFLICT(road_code) DO NOTHING`);
await pool.query(`INSERT INTO alerts(alert_code,level,location_label,message,zone) VALUES
('AL-904','CRITICAL','Zone 4','Heavy rainfall expected in Zone 4. Flood risk has crossed the emergency threshold.','Zone 4'),
('AL-887','HIGH','Kengeri','Drainage blockage reported near the main underpass.','Zone 2'),
('AL-841','INFO','Zone 7','Maintenance crew checked sensor connectivity.','Zone 7')
ON CONFLICT(alert_code) DO NOTHING`);
await pool.query(`INSERT INTO maintenance(task,asset_code,location_label,priority,crew,status,created_at) VALUES
('Clear Drain','DR-104','Koramangala 4th Block','CRITICAL','Crew Alpha','In Progress',NOW()-interval '1 day'),
('Inspect Manhole','DR-087','Kengeri','HIGH','Crew Bravo','Assigned',NOW()-interval '2 days'),
('Desilt Channel','DR-220','Whitefield','MEDIUM','Crew Delta','Scheduled',NOW()-interval '3 days'),
('Replace Sensor','SN-203','Zone 7','LOW','Crew Echo','Open',NOW()-interval '4 days')`);
console.log('AquaGuard demo data seeded. Demo citizen: demo@aquaguard.ai / password');
await pool.end();
