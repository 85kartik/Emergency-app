import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Android Emulator → use 10.0.2.2
// Physical phone → use your PC IP (e.g. http://192.168.1.x:5000)
// Web / iOS Simulator → use http://localhost:5000
const API_BASE_URL = Platform.select({
  android: 'http://10.0.2.2:5000',
  default: 'http://localhost:5000',
});

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // ignore
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await SecureStore.deleteItemAsync('authToken');
        await SecureStore.deleteItemAsync('user');
      } catch (e) {}
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE_URL };
