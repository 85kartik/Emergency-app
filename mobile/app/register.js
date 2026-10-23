import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView, Dimensions,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert('Error', 'Name, email and password are required');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
      });
      router.replace('/home');
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      Alert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.glassCard}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join as a citizen</Text>

            {[
              { label: 'Full Name', value: name, set: setName, placeholder: 'John Doe' },
              { label: 'Email', value: email, set: setEmail, placeholder: 'you@example.com', props: { autoCapitalize: 'none', keyboardType: 'email-address' } },
              { label: 'Password', value: password, set: setPassword, placeholder: 'Min 8 chars + letter + number', props: { secureTextEntry: true } },
              { label: 'Phone (optional)', value: phone, set: setPhone, placeholder: '+91 98765 43210', props: { keyboardType: 'phone-pad' } },
            ].map((f) => (
              <View key={f.label} style={styles.inputWrap}>
                <Text style={styles.inputLabel}>{f.label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={f.placeholder}
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  value={f.value}
                  onChangeText={f.set}
                  editable={!loading}
                  {...(f.props || {})}
                />
              </View>
            ))}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
            </TouchableOpacity>

            <Link href="/login" asChild>
              <TouchableOpacity style={styles.link}>
                <Text style={styles.linkText}>
                  Already have an account? <Text style={styles.linkBold}>Sign in</Text>
                </Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0c29' },
  orb: { position: 'absolute', borderRadius: 999, opacity: 0.5 },
  orb1: { width: 260, height: 260, backgroundColor: '#7c3aed', top: -40, right: -60 },
  orb2: { width: 200, height: 200, backgroundColor: '#dc2626', bottom: 40, left: -50 },
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 28, padding: 28,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginTop: 6, marginBottom: 24 },
  inputWrap: { marginBottom: 14 },
  inputLabel: {
    color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: '600',
    marginBottom: 6, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#fff',
  },
  button: {
    backgroundColor: '#7c3aed', paddingVertical: 16, borderRadius: 14,
    alignItems: 'center', marginTop: 8,
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  link: { marginTop: 20, alignItems: 'center' },
  linkText: { color: 'rgba(255,255,255,0.55)', fontSize: 14 },
  linkBold: { color: '#a78bfa', fontWeight: '700' },
});
