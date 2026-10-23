import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, TextInput, Alert,
  ActivityIndicator, ScrollView, Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as emergencyService from '../services/emergencyService';
import useLocation from '../hooks/useLocation';

const TYPES = [
  { value: 'medical', label: 'Medical', emoji: '🏥', color: '#ef4444' },
  { value: 'road_accident', label: 'Accident', emoji: '🚗', color: '#f59e0b' },
  { value: 'fire', label: 'Fire', emoji: '🔥', color: '#f97316' },
  { value: 'crime', label: 'Crime', emoji: '🛡️', color: '#8b5cf6' },
  { value: 'other', label: 'Other', emoji: '⚠️', color: '#64748b' },
];

export default function SOS() {
  const [step, setStep] = useState('confirm');
  const [countdown, setCountdown] = useState(3);
  const [type, setType] = useState(null);
  const [description, setDescription] = useState('');
  const [manualLocation, setManualLocation] = useState('');
  const [emergency, setEmergency] = useState(null);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);
  const { location, error: locError, loading: locLoading, requestAndGet } = useLocation();
  const router = useRouter();

  // 3-second countdown on confirm screen
  useEffect(() => {
    if (step !== 'counting') return;
    setCountdown(3);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current);
          setStep('form');
          requestAndGet();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [step]);

  const startCountdown = () => setStep('counting');
  const cancelCountdown = () => {
    clearInterval(timerRef.current);
    setStep('confirm');
    setCountdown(3);
  };

  const handleSubmit = async () => {
    if (!type) {
      Alert.alert('Required', 'Please select an emergency type');
      return;
    }
    setStep('submitting');
    setError(null);
    try {
      const clientRequestId = `sos-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const payload = { type, description: description.trim() || undefined, clientRequestId };
      if (location) {
        payload.latitude = location.latitude;
        payload.longitude = location.longitude;
      }
      if (manualLocation.trim()) payload.manualLocation = manualLocation.trim();
      const result = await emergencyService.createEmergency(payload);
      setEmergency(result);
      setStep('done');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to submit emergency.';
      setError(msg);
      setStep('form');
      Alert.alert('Submission Failed', msg);
    }
  };

  const openMap = () => {
    if (!location) return;
    const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open maps'));
  };

  if (step === 'confirm' || step === 'counting') {
    return (
      <View style={styles.root}>
        <View style={styles.centerBox}>
          <View style={styles.glassCard}>
            <Text style={styles.confirmEmoji}>🚨</Text>
            <Text style={styles.confirmTitle}>
              {step === 'counting' ? 'Sending in...' : 'Confirm SOS'}
            </Text>

            {step === 'counting' ? (
              <>
                <Text style={styles.countdownNum}>{countdown}</Text>
                <Text style={styles.confirmText}>Release to cancel · Stay ready</Text>
                <TouchableOpacity style={styles.ghostBtn} onPress={cancelCountdown}>
                  <Text style={styles.ghostText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.confirmText}>
                  This alerts authorized responders. It does not auto-call police or ambulance.
                </Text>
                <Text style={styles.confirmWarn}>Only continue for a real emergency.</Text>
                <TouchableOpacity style={styles.dangerBtn} onPress={startCountdown}>
                  <Text style={styles.dangerBtnText}>Hold Ready – Start 3s Countdown</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ghostBtn} onPress={() => router.back()}>
                  <Text style={styles.ghostText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </View>
    );
  }

  if (step === 'done' && emergency) {
    return (
      <View style={styles.root}>
        <View style={styles.centerBox}>
          <View style={styles.glassCard}>
            <Text style={styles.doneEmoji}>✅</Text>
            <Text style={styles.doneTitle}>Emergency Reported</Text>
            <View style={styles.idPill}>
              <Text style={styles.idText}>ID: {String(emergency.id).slice(-8)}</Text>
            </View>
            <Text style={styles.doneStatus}>Status: {emergency.status}</Text>
            <Text style={styles.doneHint}>You'll get live alerts when status changes.</Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.replace(`/emergency-details?id=${emergency.id}`)}
            >
              <Text style={styles.primaryBtnText}>View Details</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn} onPress={() => router.replace('/home')}>
              <Text style={styles.ghostText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionTitle}>Emergency Type</Text>
        <View style={styles.typeGrid}>
          {TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[
                styles.typeCard,
                type === t.value && { borderColor: t.color, backgroundColor: t.color + '22' },
              ]}
              onPress={() => setType(t.value)}
            >
              <Text style={styles.typeEmoji}>{t.emoji}</Text>
              <Text style={[styles.typeLabel, type === t.value && { color: t.color }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {type && (
          <TouchableOpacity
            style={styles.guideLink}
            onPress={() => router.push(`/guides?type=${type}`)}
          >
            <Text style={styles.guideLinkText}>
              📖 View safety guide for {type.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Description</Text>
        <TextInput
          style={styles.textArea}
          multiline
          placeholder="Briefly describe the situation..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={description}
          onChangeText={setDescription}
          maxLength={1000}
        />

        <Text style={styles.sectionTitle}>Location</Text>
        {locLoading && <ActivityIndicator color="#a78bfa" style={{ marginVertical: 8 }} />}
        {location && (
          <View style={styles.locOk}>
            <Text style={styles.locOkText}>
              📍 {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
            </Text>
            <TouchableOpacity onPress={openMap}>
              <Text style={styles.mapLink}>Open in Maps</Text>
            </TouchableOpacity>
          </View>
        )}
        {locError && <Text style={styles.locError}>{locError}</Text>}
        <TextInput
          style={styles.input}
          placeholder="Or type a landmark / address..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={manualLocation}
          onChangeText={setManualLocation}
          maxLength={500}
        />
        {!location && (
          <TouchableOpacity style={styles.retryBtn} onPress={requestAndGet}>
            <Text style={styles.retryText}>Retry GPS</Text>
          </TouchableOpacity>
        )}

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          style={[styles.dangerBtn, step === 'submitting' && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={step === 'submitting'}
        >
          {step === 'submitting' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.dangerBtnText}>Submit Emergency</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0c29' },
  centerBox: { flex: 1, justifyContent: 'center', padding: 24 },
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 28, padding: 28,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
  },
  confirmEmoji: { fontSize: 48, marginBottom: 12 },
  confirmTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 12 },
  confirmText: { fontSize: 15, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  confirmWarn: { fontSize: 14, color: '#fca5a5', textAlign: 'center', marginBottom: 24, fontWeight: '600' },
  countdownNum: { fontSize: 72, fontWeight: '900', color: '#dc2626', marginVertical: 12 },
  doneEmoji: { fontSize: 48, marginBottom: 12 },
  doneTitle: { fontSize: 24, fontWeight: '800', color: '#4ade80', marginBottom: 12 },
  idPill: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginBottom: 8 },
  idText: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  doneStatus: { fontSize: 16, color: '#fff', fontWeight: '600', textTransform: 'capitalize', marginBottom: 8 },
  doneHint: { color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginBottom: 24 },
  form: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1, marginTop: 18, marginBottom: 12 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: { width: '30%', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 16, paddingVertical: 16, alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)' },
  typeEmoji: { fontSize: 26, marginBottom: 6 },
  typeLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  guideLink: { marginTop: 12, padding: 12, backgroundColor: 'rgba(124,58,237,0.15)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(167,139,250,0.3)' },
  guideLinkText: { color: '#c4b5fd', fontWeight: '600', fontSize: 13, textAlign: 'center' },
  textArea: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 14, minHeight: 90, color: '#fff', textAlignVertical: 'top', fontSize: 15 },
  input: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 14, color: '#fff', fontSize: 15, marginBottom: 8 },
  locOk: { backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  locOkText: { color: '#4ade80', fontSize: 13 },
  mapLink: { color: '#93c5fd', fontWeight: '600', marginTop: 6, fontSize: 13 },
  locError: { color: '#fbbf24', fontSize: 13, marginBottom: 8 },
  retryBtn: { alignSelf: 'flex-start', paddingVertical: 6 },
  retryText: { color: '#a78bfa', fontWeight: '600', fontSize: 14 },
  dangerBtn: { backgroundColor: '#dc2626', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 24, shadowColor: '#dc2626', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  dangerBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  primaryBtn: { backgroundColor: '#7c3aed', paddingVertical: 16, borderRadius: 16, alignItems: 'center', width: '100%', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  ghostBtn: { padding: 16, alignItems: 'center', marginTop: 4 },
  ghostText: { color: 'rgba(255,255,255,0.45)', fontSize: 15 },
  error: { color: '#fca5a5', marginTop: 12 },
});
