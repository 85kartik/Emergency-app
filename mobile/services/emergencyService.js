import api from './api';

export const createEmergency = async (payload) => {
  const res = await api.post('/api/emergencies', payload);
  return res.data.data.emergency;
};

export const getMyEmergencies = async (params = {}) => {
  const res = await api.get('/api/emergencies/my', { params });
  return res.data.data;
};

export const getEmergencyById = async (id) => {
  const res = await api.get(`/api/emergencies/${id}`);
  return res.data.data.emergency;
};

export const cancelEmergency = async (id, note) => {
  const res = await api.patch(`/api/emergencies/${id}/cancel`, { note });
  return res.data.data.emergency;
};
