import { io } from 'socket.io-client';
import { API_BASE_URL } from './api';
import { getStoredToken } from './authService';

let socket = null;
let eventHandler = null;

export const connectSocket = async (onEvent) => {
  eventHandler = onEvent || eventHandler;
  if (socket?.connected) return socket;

  const token = await getStoredToken();
  if (!token) return null;

  // Clean up any stale instances before reconnecting
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
  }

  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ['websocket', 'polling'], // Fallback to HTTP polling if websocket is blocked
    reconnection: true,
    reconnectionAttempts: 15,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 15000,
  });

  socket.on('connect', () => {
    if (__DEV__) console.log('[Socket] Connected successfully to', API_BASE_URL);
  });

  socket.on('connect_error', (err) => {
    if (__DEV__) console.warn('[Socket Connection Error]:', err.message);
  });

  socket.on('disconnect', (reason) => {
    if (__DEV__) console.log('[Socket] Disconnected:', reason);
  });

  const events = [
    'emergency:created',
    'emergency:acknowledged',
    'emergency:assigned',
    'emergency:statusUpdated',
    'emergency:resolved',
    'emergency:cancelled',
  ];

  events.forEach((evt) => {
    socket.off(evt);
    socket.on(evt, (payload) => {
      if (typeof eventHandler === 'function') {
        eventHandler(evt, payload);
      }
    });
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};

export const subscribeEmergency = (id) => {
  if (socket?.connected && id) {
    socket.emit('subscribe:emergency', id);
  }
};

export const unsubscribeEmergency = (id) => {
  if (socket?.connected && id) {
    socket.emit('unsubscribe:emergency', id);
  }
};

export const getSocket = () => socket;
