import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
} from 'react';

import { Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';

import * as authService from '../services/authService';
import {
  connectSocket,
  disconnectSocket,
} from '../services/socketService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const lastAlertRef = useRef('');
  const mountedRef = useRef(false);

  // Restore the saved login session.
  useEffect(() => {
    mountedRef.current = true;

    const bootstrap = async () => {
      try {
        const storedToken = await authService.getStoredToken();
        const storedUser = await authService.getStoredUser();

        if (!storedToken) {
          if (mountedRef.current) {
            setUser(null);
            setToken(null);
          }
          return;
        }

        // Restore the saved session immediately.
        if (mountedRef.current) {
          setToken(storedToken);
          setUser(storedUser || null);
        }

        try {
          // authService.getMe() returns res.data.data.user.
          const currentUser = await authService.getMe();

          if (
            currentUser &&
            typeof currentUser === 'object' &&
            mountedRef.current
          ) {
            const mergedUser = {
              ...(storedUser || {}),
              ...currentUser,
            };

            setUser(mergedUser);

            await SecureStore.setItemAsync(
              'user',
              JSON.stringify(mergedUser)
            );
          }
        } catch (error) {
          const status = error?.response?.status;

          if (status === 401 || status === 403) {
            // The server rejected the saved session.
            await authService.logout();

            if (mountedRef.current) {
              setUser(null);
              setToken(null);
            }
          } else {
            // Network or server error: retain the saved session.
            if (__DEV__) {
              console.warn(
                'Could not verify saved session:',
                error?.message
              );
            }

            if (mountedRef.current) {
              setUser(storedUser || null);
              setToken(storedToken);
            }
          }
        }
      } catch (error) {
        if (__DEV__) {
          console.error(
            'Authentication initialization failed:',
            error?.message
          );
        }

        if (mountedRef.current) {
          setUser(null);
          setToken(null);
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      mountedRef.current = false;
      disconnectSocket();
    };
  }, []);

  // Connect the socket for authenticated users.
  useEffect(() => {
    if (!user || !token) {
      disconnectSocket();
      return;
    }

    connectSocket((event, payload) => {
      const emergency = payload?.emergency;

      if (!emergency) return;

      const statusEvents = [
        'emergency:acknowledged',
        'emergency:assigned',
        'emergency:statusUpdated',
        'emergency:resolved',
        'emergency:cancelled',
      ];

      if (!statusEvents.includes(event)) return;

      const alertKey = `${emergency.id}-${emergency.status}`;

      if (lastAlertRef.current === alertKey) return;

      lastAlertRef.current = alertKey;

      Alert.alert(
        'Emergency Update',
        `Your emergency is now: ${String(
          emergency.status
        ).toUpperCase()}`
      );
    });

    return () => {
      disconnectSocket();
    };
  }, [user, token]);

  // Login.
  const login = async (credentials) => {
    const result = await authService.login(credentials);

    if (!result?.token || !result?.user) {
      throw new Error(
        'Invalid login response: user or token is missing.'
      );
    }

    setToken(result.token);
    setUser(result.user);

    return result.user;
  };

  // Register.
  const register = async (data) => {
    const result = await authService.register(data);

    if (!result?.token || !result?.user) {
      throw new Error(
        'Invalid registration response: user or token is missing.'
      );
    }

    setToken(result.token);
    setUser(result.user);

    return result.user;
  };

  // Logout.
  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setToken(null);
      lastAlertRef.current = '';
      disconnectSocket();
    }
  };

  // Update user information without removing existing fields.
  const updateUser = (partialUser) => {
    setUser((previousUser) => {
      if (!previousUser) return previousUser;

      const updatedUser = {
        ...previousUser,
        ...partialUser,
      };

      SecureStore.setItemAsync(
        'user',
        JSON.stringify(updatedUser)
      ).catch((error) => {
        if (__DEV__) {
          console.warn(
            'Could not save updated user:',
            error?.message
          );
        }
      });

      return updatedUser;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateUser,
        isAuthenticated: Boolean(user && token),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used within AuthProvider'
    );
  }

  return context;
};
