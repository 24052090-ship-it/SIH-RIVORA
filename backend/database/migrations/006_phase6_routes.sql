CREATE TABLE IF NOT EXISTS route_nodes (
  id SERIAL PRIMARY KEY,
  node_code VARCHAR(40) UNIQUE NOT NULL,
  name VARCHAR(160) NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL
);

CREATE TABLE IF NOT EXISTS route_edges (
  id SERIAL PRIMARY KEY,
  edge_code VARCHAR(40) UNIQUE NOT NULL,
  from_node_id INTEGER NOT NULL REFERENCES route_nodes(id) ON DELETE CASCADE,
  to_node_id INTEGER NOT NULL REFERENCES route_nodes(id) ON DELETE CASCADE,
  road_code VARCHAR(40) REFERENCES roads(road_code) ON DELETE SET NULL,
  geometry GEOMETRY(LINESTRING, 4326) NOT NULL,
  length_km NUMERIC(8,3) NOT NULL,
  speed_kmh NUMERIC(6,2) NOT NULL DEFAULT 30,
  bidirectional BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_route_node_location ON route_nodes USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_route_edge_geometry ON route_edges USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_route_edge_from ON route_edges(from_node_id);
CREATE INDEX IF NOT EXISTS idx_route_edge_to ON route_edges(to_node_id);
