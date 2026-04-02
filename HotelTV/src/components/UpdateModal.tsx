import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { UpdateInfo } from '../services/updateService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.72;

interface Props {
  visible: boolean;
  updateData: UpdateInfo | null;
  onDismiss: () => void;
}

export function UpdateModal({ visible, updateData, onDismiss }: Props): React.JSX.Element | null {
  const slideAnim = useRef(new Animated.Value(MODAL_HEIGHT)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const openAPK = useCallback(() => {
    if (updateData?.apk_url) {
      Linking.openURL(updateData.apk_url);
    }
  }, [updateData]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 60,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: MODAL_HEIGHT,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, fadeAnim]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (updateData?.is_force_update) return true;
      onDismiss();
      return true;
    });
    return () => sub.remove();
  }, [visible, updateData, onDismiss]);

  if (!updateData) return null;

  const { version_name, version_code, release_notes, is_force_update } = updateData;
  const bullets = release_notes
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        if (!is_force_update) onDismiss();
      }}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />

        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            {is_force_update && (
              <View style={styles.forceBadge}>
                <Text style={styles.forceBadgeText}>REQUIRED UPDATE</Text>
              </View>
            )}
            <View style={styles.iconCircle}>
              <Text style={styles.iconEmoji}>🤖</Text>
            </View>
            <Text style={styles.title}>
              {is_force_update ? 'Update Required' : 'New Update Available'}
            </Text>
            <Text style={styles.subtitle}>A new version of the app is ready to install</Text>
          </View>

          {/* Version badges */}
          <View style={styles.versionRow}>
            <View style={styles.versionCard}>
              <Text style={styles.versionLabel}>VERSION NAME</Text>
              <Text style={styles.versionValue}>{version_name}</Text>
            </View>
            <View style={styles.versionCardDivider} />
            <View style={styles.versionCard}>
              <Text style={styles.versionLabel}>VERSION CODE</Text>
              <Text style={styles.versionValue}>{version_code}</Text>
            </View>
          </View>

          {/* What's new */}
          {bullets.length > 0 && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesTitle}>What's new</Text>
              <ScrollView
                style={styles.notesList}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {bullets.map((line, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>{line}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Force-update warning */}
          {is_force_update && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                ⚠️  This update is required to continue using the app.
              </Text>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.buttonRow}>
            {!is_force_update && (
              <TouchableOpacity
                style={styles.btnLater}
                onPress={onDismiss}
                activeOpacity={0.75}
              >
                <Text style={styles.btnLaterText}>Later</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.btnUpdate,
                is_force_update && styles.btnUpdateFull,
              ]}
              onPress={openAPK}
              activeOpacity={0.85}
            >
              <Text style={styles.btnUpdateText}>Update Now</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const INDIGO = '#4F46E5';
const INDIGO_DARK = '#3730A3';

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheet: {
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 28,
    maxHeight: MODAL_HEIGHT,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    backgroundColor: INDIGO,
    paddingTop: 28,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  forceBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 14,
  },
  forceBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconEmoji: {
    fontSize: 32,
  },
  title: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    textAlign: 'center',
  },
  versionRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
    backgroundColor: '#16213E',
    borderRadius: 14,
    overflow: 'hidden',
  },
  versionCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  versionCardDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 10,
  },
  versionLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 5,
  },
  versionValue: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  notesContainer: {
    marginHorizontal: 20,
    marginTop: 18,
  },
  notesTitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  notesList: {
    maxHeight: 140,
    backgroundColor: '#16213E',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: INDIGO,
    marginTop: 6,
    marginRight: 10,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    lineHeight: 20,
  },
  warningBox: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  warningText: {
    color: '#FCA5A5',
    fontSize: 13,
    lineHeight: 19,
  },
  buttonRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 22,
    gap: 12,
  },
  btnLater: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnLaterText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 15,
    fontWeight: '600',
  },
  btnUpdate: {
    flex: 1,
    backgroundColor: INDIGO,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: INDIGO_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  btnUpdateFull: {
    flex: 1,
  },
  btnUpdateText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
