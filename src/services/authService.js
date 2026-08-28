import api from './api';
const USE_MOCKS=import.meta.env.VITE_USE_MOCK_DATA==='true';
export async function login(payload){if(USE_MOCKS){const name=payload.name||'Demo Citizen';return {user:{id:'demo',name,email:payload.email,role:payload.role||'citizen'},token:'demo-token'}}const {data}=await api.post('/auth/login',payload);return data}
export async function register(payload){if(USE_MOCKS)return {user:{id:'demo-new',name:payload.name,email:payload.email,role:payload.role},token:'demo-token'};const {data}=await api.post('/auth/register',payload);return data}
export async function me(){if(USE_MOCKS)return JSON.parse(localStorage.getItem('aquaguard_user'));const {data}=await api.get('/auth/me');return data.user}
export default {login,register,me};
