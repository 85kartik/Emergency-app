import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0f0c29' },
          headerTintColor: '#e9d5ff',
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#0f0c29' },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="home" options={{ title: 'Home', headerBackVisible: false }} />
        <Stack.Screen name="sos" options={{ title: 'SOS Emergency' }} />
        <Stack.Screen name="emergencies" options={{ title: 'My Emergencies' }} />
        <Stack.Screen name="emergency-details" options={{ title: 'Details' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        <Stack.Screen name="guides" options={{ title: 'Safety Manuals' }} />
        <Stack.Screen name="map" options={{ title: 'My Location' }} />
      </Stack>
    </AuthProvider>
  );
}
