import api from './api';
const USE_MOCKS = import.meta.env.VITE_USE_MOCK_DATA === 'true';
export async function analyzeImage(file) {
  if (USE_MOCKS) return { model_version: 'mock-vision-v1', label: 'blocked_drain', severity: 'HIGH', confidence: 0.92, detections: [{ label: 'blocked_drain', confidence: 0.92, severity: 'HIGH', bbox: [120, 80, 520, 430] }], status: 'DEMO', disclaimer: 'Demo result. Connect the trained AquaGuard YOLO model for real inference.' };
  const form = new FormData(); form.append('file', file);
  const { data } = await api.post('/vision/analyze-image', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 70000 });
  return data;
}
export async function getVisionStatus(){ const {data}=await api.get('/vision/status'); return data; }
export default { analyzeImage, getVisionStatus };
