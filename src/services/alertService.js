import api from './api';

const USE_MOCKS =
  import.meta.env.VITE_USE_MOCK_DATA === 'true';

export const getAlerts = async () => {
  if (USE_MOCKS) {
    return null;
  }

  const { data } = await api.get('/alerts');

  return data;
};

export const createAlert = async (payload) => {
  if (USE_MOCKS) {
    return {
      skipped: true,
      message: 'Mock mode enabled',
    };
  }

  const { data } = await api.post('/alerts', payload);

  return data;
};

export default {
  getAlerts,
  createAlert,
};