import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as emergencyService from '../services/emergencyService';

const statusColors = {
  pending: '#f59e0b',
  acknowledged: '#3b82f6',
  assigned: '#8b5cf6',
  responding: '#06b6d4',
  resolved: '#22c55e',
  cancelled: '#64748b',
};

export default function Emergencies() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const res = await emergencyService.getMyEmergencies({ limit: 50 });
      setData(res.emergencies || []);
    } catch (e) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color="#a78bfa" />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={[styles.orb, styles.orb1]} />
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor="#a78bfa"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.empty}>No emergencies yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/emergency-details?id=${item.id}`)}
            activeOpacity={0.8}
          >
            <View style={styles.row}>
              <Text style={styles.type}>{item.type?.replace('_', ' ')}</Text>
              <View style={[styles.badge, { backgroundColor: (statusColors[item.status] || '#64748b') + '33', borderColor: statusColors[item.status] || '#64748b' }]}>
                <Text style={[styles.badgeText, { color: statusColors[item.status] || '#94a3b8' }]}>
                  {item.status}
                </Text>
              </View>
            </View>
            <Text style={styles.date}>{new Date(item.createdAt).toLocaleString()}</Text>
            {item.description ? (
              <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
            ) : null}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0c29' },
  center: { justifyContent: 'center', alignItems: 'center' },
  orb: { position: 'absolute', borderRadius: 999, opacity: 0.35 },
  orb1: { width: 220, height: 220, backgroundColor: '#7c3aed', top: -60, right: -40 },
  list: { padding: 16, paddingBottom: 40 },
  emptyBox: { alignItems: 'center', marginTop: 80 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  empty: { color: 'rgba(255,255,255,0.4)', fontSize: 16 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18, padding: 18, marginBottom: 12,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  type: { fontSize: 16, fontWeight: '700', textTransform: 'capitalize', color: '#fff' },
  badge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  date: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8 },
  desc: { fontSize: 14, color: 'rgba(255,255,255,0.55)', marginTop: 6 },
});
