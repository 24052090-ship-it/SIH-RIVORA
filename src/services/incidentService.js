import api from './api';

export const getIncidentOverview = () =>
  api.get('/incidents/overview');

export const getIncident = (id) =>
  api.get(`/incidents/${id}`);

export const createIncident = (payload) =>
  api.post('/incidents', payload);

export const updateIncident = (id, payload) =>
  api.patch(`/incidents/${id}`, payload);

export const addIncidentAction = (id, payload) =>
  api.post(`/incidents/${id}/actions`, payload);