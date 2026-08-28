import axios from 'axios';

const defaultBase=import.meta.env.PROD
  ? '/api'
  : 'http://localhost:5000/api';

const api=axios.create({
  baseURL:import.meta.env.VITE_API_BASE_URL||defaultBase,
  headers:{'Content-Type':'application/json'}
});

api.interceptors.request.use(config=>{
  const token=localStorage.getItem('aquaguard_token');
  if(token)config.headers.Authorization=`Bearer ${token}`;
  return config;
});

export default api;
