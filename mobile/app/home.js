import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

export default function Home() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <View style={styles.root}>
      <View style={styles.container}>
        <View style={styles.headerGlass}>
          <View>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.name}>{user?.name || 'Citizen'}</Text>
          </View>
          <View style={styles.rolePill}>
            <Text style={styles.roleText}>{user?.role || 'citizen'}</Text>
          </View>
        </View>

        {/* Emergency contact strip */}
        {user?.emergencyContactName || user?.emergencyContactPhone ? (
          <TouchableOpacity
            style={styles.ecStrip}
            onPress={() => router.push('/profile')}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.ecLabel}>Emergency contact</Text>
              <Text style={styles.ecEditHint}>Edit in Profile →</Text>
            </View>
            <Text style={styles.ecValue}>
              {user?.emergencyContactName || 'Contact'}
              {user?.emergencyContactPhone ? ` · ${user.emergencyContactPhone}` : ''}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.ecStripEmpty}
            onPress={() => router.push('/profile')}
            activeOpacity={0.85}
          >
            <Text style={styles.ecEmptyText}>
              ⚠️ No emergency contact set · <Text style={styles.ecEmptyLink}>Add in Profile</Text>
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.sosOuter}
          onPress={() => router.push('/sos')}
          activeOpacity={0.9}
        >
          <View style={styles.sosRing}>
            <View style={styles.sosInner}>
              <Text style={styles.sosText}>SOS</Text>
              <Text style={styles.sosSub}>TAP FOR HELP</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/emergencies')}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(59,130,246,0.25)' }]}>
              <Text style={styles.actionEmoji}>📋</Text>
            </View>
            <Text style={styles.actionTitle}>My Emergencies</Text>
            <Text style={styles.actionDesc}>History & status</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/guides')}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(34,197,94,0.25)' }]}>
              <Text style={styles.actionEmoji}>📖</Text>
            </View>
            <Text style={styles.actionTitle}>Safety Manuals</Text>
            <Text style={styles.actionDesc}>Do & don't guides</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/map')}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(14,165,233,0.25)' }]}>
              <Text style={styles.actionEmoji}>🗺️</Text>
            </View>
            <Text style={styles.actionTitle}>My Location</Text>
            <Text style={styles.actionDesc}>Map & coordinates</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/profile')}>
            <View style={[styles.actionIcon, { backgroundColor: 'rgba(168,85,247,0.25)' }]}>
              <Text style={styles.actionEmoji}>👤</Text>
            </View>
            <Text style={styles.actionTitle}>Profile</Text>
            <Text style={styles.actionDesc}>Account & contacts</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleSignOut} activeOpacity={0.85}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          This app does not automatically contact police or ambulance.
          It alerts authorized responders in this system.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0c29' },
  container: { flex: 1, padding: 20 },
  headerGlass: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', marginBottom: 12,
  },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.55)' },
  name: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 2 },
  rolePill: {
    backgroundColor: 'rgba(167,139,250,0.25)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(167,139,250,0.4)',
  },
  roleText: { color: '#c4b5fd', fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  ecStrip: {
    backgroundColor: 'rgba(220,38,38,0.12)', borderRadius: 14, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.25)',
  },
  ecLabel: { fontSize: 11, color: 'rgba(252,165,165,0.8)', textTransform: 'uppercase', letterSpacing: 0.8 },
  ecEditHint: { fontSize: 11, color: 'rgba(252,165,165,0.6)', fontWeight: '600' },
  ecValue: { color: '#fecaca', fontSize: 14, fontWeight: '600', marginTop: 4 },
  ecStripEmpty: {
    backgroundColor: 'rgba(245,158,11,0.12)', borderRadius: 14, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)', alignItems: 'center',
  },
  ecEmptyText: { color: '#fbbf24', fontSize: 13, fontWeight: '600' },
  ecEmptyLink: { color: '#fde047', fontWeight: '800', textDecorationLine: 'underline' },
  sosOuter: { alignSelf: 'center', marginVertical: 8 },
  sosRing: {
    width: width * 0.48, height: width * 0.48, borderRadius: width * 0.24,
    backgroundColor: 'rgba(220,38,38,0.15)', borderWidth: 2, borderColor: 'rgba(254,202,202,0.35)',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#dc2626', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 28, elevation: 14,
  },
  sosInner: {
    width: width * 0.36, height: width * 0.36, borderRadius: width * 0.18,
    backgroundColor: '#dc2626', justifyContent: 'center', alignItems: 'center',
  },
  sosText: { color: '#fff', fontSize: 34, fontWeight: '900', letterSpacing: 4 },
  sosSub: { color: 'rgba(255,255,255,0.75)', fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 14 },
  actionCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)',
  },
  actionIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  actionEmoji: { fontSize: 20 },
  actionTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  actionDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 3 },
  logoutBtn: {
    marginTop: 20, backgroundColor: 'rgba(220,38,38,0.15)', borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)', paddingVertical: 14, borderRadius: 16, alignItems: 'center',
  },
  logoutText: { color: '#fca5a5', fontWeight: '700', fontSize: 15 },
  disclaimer: {
    marginTop: 'auto', fontSize: 11, color: 'rgba(255,255,255,0.3)',
    textAlign: 'center', lineHeight: 16, paddingHorizontal: 8, paddingBottom: 8, paddingTop: 12,
  },
});
