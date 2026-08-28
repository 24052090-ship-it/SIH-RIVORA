import api from './api';
const USE_MOCKS=import.meta.env.VITE_USE_MOCK_DATA==='true';
export async function getCitizenSummary(){if(USE_MOCKS)return {rainfall:32,risk:{zone_code:'ZONE-04',risk_level:'MEDIUM',risk_score:48},activeAlerts:3,myReports:5};const {data}=await api.get('/dashboard/citizen');return data}
export async function getAuthoritySummary(){if(USE_MOCKS)return {activeAlerts:12,highRiskZones:7,blockedDrains:18,citizenReports:43,maintenanceTasks:15};const {data}=await api.get('/dashboard/authority');return data}
export default {getCitizenSummary,getAuthoritySummary};
