import api from './api';
import * as SecureStore from 'expo-secure-store';

export const register = async ({ name, email, password, phone }) => {
  const res = await api.post('/api/auth/register', { name, email, password, phone });
  const { token, user } = res.data.data;
  await SecureStore.setItemAsync('authToken', token);
  await SecureStore.setItemAsync('user', JSON.stringify(user));
  return { token, user };
};

export const login = async ({ email, password }) => {
  const res = await api.post('/api/auth/login', { email, password });
  const { token, user } = res.data.data;
  await SecureStore.setItemAsync('authToken', token);
  await SecureStore.setItemAsync('user', JSON.stringify(user));
  return { token, user };
};

export const logout = async () => {
  await SecureStore.deleteItemAsync('authToken');
  await SecureStore.deleteItemAsync('user');
};

export const getStoredUser = async () => {
  try {
    const raw = await SecureStore.getItemAsync('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const getStoredToken = async () => {
  try {
    return await SecureStore.getItemAsync('authToken');
  } catch {
    return null;
  }
};

export const getMe = async () => {
  const res = await api.get('/api/auth/me');
  return res.data.data.user;
};
