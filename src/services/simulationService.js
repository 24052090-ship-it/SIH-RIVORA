import api from './api';
import { simulationDefaults } from '../data/mockRisk';
export async function runFloodSimulation(payload){
  if(import.meta.env.VITE_USE_MOCK_DATA !== 'false'){
    const rainfall=Number(payload.rainfall||simulationDefaults.rainfall);
    const capacity=Number(payload.drainCapacity||simulationDefaults.drainCapacity);
    const blocked=Number(payload.blockedDrains||simulationDefaults.blockedDrains);
    const score=Math.min(99,Math.round(rainfall*.55+(100-capacity)*.25+blocked*.8));
    const level=score>=75?'CRITICAL':score>=50?'HIGH':score>=25?'MEDIUM':'LOW';
    return {score,level,affectedZones:Math.max(3,Math.round(score/6)),affectedRoads:Math.max(2,Math.round(score/10)),populationExposure:Math.round(score*137),recommendation:level==='CRITICAL'?'Deploy drainage crews and issue Zone 4 warning.':'Continue monitoring and prepare response teams.'};
  }
  const response=await api.post('/flood/simulate',payload);return response.data;
}
export default {runFloodSimulation};
