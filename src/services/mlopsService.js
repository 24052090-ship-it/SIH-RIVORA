import api from './api';
export const getMLOpsOverview=()=>api.get('/mlops/overview');
export const logPrediction=(payload)=>api.post('/mlops/predictions',payload);
export const logDriftMetric=(payload)=>api.post('/mlops/drift',payload);
