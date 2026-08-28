import api from './api';
export async function getFieldOperations(){const {data}=await api.get('/field-operations/overview');return data;}
export async function createDispatchTask(payload){const {data}=await api.post('/field-operations/tasks',payload);return data;}
export async function updateDispatchTask(id,payload){const {data}=await api.patch(`/field-operations/tasks/${id}`,payload);return data;}
