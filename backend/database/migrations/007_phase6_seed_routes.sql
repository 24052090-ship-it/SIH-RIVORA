INSERT INTO roads(road_code,name,risk_level,flooded,geometry) VALUES
('RD-04','Koramangala Link','MEDIUM',false,ST_GeomFromText('LINESTRING(77.615 12.935,77.625 12.938,77.635 12.942)',4326)),
('RD-05','Richmond Connector','LOW',false,ST_GeomFromText('LINESTRING(77.635 12.942,77.645 12.946,77.655 12.951)',4326)),
('RD-06','East Bypass','HIGH',false,ST_GeomFromText('LINESTRING(77.655 12.951,77.665 12.958,77.675 12.965)',4326)),
('RD-07','Flooded Inner Link','CRITICAL',true,ST_GeomFromText('LINESTRING(77.635 12.942,77.645 12.950,77.655 12.960)',4326)),
('RD-08','Northern Safe Link','LOW',false,ST_GeomFromText('LINESTRING(77.615 12.935,77.625 12.955,77.645 12.970)',4326)),
('RD-09','Northern Connector','MEDIUM',false,ST_GeomFromText('LINESTRING(77.645 12.970,77.660 12.968,77.675 12.965)',4326))
ON CONFLICT(road_code) DO UPDATE SET risk_level=EXCLUDED.risk_level,flooded=EXCLUDED.flooded,geometry=EXCLUDED.geometry;

INSERT INTO route_nodes(node_code,name,location) VALUES
('N-KOR','Koramangala',ST_SetSRID(ST_MakePoint(77.615,12.935),4326)::geography),
('N-LINK','Koramangala Link',ST_SetSRID(ST_MakePoint(77.635,12.942),4326)::geography),
('N-RICH','Richmond Connector',ST_SetSRID(ST_MakePoint(77.655,12.951),4326)::geography),
('N-EAST','East Bypass',ST_SetSRID(ST_MakePoint(77.675,12.965),4326)::geography),
('N-NORTH1','Northern Safe Junction',ST_SetSRID(ST_MakePoint(77.625,12.955),4326)::geography),
('N-NORTH2','Northern Junction',ST_SetSRID(ST_MakePoint(77.645,12.970),4326)::geography),
('N-MG','MG Road',ST_SetSRID(ST_MakePoint(77.660,12.968),4326)::geography)
ON CONFLICT(node_code) DO NOTHING;

INSERT INTO route_edges(edge_code,from_node_id,to_node_id,road_code,geometry,length_km,speed_kmh,bidirectional)
SELECT v.edge_code,a.id,b.id,v.road_code,ST_GeomFromText(v.wkt,4326),v.length_km,v.speed_kmh,true
FROM (VALUES
('E-01','N-KOR','N-LINK','RD-04','LINESTRING(77.615 12.935,77.625 12.938,77.635 12.942)',2.4,30),
('E-02','N-LINK','N-RICH','RD-05','LINESTRING(77.635 12.942,77.645 12.946,77.655 12.951)',2.6,30),
('E-03','N-RICH','N-EAST','RD-06','LINESTRING(77.655 12.951,77.665 12.958,77.675 12.965)',2.7,28),
('E-04','N-LINK','N-RICH','RD-07','LINESTRING(77.635 12.942,77.645 12.950,77.655 12.960)',2.9,25),
('E-05','N-KOR','N-NORTH1','RD-08','LINESTRING(77.615 12.935,77.625 12.955)',2.5,32),
('E-06','N-NORTH1','N-NORTH2','RD-08','LINESTRING(77.625 12.955,77.645 12.970)',2.4,32),
('E-07','N-NORTH2','N-MG','RD-09','LINESTRING(77.645 12.970,77.660 12.968)',1.7,30),
('E-08','N-MG','N-EAST','RD-09','LINESTRING(77.660 12.968,77.675 12.965)',1.7,30)
) AS v(edge_code,from_code,to_code,road_code,wkt,length_km,speed_kmh)
JOIN route_nodes a ON a.node_code=v.from_code JOIN route_nodes b ON b.node_code=v.to_code
ON CONFLICT(edge_code) DO UPDATE SET geometry=EXCLUDED.geometry,length_km=EXCLUDED.length_km,speed_kmh=EXCLUDED.speed_kmh,road_code=EXCLUDED.road_code;
