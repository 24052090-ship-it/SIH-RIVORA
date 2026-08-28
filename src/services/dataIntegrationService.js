import api from './api';
export const getDataIntegrationOverview=()=>api.get('/data-integration/overview');
export const stageDataset=(formData)=>api.post('/data-integration/stage-csv',formData,{headers:{'Content-Type':'multipart/form-data'}});
export const approveDataset=(id)=>api.post(`/data-integration/${id}/approve`);
