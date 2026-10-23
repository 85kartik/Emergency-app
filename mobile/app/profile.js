import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import * as userService from '../services/userService';
import * as SecureStore from 'expo-secure-store';

export default function Profile() {
  const { user, loading, logout, updateUser } = useAuth();
  const router = useRouter();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [ecName, setEcName] = useState('');
  const [ecPhone, setEcPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwdText, setShowPwdText] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    setName(user.name || user.fullName || '');
    setPhone(user.phone || '');
    setEcName(
      user.emergencyContactName ||
      user.emergency_contact_name ||
      ''
    );
    setEcPhone(
      user.emergencyContactPhone ||
      user.emergency_contact_phone ||
      ''
    );
  }, [user]);

  const handleCancelEdit = () => {
    if (user) {
      setName(user.name || user.fullName || '');
      setPhone(user.phone || '');
      setEcName(
        user.emergencyContactName ||
        user.emergency_contact_name ||
        ''
      );
      setEcPhone(
        user.emergencyContactPhone ||
        user.emergency_contact_phone ||
        ''
      );
    }
    setEditing(false);
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            router.replace('/login');
          } catch (error) {
            Alert.alert('Error', 'Could not sign out. Please try again.');
          }
        },
      },
    ]);
  };

  const handleSaveProfile = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      Alert.alert('Invalid Name', 'Name must be at least 2 characters.');
      return;
    }

    const trimmedPhone = phone.trim();
    if (trimmedPhone && !/^[+]?[\d\s\-()]{7,20}$/.test(trimmedPhone)) {
      Alert.alert('Invalid Phone', 'Please enter a valid personal phone number (7-20 digits).');
      return;
    }

    const trimmedEcPhone = ecPhone.trim();
    if (trimmedEcPhone && !/^[+]?[\d\s\-()]{7,20}$/.test(trimmedEcPhone)) {
      Alert.alert('Invalid Contact Phone', 'Please enter a valid emergency contact phone number (7-20 digits).');
      return;
    }

    if (saving) return;
    setSaving(true);

    try {
      const payload = {
        name: trimmedName,
        phone: trimmedPhone || '',
        emergencyContactName: ecName.trim() || '',
        emergencyContactPhone: trimmedEcPhone || '',
      };

      const response = await userService.updateProfile(payload);

      // Support various API response wrapper formats
      const updated =
        response?.user ??
        response?.data?.user ??
        response?.data ??
        response;

      if (!updated || typeof updated !== 'object') {
        throw new Error('Invalid profile response from server.');
      }

      const mergedUser = {
        ...user,
        ...updated,
        ...payload,
        email: updated.email ?? user.email,
      };

      // Update React authentication state
      if (typeof updateUser === 'function') {
        updateUser(mergedUser);
      }

      // Persist locally
      await SecureStore.setItemAsync(
        'user',
        JSON.stringify(mergedUser)
      );

      setEditing(false);
      Alert.alert('Success', 'Profile and emergency contact updated successfully.');
    } catch (error) {
      Alert.alert(
        'Update Failed',
        error?.response?.data?.message ||
          error?.message ||
          'Could not update your profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Required', 'Please fill in all password fields.');
      return;
    }

    if (newPassword.length < 8) {
      Alert.alert('Invalid Password', 'New password must be at least 8 characters.');
      return;
    }

    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      Alert.alert('Invalid Password', 'New password must contain at least one letter and one number.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New passwords do not match.');
      return;
    }

    if (pwdSaving) return;
    setPwdSaving(true);

    try {
      await userService.changePassword({
        currentPassword,
        newPassword,
      });

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);

      Alert.alert('Success', 'Password updated successfully.');
    } catch (error) {
      Alert.alert(
        'Password Update Failed',
        error?.response?.data?.message ||
          error?.message ||
          'Could not update your password.'
      );
    } finally {
      setPwdSaving(false);
    }
  };

  if (loading || !user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#a78bfa" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const displayName = user.name || user.fullName || 'Citizen';
  const displayEmail = user.email || 'Not available';
  const displayPhone = user.phone || 'Not set';
  const displayEcName =
    user.emergencyContactName ||
    user.emergency_contact_name ||
    'Not set';
  const displayEcPhone =
    user.emergencyContactPhone ||
    user.emergency_contact_phone ||
    'Not set';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Profile header */}
          <View style={styles.headerCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>

            <Text style={styles.displayName}>{displayName}</Text>

            <View style={styles.rolePill}>
              <Text style={styles.roleText}>
                {user.role || 'citizen'}
              </Text>
            </View>
          </View>

          {/* Quick Edit/Cancel action bar */}
          <View style={styles.modeBar}>
            <Text style={styles.modeBarTitle}>
              {editing ? 'Editing Profile & Contacts' : 'Your Information'}
            </Text>
            {!editing ? (
              <TouchableOpacity
                style={styles.editChip}
                onPress={() => setEditing(true)}
              >
                <Text style={styles.editChipText}>✏️ Edit Profile</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.cancelChipBtn}
                onPress={handleCancelEdit}
              >
                <Text style={styles.cancelChipText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Profile details */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Account Details</Text>

            <Text style={styles.label}>Email (Cannot be changed)</Text>
            <View style={styles.boxDisabled}>
              <Text style={styles.boxDisabledText}>{displayEmail}</Text>
            </View>

            <Text style={styles.label}>Full Name</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoCapitalize="words"
              />
            ) : (
              <View style={styles.box}>
                <Text style={styles.boxText}>{displayName}</Text>
              </View>
            )}

            <Text style={styles.label}>Phone Number</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+91 98765 43210"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
            ) : (
              <View style={styles.box}>
                <Text style={styles.boxText}>{displayPhone}</Text>
              </View>
            )}
          </View>

          {/* Emergency contact section */}
          <View style={styles.sectionCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Emergency Contact</Text>
              <Text style={styles.shieldEmoji}>🛡️</Text>
            </View>
            <Text style={styles.hint}>
              Responders and authorities will contact this person during an emergency.
            </Text>

            <Text style={styles.label}>Contact Name</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={ecName}
                onChangeText={setEcName}
                placeholder="Parent / Spouse / Friend name"
                placeholderTextColor="rgba(255,255,255,0.3)"
                autoCapitalize="words"
              />
            ) : (
              <View style={styles.box}>
                <Text style={styles.boxText}>{displayEcName}</Text>
              </View>
            )}

            <Text style={styles.label}>Contact Phone</Text>
            {editing ? (
              <TextInput
                style={styles.input}
                value={ecPhone}
                onChangeText={setEcPhone}
                keyboardType="phone-pad"
                placeholder="+91 98765 43210"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
            ) : (
              <View style={styles.box}>
                <Text style={styles.boxText}>{displayEcPhone}</Text>
              </View>
            )}
          </View>

          {/* Sticky/Prominent Save and Cancel buttons when editing */}
          {editing && (
            <View style={styles.editActionContainer}>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.disabled]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveText}>Save All Changes</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleCancelEdit}
                disabled={saving}
              >
                <Text style={styles.cancelBtnText}>Discard Changes</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Change password */}
          <View style={styles.sectionCard}>
            <TouchableOpacity
              style={styles.rowBetween}
              onPress={() => setShowPassword(!showPassword)}
            >
              <Text style={styles.sectionTitle}>Security & Password</Text>
              <Text style={styles.arrow}>
                {showPassword ? '▲ Close' : '▼ Change'}
              </Text>
            </TouchableOpacity>

            {showPassword && (
              <View style={styles.pwdSection}>
                <View style={styles.rowBetween}>
                  <Text style={styles.label}>Current Password</Text>
                  <TouchableOpacity onPress={() => setShowPwdText(!showPwdText)}>
                    <Text style={styles.togglePwdText}>
                      {showPwdText ? 'Hide' : 'Show'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={styles.input}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry={!showPwdText}
                  placeholder="Enter current password"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />

                <Text style={styles.label}>New Password (Min 8 chars, letter & number)</Text>
                <TextInput
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry={!showPwdText}
                  placeholder="Min 8 characters"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />

                <Text style={styles.label}>Confirm New Password</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPwdText}
                  placeholder="Re-enter new password"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                />

                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    styles.passwordBtn,
                    pwdSaving && styles.disabled,
                  ]}
                  onPress={handleChangePassword}
                  disabled={pwdSaving}
                >
                  {pwdSaving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveText}>Update Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Logout */}
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: '#0f0c29' },
  center: {
    flex: 1,
    backgroundColor: '#0f0c29',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
  },
  scroll: {
    padding: 20,
    paddingBottom: 50,
  },
  headerCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    marginBottom: 16,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(124,58,237,0.4)',
    borderWidth: 2,
    borderColor: 'rgba(167,139,250,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#e9d5ff',
  },
  displayName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  rolePill: {
    marginTop: 8,
    backgroundColor: 'rgba(167,139,250,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.35)',
  },
  roleText: {
    color: '#c4b5fd',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  modeBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  modeBarTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
  },
  editChip: {
    backgroundColor: 'rgba(124,58,237,0.35)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.5)',
  },
  editChipText: {
    color: '#e9d5ff',
    fontWeight: '700',
    fontSize: 13,
  },
  cancelChipBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  cancelChipText: {
    color: '#fca5a5',
    fontWeight: '600',
    fontSize: 13,
  },
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 14,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  shieldEmoji: {
    fontSize: 18,
  },
  hint: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10,
    lineHeight: 16,
  },
  label: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 6,
  },
  box: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  boxText: {
    color: '#fff',
    fontSize: 15,
  },
  boxDisabled: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  boxDisabledText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.4)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 15,
  },
  editActionContainer: {
    marginBottom: 14,
  },
  saveBtn: {
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  cancelBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cancelBtnText: {
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    fontSize: 14,
  },
  pwdSection: {
    marginTop: 10,
  },
  passwordBtn: {
    backgroundColor: '#2563eb',
    marginTop: 14,
  },
  saveText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  disabled: {
    opacity: 0.6,
  },
  arrow: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '600',
  },
  togglePwdText: {
    color: '#a78bfa',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutBtn: {
    marginTop: 8,
    backgroundColor: 'rgba(220,38,38,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.4)',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fca5a5',
    fontWeight: '700',
    fontSize: 15,
  },
});
