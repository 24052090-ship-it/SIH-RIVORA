import api from './api';
export const getValidationSummary = () => api.get('/validation/summary');
export const getDataQuality = () => api.get('/validation/data-quality');
