/**
 * Etihad Plaza Hotel — TV Splash Screen
 * Small logo on app background, auto-navigates or any key to skip.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View, Image, StyleSheet, Dimensions,
  DeviceEventEmitter, Platform,
} from 'react-native';
import { Colors } from '../theme/colors';

const { width: SW } = Dimensions.get('window');

const LOGO_IMAGE = require('../assets/images/ethiad-logo-marketing.png');
// Native splash already shows while JS loads; end JS splash on next frames so home can paint ASAP.
const MAX_SPLASH_MS = 1200;

export interface EtihadSplashProps {
  onFinish: () => void;
}

export default function EtihadSplashScreen({ onFinish }: EtihadSplashProps) {
  const finishedRef = useRef(false);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const goHome = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onFinishRef.current();
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Double rAF: wait until after layout/paint so splash isn’t cut off as a blank frame.
    const id0 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!cancelled) goHome();
      });
    });
    const maxT = setTimeout(() => {
      if (!cancelled) goHome();
    }, MAX_SPLASH_MS);
    return () => {
      cancelled = true;
      cancelAnimationFrame(id0);
      clearTimeout(maxT);
    };
  }, [goHome]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = DeviceEventEmitter.addListener('onKeyDown', goHome);
    return () => sub.remove();
  }, [goHome]);

  return (
    <View style={[s.root, { backgroundColor: Colors.background.dark }]}>
      <Image source={LOGO_IMAGE} style={s.logo} resizeMode="contain" />
    </View>
  );
}

// Match native splash_logo size (~160dp) to avoid size jump when React mounts
const LOGO_WIDTH = SW * 0.17;
const LOGO_HEIGHT = LOGO_WIDTH * 0.31;

const s = StyleSheet.create({
  root: {
    flex: 1,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: LOGO_WIDTH,
    height: LOGO_HEIGHT,
  },
});
