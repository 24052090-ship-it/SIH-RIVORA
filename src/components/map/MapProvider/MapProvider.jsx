import { createContext, useContext } from 'react';
const MapContext=createContext({provider:'openstreetmap', satellite:false});
export function MapProvider({children}){const provider=import.meta.env.VITE_MAP_PROVIDER||'openstreetmap';const satellite=String(import.meta.env.VITE_ENABLE_SATELLITE||'false')==='true' && Boolean(import.meta.env.VITE_SATELLITE_TILE_URL);return <MapContext.Provider value={{provider,satellite}}>{children}</MapContext.Provider>}
export const useMapProvider=()=>useContext(MapContext);
