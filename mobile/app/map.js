import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Alert,
  ScrollView,
  Platform,
  Share,
  Image,
} from 'react-native';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';

const CACHE_KEY = 'lastKnownLocation';

export default function MapScreen() {
  const [location, setLocation] = useState(null);
  const [cached, setCached] = useState(null);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const [mapImageError, setMapImageError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await SecureStore.getItemAsync(CACHE_KEY);
        if (raw) {
          const data = JSON.parse(raw);
          setCached(data);
          setLocation(data);
          setIsCached(true);
          if (data.formattedAddress) {
            setAddress(data.formattedAddress);
          }
        }
      } catch (e) {
        // Ignore cache parse errors
      }
      refreshLocation();
    })();
  }, []);

  const reverseGeocode = async (coords) => {
    try {
      const results = await Location.reverseGeocodeAsync({
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      if (results && results.length > 0) {
        const item = results[0];
        const parts = [
          item.name,
          item.street,
          item.district || item.subregion,
          item.city,
          item.region,
          item.postalCode,
          item.country,
        ].filter(Boolean);

        const formatted = parts.join(', ');
        setAddress(formatted);
        return formatted;
      }
    } catch (err) {
      // Geocoding may fail offline, non-fatal
    }
    return '';
  };

  const refreshLocation = async () => {
    setLoading(true);
    setError(null);
    setMapImageError(false);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied. Showing saved position if available.');
        setLoading(false);
        return;
      }

      let pos;
      try {
        pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      } catch (gpsErr) {
        // Fallback to last known position if live lock is slow or indoors
        pos = await Location.getLastKnownPositionAsync();
        if (!pos) throw gpsErr;
      }

      const coords = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        savedAt: new Date().toISOString(),
      };

      const addr = await reverseGeocode(coords);
      coords.formattedAddress = addr;

      setLocation(coords);
      setCached(coords);
      setIsCached(false);

      await SecureStore.setItemAsync(CACHE_KEY, JSON.stringify(coords));
    } catch (e) {
      setError('Could not get live GPS signal. Showing last saved location.');
      if (cached) {
        setLocation(cached);
        setIsCached(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const display = location || cached;
  const lat = display && typeof display.latitude === 'number'
    ? display.latitude
    : parseFloat(display?.latitude);
  const lng = display && typeof display.longitude === 'number'
    ? display.longitude
    : parseFloat(display?.longitude);
  const hasValidCoords = !isNaN(lat) && !isNaN(lng);

  const openMaps = (type) => {
    if (!hasValidCoords) {
      Alert.alert('No Location', 'Please wait for your location to load or tap Refresh GPS.');
      return;
    }

    let url = '';
    if (type === 'google') {
      url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    } else if (type === 'apple') {
      url = `https://maps.apple.com/?ll=${lat},${lng}&q=My+Location`;
    } else {
      // Default system map
      url = Platform.select({
        ios: `maps://?ll=${lat},${lng}&q=My+Location`,
        default: `geo:${lat},${lng}?q=${lat},${lng}`,
      });
    }

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(url);
        }
        // Fallback to web Google Maps
        return Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`);
      })
      .catch(() => {
        Alert.alert('Error', 'Could not open maps application.');
      });
  };

  const handleShareLocation = async () => {
    if (!hasValidCoords) {
      Alert.alert('No Location', 'Please wait for your location to load first.');
      return;
    }

    const message = [
      '🚨 EMERGENCY - MY CURRENT LOCATION:',
      address ? `📍 Address: ${address}` : null,
      `🌐 Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      `🗺️ Google Maps: https://www.google.com/maps?q=${lat},${lng}`,
      `⏰ Reported at: ${new Date().toLocaleTimeString()}`,
    ]
      .filter(Boolean)
      .join('\n');

    try {
      await Share.share({
        message,
        title: 'My Emergency Location',
      });
    } catch (err) {
      // User cancelled share
    }
  };

  // OpenStreetMap static snapshot URL
  const staticMapUri = hasValidCoords
    ? `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=600x300&markers=${lat},${lng},red-pushpin`
    : null;

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>My Location</Text>
        <Text style={styles.sub}>
          Real-time GPS coordinates for emergency dispatch & safety.
        </Text>

        {/* Status Badge */}
        {display && (
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                isCached ? styles.badgeCached : styles.badgeLive,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  isCached ? styles.badgeCachedText : styles.badgeLiveText,
                ]}
              >
                {isCached ? '📦 Offline Saved Position' : '📡 Live GPS Lock'}
              </Text>
            </View>

            {display.accuracy != null && !isNaN(display.accuracy) && (
              <Text style={styles.accuracyText}>
                ±{Math.round(display.accuracy)}m accuracy
              </Text>
            )}
          </View>
        )}

        {/* Map visual card */}
        <View style={styles.card}>
          {loading && !display ? (
            <View style={styles.centerBox}>
              <ActivityIndicator color="#a78bfa" size="large" />
              <Text style={styles.loadingText}>Acquiring GPS coordinates...</Text>
            </View>
          ) : hasValidCoords ? (
            <>
              {/* Static visual map preview */}
              {staticMapUri && !mapImageError ? (
                <View style={styles.mapContainer}>
                  <Image
                    source={{ uri: staticMapUri }}
                    style={styles.mapImage}
                    resizeMode="cover"
                    onError={() => setMapImageError(true)}
                  />
                  <View style={styles.pinOverlay}>
                    <Text style={styles.pinEmoji}>📍</Text>
                  </View>
                </View>
              ) : null}

              {/* Resolved Street Address */}
              {address ? (
                <View style={styles.addressBox}>
                  <Text style={styles.addressLabel}>Street Address</Text>
                  <Text style={styles.addressValue}>{address}</Text>
                </View>
              ) : null}

              {/* Coordinates Grid */}
              <View style={styles.coordsGrid}>
                <View style={styles.coordCol}>
                  <Text style={styles.coordLabel}>Latitude</Text>
                  <Text style={styles.coordValue}>{lat.toFixed(6)}°</Text>
                </View>
                <View style={styles.coordCol}>
                  <Text style={styles.coordLabel}>Longitude</Text>
                  <Text style={styles.coordValue}>{lng.toFixed(6)}°</Text>
                </View>
              </View>

              {display.savedAt && (
                <Text style={styles.timestampText}>
                  Recorded: {new Date(display.savedAt).toLocaleString()}
                </Text>
              )}
            </>
          ) : (
            <View style={styles.centerBox}>
              <Text style={styles.empty}>No location signal acquired yet.</Text>
              <Text style={styles.emptySub}>
                Make sure device location/GPS is enabled.
              </Text>
            </View>
          )}
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.error}>{error}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <TouchableOpacity
          style={[styles.refreshBtn, loading && styles.btnDisabled]}
          onPress={refreshLocation}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.refreshText}>🔄 Refresh GPS Location</Text>
          )}
        </TouchableOpacity>

        {hasValidCoords && (
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShareLocation}
            activeOpacity={0.85}
          >
            <Text style={styles.shareBtnText}>📢 Share Location (SMS / WhatsApp)</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Open in Navigation Maps</Text>
        <Text style={styles.sectionSub}>
          Launch your native navigation app for turn-by-turn directions.
        </Text>

        <TouchableOpacity
          style={styles.mapBtn}
          onPress={() => openMaps('google')}
          activeOpacity={0.8}
        >
          <Text style={styles.mapBtnText}>🌍 Google Maps</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.mapBtn}
          onPress={() => openMaps('system')}
          activeOpacity={0.8}
        >
          <Text style={styles.mapBtnText}>📱 Default System Navigation</Text>
        </TouchableOpacity>

        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[styles.mapBtn, styles.mapBtnAlt]}
            onPress={() => openMaps('apple')}
            activeOpacity={0.8}
          >
            <Text style={styles.mapBtnText}>🍎 Apple Maps</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.footer}>
          💡 Tip: Keep location enabled for instant SOS dispatch. If you have no cell signal,
          your last saved coordinates will be shown and can be sent via SMS.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0c29' },
  scroll: { padding: 20, paddingBottom: 50 },
  title: { fontSize: 24, fontWeight: '800', color: '#fff' },
  sub: {
    color: 'rgba(255,255,255,0.5)',
    marginTop: 6,
    marginBottom: 16,
    fontSize: 14,
    lineHeight: 20,
  },
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  badgeLive: {
    backgroundColor: 'rgba(34,197,94,0.18)',
    borderColor: 'rgba(74,222,128,0.4)',
  },
  badgeLiveText: {
    color: '#4ade80',
    fontSize: 12,
    fontWeight: '700',
  },
  badgeCached: {
    backgroundColor: 'rgba(245,158,11,0.18)',
    borderColor: 'rgba(251,191,36,0.4)',
  },
  badgeCachedText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '700',
  },
  accuracyText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 14,
    overflow: 'hidden',
  },
  centerBox: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.7)',
    marginTop: 12,
    fontSize: 14,
  },
  mapContainer: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  pinOverlay: {
    position: 'absolute',
    alignSelf: 'center',
  },
  pinEmoji: {
    fontSize: 28,
  },
  addressBox: {
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.3)',
  },
  addressLabel: {
    color: 'rgba(233,213,255,0.75)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  addressValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  coordsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  coordCol: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  coordLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  coordValue: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
    marginTop: 4,
  },
  timestampText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    textAlign: 'right',
    marginTop: 6,
  },
  empty: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
  },
  emptySub: {
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    fontSize: 12,
    marginTop: 4,
  },
  errorBox: {
    backgroundColor: 'rgba(245,158,11,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.35)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  error: {
    color: '#fbbf24',
    fontSize: 13,
    textAlign: 'center',
  },
  refreshBtn: {
    backgroundColor: '#7c3aed',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  refreshText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  shareBtn: {
    backgroundColor: 'rgba(34,197,94,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.5)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 24,
  },
  shareBtnText: {
    color: '#86efac',
    fontWeight: '700',
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  sectionSub: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    marginBottom: 14,
  },
  mapBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  mapBtnAlt: {
    marginBottom: 16,
  },
  mapBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  footer: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
});
