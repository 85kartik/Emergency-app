import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// 1. Check for runtime environment variable (EXPO_PUBLIC_API_URL)
// 2. Check for app.json extra config (Constants.expoConfig?.extra?.apiUrl)
// 3. Fallback to local emulator / host in development
const configuredUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl;

const API_BASE_URL =
  configuredUrl && !configuredUrl.includes('yourdomain.com')
    ? configuredUrl
    : __DEV__
    ? Platform.select({
        android: 'http://10.0.2.2:5000',
        default: 'http://localhost:5000',
      })
    : 'https://api.yourdomain.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Attach Authorization token to outgoing requests
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // Ignore secure storage read failures in request preflight
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: automatically purge expired tokens on HTTP 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        await SecureStore.deleteItemAsync('authToken');
        await SecureStore.deleteItemAsync('user');
      } catch (e) {
        // Ignore deletion errors
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_BASE_URL };
