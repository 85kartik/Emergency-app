import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login, user, loading: authLoading } = useAuth();
  const router = useRouter();

  // If already logged in, navigate directly to home
  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/home');
    }
  }, [user, authLoading, router]);

  const handleLogin = async () => {
    setErrorMsg('');
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      Alert.alert('Required', 'Please enter both email and password.');
      return;
    }

    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      await login({
        email: trimmedEmail,
        password,
      });
      router.replace('/home');
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Login failed. Please check your credentials and try again.';
      setErrorMsg(msg);
      Alert.alert('Sign In Failed', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* Ambient background glow orbs */}
      <View style={[styles.orb, styles.orb1]} />
      <View style={[styles.orb, styles.orb2]} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.glassCard}>
            <View style={styles.badgeWrap}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>EMERGENCY RESPONSE</Text>
              </View>
            </View>

            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to access emergency services</Text>

            {errorMsg ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* Email input */}
            <View style={styles.inputWrap}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (errorMsg) setErrorMsg('');
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                editable={!submitting}
              />
            </View>

            {/* Password input */}
            <View style={styles.inputWrap}>
              <View style={styles.passwordHeader}>
                <Text style={styles.inputLabel}>Password</Text>
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.toggleText}>
                    {showPassword ? 'Hide' : 'Show'}
                  </Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.input}
                placeholder="Enter your password"
                placeholderTextColor="rgba(255,255,255,0.35)"
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (errorMsg) setErrorMsg('');
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!submitting}
              />
            </View>

            {/* Sign in button */}
            <TouchableOpacity
              style={[styles.button, submitting && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Link to register */}
            <Link href="/register" asChild>
              <TouchableOpacity style={styles.link} disabled={submitting}>
                <Text style={styles.linkText}>
                  Don't have an account? <Text style={styles.linkBold}>Create one</Text>
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
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: '#0f0c29' },
  orb: { position: 'absolute', borderRadius: 999, opacity: 0.5 },
  orb1: {
    width: 260,
    height: 260,
    backgroundColor: '#7c3aed',
    top: -40,
    right: -60,
  },
  orb2: {
    width: 220,
    height: 220,
    backgroundColor: '#dc2626',
    bottom: 30,
    left: -50,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 28,
    padding: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  badgeWrap: {
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: 'rgba(220,38,38,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.35)',
  },
  badgeText: {
    color: '#fca5a5',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 22,
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.4)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputWrap: {
    marginBottom: 16,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleText: {
    color: '#a78bfa',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginRight: 4,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
  },
  button: {
    backgroundColor: '#7c3aed',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  link: {
    marginTop: 22,
    alignItems: 'center',
  },
  linkText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
  },
  linkBold: {
    color: '#a78bfa',
    fontWeight: '700',
  },
});
