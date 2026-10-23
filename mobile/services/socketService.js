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

  socket = io(API_BASE_URL, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 10,
  });

  socket.on('connect', () => console.log('Socket connected'));
  socket.on('disconnect', () => console.log('Socket disconnected'));

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
      if (eventHandler) eventHandler(evt, payload);
    });
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const subscribeEmergency = (id) => {
  if (socket?.connected) {
    socket.emit('subscribe:emergency', id);
  }
};

export const getSocket = () => socket;
