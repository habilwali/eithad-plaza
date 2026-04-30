/**
 * Reusable Channel Screen — In-Room Entertainment / TV Channel Viewer
 * Shared by Etihad Channel (general TV) and Etihad Channels (Etihad-related content).
 * D-pad navigation: categories → sidebar → player (Android BACK exits)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DeviceEventEmitter,
  Dimensions,
  InteractionManager,
  type LayoutChangeEvent,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { FontFamily } from '../theme/typography';
import { Colors } from '../theme/colors';
import { PulseDot } from '../components/common';
import { AppHeader } from '../components/common/AppHeader';
import { useAppHeaderClock } from '../hooks/useAppHeaderClock';
import VlcPlayer from '../components/VlcPlayer';
import type { ChannelDataConfig } from '../data/channelData';

const { width: SW, height: SH } = Dimensions.get('window');

const C = {
  gold:      Colors.primary,
  goldLight: Colors.primaryLight,
  deep:      Colors.background.dark,
  border:    Colors.overlay.border.gold20,
  text:      Colors.text.light,
  muted:     Colors.text.muted,
  live:      Colors.liwaOrange[500],
};

const TAB_BAR_BG = 'rgba(40,52,62,0.88)';

type Section = 'categories' | 'sidebar';

export interface ChannelScreenProps {
  onBack: () => void;
  isActive?: boolean;
  config: ChannelDataConfig;
}

const SIDEBAR_W  = SW > 700 ? 260 : 200;
const SIDEBAR_IH = 62;

const APPROX_CHROME_H = 64 + 1 + 55; // header + gold rule + tabs

const INITIAL_PLAYER_BOUNDS = {
  x:      SIDEBAR_W,
  y:      APPROX_CHROME_H,
  width:  SW - SIDEBAR_W,
  height: SH - APPROX_CHROME_H,
};


export default function ChannelScreen({ onBack, isActive = true, config }: ChannelScreenProps) {
  const { categories, channels, sidebarTitle } = config;
  const defaultChId = channels[0]?.id ?? 101;

  const headerClock = useAppHeaderClock();
  const [activeCat,    setActiveCat]    = useState('all');
  const [activeChId,   setActiveChId]   = useState(defaultChId);
  const [section,      setSection]      = useState<Section>('categories');
  const [catIndex,     setCatIndex]     = useState(0);
  const [sidebarIdx,   setSidebarIdx]   = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playerKey,    setPlayerKey]    = useState(0);

  const sectionRef      = useRef<Section>('categories');
  const catIndexRef     = useRef(0);
  const sidebarIdxRef   = useRef(0);
  const isFullscreenRef = useRef(false);
  /** Stops OK from firing twice in one press (TV remote + focused TouchableOpacity onPress). */
  const lastFullscreenToggleAtRef = useRef(0);
  const autoSelectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onBackRef       = useRef(onBack);
  onBackRef.current     = onBack;

  const scrollViewRef    = useRef<ScrollView>(null);
  const sidebarScrollRef = useRef<ScrollView>(null);
  const playerPaneRef    = useRef<View>(null);
  const boundsRafRef     = useRef<number | null>(null);
  const lastBoundsRef    = useRef(INITIAL_PLAYER_BOUNDS);

  const [playerBounds, setPlayerBounds] = useState(INITIAL_PLAYER_BOUNDS);
  /** Inline player uses estimated bounds until measureInWindow runs — hide until then. */
  const [inlineVideoReady, setInlineVideoReady] = useState(false);

  /** Only push new bounds when they move/size by ≥2px — stops SurfaceView thrash
   *  when D-pad focus rings, sidebar transforms, or header re-layout nudge layout. */
  const applyPlayerBoundsIfChanged = useCallback(
    (x: number, y: number, width: number, height: number) => {
      if (width < 8 || height < 8) return;
      const p = lastBoundsRef.current;
      if (
        Math.abs(x - p.x) < 2 &&
        Math.abs(y - p.y) < 2 &&
        Math.abs(width - p.width) < 2 &&
        Math.abs(height - p.height) < 2
      ) {
        return;
      }
      lastBoundsRef.current = { x, y, width, height };
      setPlayerBounds({ x, y, width, height });
    },
    [],
  );

  const measurePlayerPane = useCallback(() => {
    playerPaneRef.current?.measureInWindow((x, y, width, height) => {
      if (width > 8 && height > 8 && !isFullscreenRef.current) {
        setInlineVideoReady(true);
      }
      applyPlayerBoundsIfChanged(x, y, width, height);
    });
  }, [applyPlayerBoundsIfChanged]);

  const onPlayerPaneLayout = useCallback(
    (_e: LayoutChangeEvent) => {
      if (isFullscreen) return;
      if (boundsRafRef.current != null) {
        cancelAnimationFrame(boundsRafRef.current);
      }
      boundsRafRef.current = requestAnimationFrame(() => {
        boundsRafRef.current = null;
        measurePlayerPane();
      });
    },
    [isFullscreen, measurePlayerPane],
  );

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', () => {
      if (!isFullscreen) requestAnimationFrame(measurePlayerPane);
    });
    return () => sub.remove();
  }, [isFullscreen, measurePlayerPane]);

  useEffect(() => {
    if (isFullscreen) return;
    setInlineVideoReady(false);
    // After leaving fullscreen, force the next measure to apply — avoids stale
    // lastBoundsRef skipping an update when the inline rect differs only slightly.
    lastBoundsRef.current = {x: -10000, y: -10000, width: 1, height: 1};
    requestAnimationFrame(measurePlayerPane);
  }, [isFullscreen, measurePlayerPane]);

  const filtered = activeCat === 'all' ? channels : channels.filter(c => c.cat === activeCat);
  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;

  useEffect(() => {
    if (!isActive) return;
    sectionRef.current      = 'categories'; setSection('categories');
    catIndexRef.current     = 0;            setCatIndex(0);
    sidebarIdxRef.current   = 0;            setSidebarIdx(0);
    isFullscreenRef.current = false;        setIsFullscreen(false);
    setActiveCat('all');
    setActiveChId(defaultChId);
    setPlayerKey(k => k + 1);
    setInlineVideoReady(false);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
    const task = InteractionManager.runAfterInteractions(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(measurePlayerPane);
      });
    });
    return () => task.cancel?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  useEffect(() => {
    if (sectionRef.current !== 'sidebar') return;
    sidebarScrollRef.current?.scrollTo({
      y: Math.max(0, sidebarIdx * SIDEBAR_IH - SIDEBAR_IH),
      animated: false,
    });
  }, [sidebarIdx]);

  const SIDEBAR_DEBOUNCE_MS = 350;

  const cancelAutoSelect = useCallback(() => {
    if (autoSelectTimerRef.current !== null) {
      clearTimeout(autoSelectTimerRef.current);
      autoSelectTimerRef.current = null;
    }
  }, []);

  const scheduleSidebarAutoSelect = useCallback((idx: number) => {
    cancelAutoSelect();
    sidebarIdxRef.current = idx;
    setSidebarIdx(idx);
    autoSelectTimerRef.current = setTimeout(() => {
      autoSelectTimerRef.current = null;
      const ch = filteredRef.current[idx];
      if (ch) { setActiveChId(ch.id); }
    }, SIDEBAR_DEBOUNCE_MS);
  }, [cancelAutoSelect]);

  const FULLSCREEN_TOGGLE_DEBOUNCE_MS = 420;

  const tryToggleFullscreen = useCallback(() => {
    const now = Date.now();
    if (now - lastFullscreenToggleAtRef.current < FULLSCREEN_TOGGLE_DEBOUNCE_MS) {
      return;
    }
    lastFullscreenToggleAtRef.current = now;
    const next = !isFullscreenRef.current;
    isFullscreenRef.current = next;
    setIsFullscreen(next);
  }, []);

  const selectChannel = useCallback((idx: number) => {
    cancelAutoSelect();
    const ch = filteredRef.current[idx];
    if (!ch) return;
    setActiveChId(ch.id);
    sidebarIdxRef.current = idx; setSidebarIdx(idx);
  }, [cancelAutoSelect]);

  const selectCategory = useCallback((idx: number) => {
    const cat = categories[idx];
    if (!cat) return;
    const newFiltered = cat.id === 'all' ? channels : channels.filter(c => c.cat === cat.id);
    setActiveCat(cat.id);
    catIndexRef.current   = idx; setCatIndex(idx);
    sidebarIdxRef.current = 0;   setSidebarIdx(0);
    if (newFiltered.length > 0) { setActiveChId(newFiltered[0].id); }
  }, [categories, channels]);

  // Cancel pending auto-select when screen goes inactive or on unmount.
  useEffect(() => {
    if (!isActive) cancelAutoSelect();
    return () => cancelAutoSelect();
  }, [isActive, cancelAutoSelect]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !isActive) return;
    const sub = DeviceEventEmitter.addListener('onKeyDown', (evt: { keyCode: number }) => {
      const kc  = evt.keyCode;
      const sec = sectionRef.current;

      if (kc === 4) {
        if (isFullscreenRef.current) { isFullscreenRef.current = false; setIsFullscreen(false); }
        else { onBackRef.current?.(); }
        return;
      }

      if (isFullscreenRef.current) {
        if (kc === 23 || kc === 66 || kc === 109) {
          tryToggleFullscreen();
        }
        return;
      }

      if (sec === 'categories') {
        const max = categories.length - 1;
        if      (kc === 21) { const n = Math.max(0, catIndexRef.current - 1);  catIndexRef.current = n; setCatIndex(n); }
        else if (kc === 22) { const n = Math.min(max, catIndexRef.current + 1); catIndexRef.current = n; setCatIndex(n); }
        else if (kc === 20) { sectionRef.current = 'sidebar'; setSection('sidebar'); }
        else if (kc === 23 || kc === 66 || kc === 109) {
          selectCategory(catIndexRef.current);
          sectionRef.current = 'sidebar'; setSection('sidebar');
        }
        return;
      }

      if (sec === 'sidebar') {
        const total = filteredRef.current.length;
        if (kc === 19) {
          if (sidebarIdxRef.current === 0) {
            cancelAutoSelect();
            sectionRef.current = 'categories'; setSection('categories');
            scrollViewRef.current?.scrollTo({ y: 0, animated: false });
          } else {
            scheduleSidebarAutoSelect(sidebarIdxRef.current - 1);
          }
        }
        else if (kc === 20) {
          if (sidebarIdxRef.current < total - 1) {
            scheduleSidebarAutoSelect(sidebarIdxRef.current + 1);
          }
        }
        else if (kc === 22) { selectChannel(sidebarIdxRef.current); tryToggleFullscreen(); }
        else if (kc === 23 || kc === 66 || kc === 109) {
          selectChannel(sidebarIdxRef.current);
          tryToggleFullscreen();
        }
        return;
      }
    });
    return () => sub.remove();
  }, [selectCategory, selectChannel, isActive, categories.length, tryToggleFullscreen, cancelAutoSelect, scheduleSidebarAutoSelect]);

  const activeCh = channels.find(c => c.id === activeChId) ?? channels[0];

  useEffect(() => {
    if (!isActive || !activeCh?.videoUrl) return;
    console.log('[ChannelScreen] stream:', activeCh.videoUrl);
  }, [isActive, activeCh?.videoUrl]);

  if (!activeCh) return null;

  // Memoised so clock ticks don't produce a new style object every second.
  const videoWrapStyle = useMemo(
    () =>
      isFullscreen
        ? [StyleSheet.absoluteFillObject, st.videoWrapFs]
        : [
            st.videoWrapInline,
            {
              left:   playerBounds.x,
              top:    playerBounds.y,
              width:  playerBounds.width,
              height: playerBounds.height,
              opacity: inlineVideoReady ? 1 : 0,
            },
          ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      isFullscreen,
      inlineVideoReady,
      playerBounds.x,
      playerBounds.y,
      playerBounds.width,
      playerBounds.height,
    ],
  );

  // Badge/overlay wrapper sits at the same position as the video but is a SIBLING,
  // not a child. This keeps animated content (PulseDot) out of the VLC TextureView's
  // ViewGroup so its animation frames don't force the video texture to recomposite.
  const badgeWrapStyle = useMemo(
    () => ({
      position: 'absolute' as const,
      zIndex: 21,
      left: playerBounds.x,
      top: playerBounds.y,
      width: playerBounds.width,
      height: playerBounds.height,
      opacity: inlineVideoReady ? 1 : 0,
    }),
    [
      inlineVideoReady,
      playerBounds.x,
      playerBounds.y,
      playerBounds.width,
      playerBounds.height,
    ],
  );

  return (
    <View style={st.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.deep} />

      {!isFullscreen && (
        <>
          <View style={st.topChrome}>
            <LinearGradient
              colors={[Colors.overlay.gold[5], 'transparent', 'rgba(28,78,122,0.05)']}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />
            <AppHeader
              date={headerClock.date}
              time={headerClock.time}
              temperature={headerClock.temperature}
              weatherCondition={headerClock.weatherCondition}
            />
            <LinearGradient
              colors={['transparent', C.gold, 'transparent']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={st.goldRule}
            />
            <View style={st.catNavBorder}>
              <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={st.catNav}
                contentContainerStyle={st.catNavContent}
              >
                {categories.map((cat, i) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => selectCategory(i)}
                    focusable
                    style={[
                      st.catBtn,
                      activeCat === cat.id && st.catBtnActive,
                      section === 'categories' && catIndex === i && activeCat !== cat.id && st.catBtnRemoteFocused,
                      section === 'categories' && catIndex === i && st.catBtnTvFocused,
                    ]}
                  >
                    <Text style={[st.catBtnTxt, activeCat === cat.id && st.catBtnTxtActive]}>
                      {cat.label.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={st.playerArea}>
            <View style={[st.sidebar, section === 'sidebar' && st.sidebarFocused]}>
              <View style={st.sidebarHeader}>
                <PulseDot size={6} color={C.gold} />
                <Text style={st.sidebarHeaderTxt}>{sidebarTitle}</Text>
              </View>
              <ScrollView
                ref={sidebarScrollRef}
                showsVerticalScrollIndicator={false}
                style={st.sidebarScroll}
                removeClippedSubviews
              >
                {filtered.map((ch, i) => {
                  const isPlaying = ch.id === activeChId;
                  const isFocused = section === 'sidebar' && sidebarIdx === i;
                  return (
                    <TouchableOpacity
                      key={ch.id}
                      activeOpacity={0.75}
                      focusable
                      onPress={() => selectChannel(i)}
                      style={[
                        st.sidebarItem,
                        isPlaying  && st.sidebarItemPlaying,
                        isFocused && !isPlaying && st.sidebarItemRemoteFocused,
                        isFocused  && st.sidebarItemTvFocused,
                      ]}
                    >
                      <View style={[
                        st.sidebarLogo,
                        isPlaying  && st.sidebarLogoPlaying,
                        isFocused && !isPlaying && st.sidebarLogoFocused,
                      ]}>
                        <Text style={[
                          st.sidebarLogoTxt,
                          isPlaying ? st.sidebarLogoTxtOnPrimary : { color: ch.color },
                        ]}>
                          {ch.name.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <View style={st.sidebarInfo}>
                        <Text
                          style={[
                            st.sidebarChName,
                            isPlaying  && st.sidebarChNameOnPrimary,
                            isFocused && !isPlaying && st.sidebarChNameFocused,
                          ]}
                          numberOfLines={1}
                        >
                          {ch.name}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View
              ref={playerPaneRef}
              onLayout={onPlayerPaneLayout}
              collapsable={false}
              style={st.playerPane}
            />
          </View>
        </>
      )}

      {/* Video layer — VlcPlayer alone; badge is a sibling so overlays do not sit
          in the same native view group as the video surface. */}
      {isActive && (
        <View style={videoWrapStyle}>
          <VlcPlayer
            key={`ch-${activeCh.videoUrl}-${playerKey}`}
            uri={activeCh.videoUrl}
            style={StyleSheet.absoluteFill as object}
            channelName={activeCh.name}
          />
        </View>
      )}

      {/* Overlay layer — sibling of the video wrapper; renderToHardwareTextureAndroid
          isolates badge compositing from the rest of the screen. */}
      {isActive && !isFullscreen && (
        <View
          style={badgeWrapStyle}
          pointerEvents="box-none"
          renderToHardwareTextureAndroid
        >
          <View style={st.chBadgeOverlay}>
            <PulseDot size={5} color={activeCh.live ? C.live : C.gold} />
            <Text style={st.chBadgeOverlayTxt}>CH {activeCh.id} · {activeCh.name}</Text>
          </View>
          <TouchableOpacity
            style={[st.fsBtn, st.fsBtnFocused]}
            activeOpacity={0.8}
            focusable
            onPress={tryToggleFullscreen}
          >
            <Text style={[st.fsBtnIcon, { color: C.deep }]}>⛶</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent', overflow: 'hidden' },

  videoWrapInline: {
    position: 'absolute',
    zIndex: 20,
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  videoWrapFs: {
    zIndex: 2000,
    backgroundColor: '#000',
    overflow: 'hidden',
  },

  topChrome:    { position: 'relative' },
  goldRule:     { height: 1 },
  catNavBorder: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: TAB_BAR_BG,
  },
  catNav:        { backgroundColor: TAB_BAR_BG },
  catNavContent: { paddingHorizontal: 0, backgroundColor: TAB_BAR_BG },
  catBtn:        { paddingHorizontal: 22, paddingVertical: 18, position: 'relative' },
  catBtnActive:        { backgroundColor: Colors.primary },
  catBtnRemoteFocused: { backgroundColor: Colors.overlay.gold[8] },
  catBtnTvFocused:     { transform: [{ scale: 1.05 }] },
  catBtnTxt:           { fontFamily: FontFamily.book, color: C.text, fontSize: 9, letterSpacing: 2.5 },
  catBtnTxtActive:     { fontFamily: FontFamily.book, color: Colors.white },

  playerArea: {
    flex: 1,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    alignItems: 'stretch',
  },

  sidebar: {
    width: SIDEBAR_W,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
    backgroundColor: TAB_BAR_BG,
  },
  sidebarFocused: { borderRightColor: C.gold },
  sidebarHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: TAB_BAR_BG,
  },
  sidebarHeaderTxt: { fontFamily: FontFamily.medium, color: C.gold, fontSize: 9, letterSpacing: 3 },
  sidebarScroll:    { flex: 1, backgroundColor: TAB_BAR_BG },
  sidebarItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 11, gap: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(200,170,127,0.06)',
    position: 'relative', overflow: 'hidden',
  },
  sidebarItemPlaying:       { backgroundColor: Colors.primary, borderBottomColor: 'rgba(255,255,255,0.12)' },
  sidebarItemRemoteFocused: { backgroundColor: Colors.overlay.gold[8] },
  sidebarItemTvFocused:     { transform: [{ scale: 1.03 }] },
  sidebarLogo: {
    width: 38, height: 38, borderRadius: 6,
    backgroundColor: 'rgba(200,170,127,0.07)',
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  sidebarLogoPlaying:      { borderColor: 'rgba(255,255,255,0.45)', backgroundColor: 'rgba(255,255,255,0.14)' },
  sidebarLogoFocused:      { borderColor: C.goldLight, backgroundColor: 'rgba(200,170,127,0.11)' },
  sidebarLogoTxt:          { fontFamily: FontFamily.bold, fontSize: 11, letterSpacing: 0.5 },
  sidebarLogoTxtOnPrimary: { color: Colors.white },
  sidebarInfo:             { flex: 1, minWidth: 0 },
  sidebarChName:           { fontFamily: FontFamily.medium, color: C.text, fontSize: 11, letterSpacing: 0.3, marginBottom: 2 },
  sidebarChNameOnPrimary:  { color: Colors.white },
  sidebarChNameFocused:    { color: C.gold },

  playerPane: {
    flex: 1,
    alignSelf: 'stretch',
    minWidth: 0,
    backgroundColor: '#000',
    overflow: 'hidden',
  },


  chBadgeOverlay: {
    position: 'absolute', top: 12, left: 12,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(6,6,12,0.75)',
    borderWidth: 1, borderColor: C.border, borderRadius: 3,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  chBadgeOverlayTxt: { fontFamily: FontFamily.book, color: C.gold, fontSize: 9, letterSpacing: 2 },

  fsBtn: {
    position: 'absolute', top: 12, right: 12,
    width: 36, height: 36, borderRadius: 4,
    backgroundColor: 'rgba(6,6,12,0.7)',
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  fsBtnIcon:    { color: C.gold, fontSize: 16 },
  fsBtnFocused: { backgroundColor: C.gold, borderColor: C.goldLight, transform: [{ scale: 1.12 }] },

  playerFocusHint:    { position: 'absolute', bottom: 16, right: 12 },
  playerFocusHintTxt: { fontFamily: FontFamily.book, color: 'rgba(200,170,127,0.45)', fontSize: 8, letterSpacing: 1.5 },

  fsCentre:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  fsPlayRing: { width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.overlay.gold[12], borderWidth: 2, borderColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  fsPlayIcon: { color: C.gold, fontSize: 34, marginLeft: 6 },
});