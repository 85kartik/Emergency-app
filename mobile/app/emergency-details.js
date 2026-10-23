import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, ScrollView,
  TouchableOpacity, Alert, Linking,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as emergencyService from '../services/emergencyService';
import { subscribeEmergency } from '../services/socketService';

const statusColors = {
  pending: '#f59e0b',
  acknowledged: '#3b82f6',
  assigned: '#8b5cf6',
  responding: '#06b6d4',
  resolved: '#22c55e',
  cancelled: '#64748b',
};

export default function EmergencyDetails() {
  const { id } = useLocalSearchParams();
  const [emergency, setEmergency] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      try {
        const e = await emergencyService.getEmergencyById(id);
        setEmergency(e);
        subscribeEmergency(id);
      } catch (err) {
        Alert.alert('Error', 'Could not load emergency');
        router.back();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleCancel = () => {
    Alert.alert('Cancel Emergency', 'Are you sure?', [
      { text: 'No' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            const updated = await emergencyService.cancelEmergency(id);
            setEmergency(updated);
          } catch (e) {
            Alert.alert('Error', e.response?.data?.message || 'Failed to cancel');
          }
        },
      },
    ]);
  };

  if (loading || !emergency) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color="#a78bfa" />
      </View>
    );
  }

  const sc = statusColors[emergency.status] || '#64748b';

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.glassCard}>
          <View style={[styles.statusBadge, { backgroundColor: sc + '33', borderColor: sc }]}>
            <Text style={[styles.statusText, { color: sc }]}>{emergency.status}</Text>
          </View>

          <Text style={styles.label}>Type</Text>
          <Text style={styles.value}>{emergency.type?.replace('_', ' ')}</Text>

          <Text style={styles.label}>Created</Text>
          <Text style={styles.value}>{new Date(emergency.createdAt).toLocaleString()}</Text>

          {emergency.description ? (
            <>
              <Text style={styles.label}>Description</Text>
              <Text style={styles.value}>{emergency.description}</Text>
            </>
          ) : null}

          {emergency.location?.latitude != null && (
            <>
              <Text style={styles.label}>Coordinates</Text>
              <Text style={styles.value}>
                {emergency.location.latitude}, {emergency.location.longitude}
              </Text>
              <TouchableOpacity
                style={{ marginTop: 8 }}
                onPress={() =>
                  Linking.openURL(
                    `https://www.google.com/maps?q=${emergency.location.latitude},${emergency.location.longitude}`
                  )
                }
              >
                <Text style={{ color: '#93c5fd', fontWeight: '600' }}>Open in Maps</Text>
              </TouchableOpacity>
            </>
          )}
          {emergency.location?.manualDescription ? (
            <>
              <Text style={styles.label}>Location</Text>
              <Text style={styles.value}>{emergency.location.manualDescription}</Text>
            </>
          ) : null}

          {emergency.statusHistory?.length > 0 && (
            <>
              <Text style={styles.label}>History</Text>
              {emergency.statusHistory.map((h, i) => (
                <View key={i} style={styles.historyRow}>
                  <View style={[styles.dot, { backgroundColor: statusColors[h.status] || '#64748b' }]} />
                  <Text style={styles.historyText}>
                    {h.status} · {new Date(h.changedAt).toLocaleString()}
                    {h.note ? `\n${h.note}` : ''}
                  </Text>
                </View>
              ))}
            </>
          )}
        </View>

        {['pending', 'acknowledged'].includes(emergency.status) && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.85}>
            <Text style={styles.cancelText}>Cancel Emergency</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0c29' },
  center: { justifyContent: 'center', alignItems: 'center' },
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24, padding: 22,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  statusBadge: {
    alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, marginBottom: 20,
  },
  statusText: { fontSize: 13, fontWeight: '800', textTransform: 'capitalize' },
  label: {
    fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase',
    letterSpacing: 1, marginTop: 14, marginBottom: 4,
  },
  value: { fontSize: 16, color: '#fff', fontWeight: '500', textTransform: 'capitalize' },
  historyRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6, marginRight: 10 },
  historyText: { flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 20 },
  cancelBtn: {
    marginTop: 24, backgroundColor: 'rgba(220,38,38,0.15)',
    borderWidth: 1, borderColor: 'rgba(248,113,113,0.35)',
    padding: 16, borderRadius: 16, alignItems: 'center',
  },
  cancelText: { color: '#fca5a5', fontWeight: '700', fontSize: 15 },
});
