import api from './api';
export const getEmergencyOverview=()=>api.get('/emergency/overview');
export const getNearbySafety=(lat,lng,radius=5000)=>api.get('/emergency/nearby',{params:{lat,lng,radius}});
export const createEmergencyBroadcast=payload=>api.post('/emergency/broadcasts',payload);
export const sendEmergencyBroadcast=id=>api.post(`/emergency/broadcasts/${id}/send`);
