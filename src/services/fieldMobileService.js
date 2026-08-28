import api from './api';
export const fieldMobileService={
 async overview(){const {data}=await api.get('/field-operations/overview');return data},
 async updateTask(id,payload){const {data}=await api.patch(`/field-operations/tasks/${id}/field-update`,payload);return data}
};
