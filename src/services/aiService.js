import api from './api';
import { currentRisk } from '../data/mockRisk';

const USE_MOCKS = String(import.meta.env.VITE_USE_MOCK_DATA ?? import.meta.env.VITE_USE_MOCKS ?? 'true') !== 'false';

export async function getCurrentFloodPrediction(){
  if(USE_MOCKS) return {features:{},result:{probability:currentRisk.score/100,risk_level:currentRisk.level,confidence:Math.max(currentRisk.score,100-currentRisk.score)/100,model_version:'mock-phase4',factors:currentRisk.factors.map(f=>({label:f.label,value:f.value})),disclaimer:'Mock development data'}};
  const {data}=await api.get('/ai/current-risk');
  return data;
}

export async function predictFlood(features){
  if(USE_MOCKS) return getCurrentFloodPrediction();
  const {data}=await api.post('/ai/flood-predict',features); return data;
}
export async function predictFusion(features={}){if(USE_MOCKS)return{features,result:{risk_score:82.4,risk_level:'CRITICAL',model_probability:.84,signal_agreement:88.2,confidence:91.1,model_version:'aquaguard-hydrofusion-demo',factors:[{label:'XGBoost flood model',value:84,weight:48},{label:'3h rainfall nowcast',value:78,weight:16},{label:'Satellite water signal',value:64,weight:11},{label:'Soil saturation',value:76,weight:9},{label:'Sensor anomaly',value:81,weight:10},{label:'Citizen reports',value:56,weight:6}],recommended_actions:['Pre-position response crews in critical wards','Clear priority drains and culverts','Issue route restrictions for flooded corridors','Push citizen warning to affected geofences'],disclaimer:'Demo fusion score for SIH interface preview.'}};return(await api.post('/ai/fusion',features)).data}
