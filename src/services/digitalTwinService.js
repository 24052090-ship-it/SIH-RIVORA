import api from './api';
export async function getDigitalTwinOverview(){const r=await api.get('/digital-twin/overview');return r.data;}
export async function runDigitalTwinScenario(payload){const r=await api.post('/digital-twin/scenario',payload);return r.data;}
export default {getDigitalTwinOverview,runDigitalTwinScenario};
