import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { GUIDES, GUIDE_LIST } from '../utils/emergencyGuides';

export default function Guides() {
  const { type } = useLocalSearchParams();
  const router = useRouter();
  const initial = type && GUIDES[type] ? type : null;
  const [selected, setSelected] = useState(initial);

  if (selected && GUIDES[selected]) {
    const g = GUIDES[selected];
    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TouchableOpacity onPress={() => setSelected(null)} style={styles.back}>
            <Text style={styles.backText}>← All guides</Text>
          </TouchableOpacity>

          <View style={[styles.hero, { borderColor: g.color + '55' }]}>
            <Text style={styles.heroEmoji}>{g.emoji}</Text>
            <Text style={styles.heroTitle}>{g.title}</Text>
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#4ade80' }]}>✓ What TO do</Text>
            {g.do.map((item, i) => (
              <View key={i} style={styles.row}>
                <View style={[styles.bullet, { backgroundColor: '#22c55e' }]} />
                <Text style={styles.rowText}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#fca5a5' }]}>✗ What NOT to do</Text>
            {g.dont.map((item, i) => (
              <View key={i} style={styles.row}>
                <View style={[styles.bullet, { backgroundColor: '#ef4444' }]} />
                <Text style={styles.rowText}>{item}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.footer}>
            This is general safety guidance. Always follow local emergency services.
          </Text>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>Safety Manuals</Text>
        <Text style={styles.pageSub}>Tap a topic for quick do / don't advice</Text>

        <View style={styles.grid}>
          {GUIDE_LIST.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.card}
              onPress={() => setSelected(item.key)}
              activeOpacity={0.8}
            >
              <Text style={styles.cardEmoji}>{item.emoji}</Text>
              <Text style={styles.cardLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0c29' },
  scroll: { padding: 20, paddingBottom: 40 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 6 },
  pageSub: { color: 'rgba(255,255,255,0.45)', marginBottom: 20, fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  cardEmoji: { fontSize: 32, marginBottom: 8 },
  cardLabel: { color: '#fff', fontWeight: '700', fontSize: 14 },
  back: { marginBottom: 16 },
  backText: { color: '#a78bfa', fontWeight: '600', fontSize: 14 },
  hero: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 20,
  },
  heroEmoji: { fontSize: 48, marginBottom: 8 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  section: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
  row: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-start' },
  bullet: { width: 8, height: 8, borderRadius: 4, marginTop: 6, marginRight: 10 },
  rowText: { flex: 1, color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 20 },
  footer: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 18,
  },
});
