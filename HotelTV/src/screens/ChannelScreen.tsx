/**
 * Reusable Channel Screen — In-Room Entertainment / TV Channel Viewer
 * Shared by Etihad Channel (general TV) and Etihad Channels (Etihad-related content).
 * D-pad navigation: back → categories → sidebar → player
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  DeviceEventEmitter,
  Dimensions,
  Image,
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
import VLCPlayer from 'react-native-vlc-media-player/VLCPlayer';
import type { ChannelCategory, ChannelItem, ChannelDataConfig } from '../data/channelData';

const { width: SW } = Dimensions.get('window');

const C = {
  gold:      Colors.primary,
  goldLight: Colors.primaryLight,
  deep:      Colors.background.dark,
  border:    Colors.overlay.border.gold20,
  text:      Colors.text.light,
  muted:     Colors.text.muted,
  live:      Colors.liwaOrange[500],
};

type Section = 'back' | 'categories' | 'sidebar' | 'player';

export interface ChannelScreenProps {
  onBack: () => void;
  isActive?: boolean;
  config: ChannelDataConfig;
}

function pad(n: number): string { return String(n).padStart(2, '0'); }
function formatDate(d: Date): string {
  const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

const SIDEBAR_W  = SW > 700 ? 260 : 200;
const SIDEBAR_IH = 62;

export default function ChannelScreen({ onBack, isActive = true, config }: ChannelScreenProps) {
  const { categories, channels, sidebarTitle } = config;
  const defaultChId = channels[0]?.id ?? 101;

  const [time,         setTime]         = useState(new Date());
  const [activeCat,    setActiveCat]    = useState('all');
  const [activeChId,   setActiveChId]   = useState(defaultChId);
  const [section,      setSection]      = useState<Section>('categories');
  const [catIndex,     setCatIndex]     = useState(0);
  const [sidebarIdx,   setSidebarIdx]   = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [paused,       setPaused]       = useState(false);
  const [fsExitFocused, setFsExitFocused] = useState(false);
  const [buffering,    setBuffering]    = useState(true);

  const sectionRef      = useRef<Section>('categories');
  const catIndexRef     = useRef(0);
  const sidebarIdxRef   = useRef(0);
  const isFullscreenRef = useRef(false);
  const pausedRef       = useRef(false);
  const onBackRef       = useRef(onBack);
  onBackRef.current     = onBack;

  const scrollViewRef    = useRef<ScrollView>(null);
  const sidebarScrollRef = useRef<ScrollView>(null);

  const filtered = activeCat === 'all' ? channels : channels.filter(c => c.cat === activeCat);
  const filteredRef = useRef(filtered);
  filteredRef.current = filtered;

  useEffect(() => {
    if (!isActive) return;
    sectionRef.current    = 'categories'; setSection('categories');
    catIndexRef.current   = 0;           setCatIndex(0);
    sidebarIdxRef.current = 0;           setSidebarIdx(0);
    isFullscreenRef.current = false;     setIsFullscreen(false);
    pausedRef.current     = false;       setPaused(false);
    setFsExitFocused(false);
    setActiveCat('all');
    setActiveChId(defaultChId);
    setBuffering(true);
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [isActive]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (sectionRef.current !== 'sidebar') return;
    sidebarScrollRef.current?.scrollTo({
      y: Math.max(0, sidebarIdx * SIDEBAR_IH - SIDEBAR_IH),
      animated: false,
    });
  }, [sidebarIdx]);

  const toggleFullscreen = useCallback(() => {
    const next = !isFullscreenRef.current;
    isFullscreenRef.current = next;
    setIsFullscreen(next);
    if (next) setFsExitFocused(true);
    else setFsExitFocused(false);
  }, []);

  const selectChannel = useCallback((idx: number) => {
    const ch = filteredRef.current[idx];
    if (!ch) return;
    setActiveChId(ch.id);
    sidebarIdxRef.current = idx; setSidebarIdx(idx);
    pausedRef.current = false;   setPaused(false);
    setBuffering(true);
    sectionRef.current = 'player'; setSection('player');
  }, []);

  const selectCategory = useCallback((idx: number) => {
    const cat = categories[idx];
    if (!cat) return;
    setActiveCat(cat.id);
    catIndexRef.current   = idx; setCatIndex(idx);
    sidebarIdxRef.current = 0;   setSidebarIdx(0);
  }, [categories]);

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
          isFullscreenRef.current = false; setIsFullscreen(false);
        }
        return;
      }

      if (sec === 'back') {
        if (kc === 23 || kc === 66 || kc === 109) onBackRef.current?.();
        else if (kc === 20) { sectionRef.current = 'categories'; setSection('categories'); }
        return;
      }

      if (sec === 'categories') {
        const max = categories.length - 1;
        if      (kc === 21) { const n = Math.max(0, catIndexRef.current - 1);  catIndexRef.current = n; setCatIndex(n); }
        else if (kc === 22) { const n = Math.min(max, catIndexRef.current + 1); catIndexRef.current = n; setCatIndex(n); }
        else if (kc === 19) {
          sectionRef.current = 'back'; setSection('back');
          scrollViewRef.current?.scrollTo({ y: 0, animated: false });
        }
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
            sectionRef.current = 'categories'; setSection('categories');
            scrollViewRef.current?.scrollTo({ y: 0, animated: false });
          } else {
            const n = sidebarIdxRef.current - 1;
            sidebarIdxRef.current = n; setSidebarIdx(n);
          }
        }
        else if (kc === 20) {
          if (sidebarIdxRef.current < total - 1) {
            const n = sidebarIdxRef.current + 1;
            sidebarIdxRef.current = n; setSidebarIdx(n);
          }
        }
        else if (kc === 22) {
          sectionRef.current = 'player'; setSection('player');
        }
        else if (kc === 23 || kc === 66 || kc === 109) {
          selectChannel(sidebarIdxRef.current);
        }
        return;
      }

      if (sec === 'player') {
        if (kc === 23 || kc === 66 || kc === 109) {
          const n = !isFullscreenRef.current;
          isFullscreenRef.current = n; setIsFullscreen(n);
        }
        else if (kc === 19) {
          sectionRef.current = 'categories'; setSection('categories');
          scrollViewRef.current?.scrollTo({ y: 0, animated: false });
        }
        else if (kc === 21) {
          sectionRef.current = 'sidebar'; setSection('sidebar');
        }
        return;
      }
    });
    return () => sub.remove();
  }, [selectCategory, selectChannel, isActive, categories.length]);

  const activeCh = channels.find(c => c.id === activeChId) ?? channels[0];
  if (!activeCh) return null;

  return (
    <View style={st.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.deep} />
      <LinearGradient
        colors={[Colors.overlay.gold[5], 'transparent', 'rgba(28,78,122,0.05)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={{ flex: 1 }}>
        <View style={st.header}>
          <View style={st.brand}>
            <Image
              source={require('../assets/images/ethiad-logo-marketing.png')}
              style={st.brandLogo}
              resizeMode="contain"
            />
          </View>
          <View style={st.headerRight}>
            <View style={st.clockWrap}>
              <Text style={st.clockTime}>{pad(time.getHours())}:{pad(time.getMinutes())}</Text>
              <Text style={st.clockDate}>{formatDate(time)}</Text>
            </View>
            <TouchableOpacity
              onPress={onBack}
              focusable
              activeOpacity={0.75}
              style={[st.backBtn, section === 'back' && st.backBtnFocused]}
            >
              <Text style={[st.backBtnTxt, section === 'back' && { color: C.deep }]}>‹ BACK</Text>
            </TouchableOpacity>
          </View>
        </View>

        <LinearGradient
          colors={['transparent', C.gold, 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={st.goldRule}
        />

        <View style={st.catNavBorder}>
          <ScrollView
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
                  section === 'categories' && catIndex === i && st.catBtnRemoteFocused,
                ]}
              >
                <Text style={[st.catBtnTxt, activeCat === cat.id && st.catBtnTxtActive]}>
                  {cat.label.toUpperCase()}
                </Text>
                {activeCat === cat.id && (
                  <LinearGradient
                    colors={[C.gold, C.goldLight]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={st.catActiveLine}
                  />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
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
                      isPlaying && st.sidebarItemPlaying,
                      isFocused && st.sidebarItemFocused,
                    ]}
                  >
                    {(isPlaying || isFocused) && (
                      <LinearGradient
                        colors={[
                          isFocused ? 'rgba(200,170,127,0.18)' : 'rgba(200,170,127,0.09)',
                          'transparent',
                        ]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    {isPlaying && <View style={st.sidebarPlayingBar} />}
                    {isFocused && !isPlaying && <View style={st.sidebarFocusBar} />}
                    <View style={[
                      st.sidebarLogo,
                      isPlaying && st.sidebarLogoPlaying,
                      isFocused && st.sidebarLogoFocused,
                    ]}>
                      <Text style={[st.sidebarLogoTxt, { color: ch.color }]}>
                        {ch.name.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View style={st.sidebarInfo}>
                      <Text
                        style={[st.sidebarChName, (isPlaying || isFocused) && { color: C.gold }]}
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

          <View style={[st.playerPane, section === 'player' && st.playerPaneFocused]}>
            {!isFullscreen && (
              <VLCPlayer
                style={StyleSheet.absoluteFill}
                source={{ uri: activeCh.videoUrl }}
                videoAspectRatio="16:9"
                resizeMode="fill"
                paused={paused || !isActive}
                volume={200}
                repeat
                onPlaying={() => setBuffering(false)}
                onError={() => setBuffering(false)}
              />
            )}
            {buffering && !isFullscreen && !paused && (
              <View style={st.bufferOverlay}>
                <ActivityIndicator size="large" color={C.gold} />
                <Text style={st.bufferTxt}>Loading…</Text>
              </View>
            )}
            {paused && !isFullscreen && (
              <View style={st.pausedOverlay}>
                <Text style={st.pausedIcon}>⏸</Text>
              </View>
            )}
            <View style={st.chBadgeOverlay}>
              <PulseDot size={5} color={activeCh.live ? C.live : C.gold} />
              <Text style={st.chBadgeOverlayTxt}>CH {activeCh.id} · {activeCh.name}</Text>
            </View>
            <TouchableOpacity
              style={[st.fsBtn, section === 'player' && st.fsBtnFocused]}
              activeOpacity={0.8}
              focusable
              onPress={toggleFullscreen}
            >
              <Text style={[st.fsBtnIcon, section === 'player' && { color: C.deep }]}>⛶</Text>
            </TouchableOpacity>
            {section === 'player' && (
              <View style={st.playerFocusHint}>
                <Text style={st.playerFocusHintTxt}>OK · Fullscreen  ←  Channels</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {isFullscreen && (
        <View style={st.fsOverlay}>
          <VLCPlayer
            style={StyleSheet.absoluteFill}
            source={{ uri: activeCh.videoUrl }}
            videoAspectRatio="16:9"
            resizeMode="fill"
            paused={paused || !isActive}
            volume={200}
            repeat
            onPlaying={() => setBuffering(false)}
            onError={() => setBuffering(false)}
          />
          {buffering && !paused && (
            <View style={st.bufferOverlayFs}>
              <ActivityIndicator size="large" color={C.gold} />
              <Text style={st.bufferTxt}>Loading…</Text>
            </View>
          )}
          <View style={st.fsTopBar}>
            <View style={st.fsTopLeft}>
              <PulseDot size={6} color={C.gold} />
              <Text style={st.fsNowTxt}>NOW PLAYING · CH {activeCh.id} · {activeCh.name}</Text>
            </View>
            <View style={st.fsTopRight}>
              <Text style={st.fsTimeTxt}>{pad(time.getHours())}:{pad(time.getMinutes())}</Text>
              <TouchableOpacity
                style={[st.fsExitIconBtn, fsExitFocused && st.fsExitIconBtnActive]}
                activeOpacity={0.8}
                focusable
                onPress={toggleFullscreen}
                onFocus={() => setFsExitFocused(true)}
                onBlur={() => setFsExitFocused(false)}
              >
                <Text style={[st.fsExitIcon, fsExitFocused && { color: C.deep }]}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
          {paused && (
            <View style={st.fsCentre}>
              <View style={st.fsPlayRing}>
                <Text style={st.fsPlayIcon}>⏸</Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.deep },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 24, paddingVertical: 14,
    backgroundColor: C.deep, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  brand:       { flexDirection: 'row', alignItems: 'center', gap: 14 },
  brandLogo:   { width: 140, height: 45 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  clockWrap:   { alignItems: 'flex-end' },
  clockTime:   { fontFamily: FontFamily.light, color: C.goldLight, fontSize: 24, letterSpacing: 1, lineHeight: 28 },
  clockDate:   { fontFamily: FontFamily.book,  color: C.muted,     fontSize: 8,  letterSpacing: 1.5, marginTop: 2 },
  backBtn:        { borderWidth: 1, borderColor: C.border, borderRadius: 4, paddingHorizontal: 16, paddingVertical: 8 },
  backBtnFocused: { backgroundColor: C.gold, borderColor: C.goldLight },
  backBtnTxt:     { fontFamily: FontFamily.medium, color: C.gold, fontSize: 11, letterSpacing: 2 },
  goldRule:       { height: 1 },
  catNavBorder:         { borderBottomWidth: 1, borderBottomColor: C.border },
  catNav:               { backgroundColor: C.deep },
  catNavContent:        { paddingHorizontal: 0 },
  catBtn:               { paddingHorizontal: 22, paddingVertical: 18, position: 'relative' },
  catBtnActive:         {},
  catBtnRemoteFocused:  { backgroundColor: Colors.overlay.gold[8] },
  catBtnTxt:            { fontFamily: FontFamily.book, color: C.text,   fontSize: 9, letterSpacing: 2.5 },
  catBtnTxtActive:      { fontFamily: FontFamily.book, color: C.gold },
  catActiveLine:        { position: 'absolute', bottom: -1, left: 22, right: 22, height: 2, borderRadius: 1 },
  playerArea: {
    flex: 1,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    paddingHorizontal: 16,
  },
  sidebar: {
    width: SIDEBAR_W,
    borderRightWidth: 1,
    borderRightColor: C.border,
    backgroundColor: 'rgba(6,6,12,0.75)',
  },
  sidebarFocused: { borderRightColor: C.gold },
  sidebarHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: 'rgba(200,170,127,0.04)',
  },
  sidebarHeaderTxt: { fontFamily: FontFamily.medium, color: C.gold, fontSize: 9, letterSpacing: 3 },
  sidebarScroll:    { flex: 1 },
  sidebarItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 11, gap: 10,
    borderBottomWidth: 1, borderBottomColor: 'rgba(200,170,127,0.06)',
    position: 'relative', overflow: 'hidden',
  },
  sidebarItemPlaying: { borderBottomColor: 'rgba(200,170,127,0.14)' },
  sidebarItemFocused: { borderBottomColor: 'rgba(200,170,127,0.22)' },
  sidebarPlayingBar: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3, backgroundColor: C.gold,
    borderTopRightRadius: 2, borderBottomRightRadius: 2,
  },
  sidebarFocusBar: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 3, backgroundColor: C.goldLight, opacity: 0.55,
    borderTopRightRadius: 2, borderBottomRightRadius: 2,
  },
  sidebarLogo: {
    width: 38, height: 38, borderRadius: 6,
    backgroundColor: 'rgba(200,170,127,0.07)',
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  sidebarLogoPlaying: { borderColor: C.gold,      backgroundColor: 'rgba(200,170,127,0.15)' },
  sidebarLogoFocused: { borderColor: C.goldLight, backgroundColor: 'rgba(200,170,127,0.11)' },
  sidebarLogoTxt:     { fontFamily: FontFamily.bold, fontSize: 11, letterSpacing: 0.5 },
  sidebarInfo:        { flex: 1, minWidth: 0 },
  sidebarChName:      { fontFamily: FontFamily.medium, color: C.text,  fontSize: 11, letterSpacing: 0.3, marginBottom: 2 },
  playerPane: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
    overflow: 'hidden',
  },
  playerPaneFocused: { borderWidth: 2, borderColor: C.gold },
  bufferOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  bufferOverlayFs: {
    position: 'absolute', top: '50%' as any, left: '50%' as any,
    transform: [{ translateX: -40 }, { translateY: -40 }],
    alignItems: 'center', gap: 10,
  },
  bufferTxt:    { fontFamily: FontFamily.book, color: C.gold, fontSize: 11, letterSpacing: 2 },
  pausedOverlay:{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  pausedIcon:   { color: C.gold, fontSize: 36 },
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
  fsOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.deep, justifyContent: 'space-between' },
  fsTopBar:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 36, paddingTop: 28, paddingBottom: 16, backgroundColor: Colors.overlay.midnight[60] },
  fsTopLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fsTopRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  fsNowTxt:   { fontFamily: FontFamily.text,  color: C.gold, fontSize: 11, letterSpacing: 2.5 },
  fsTimeTxt:  { fontFamily: FontFamily.light, color: C.text, fontSize: 22, letterSpacing: 2 },
  fsExitIconBtn: {
    width: 40, height: 40, borderRadius: 4,
    backgroundColor: Colors.overlay.gold[8],
    borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  fsExitIconBtnActive: { backgroundColor: C.gold, borderColor: C.goldLight, transform: [{ scale: 1.08 }] },
  fsExitIcon: { fontFamily: FontFamily.medium, color: C.gold, fontSize: 18 },
  fsCentre:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fsPlayRing:{ width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.overlay.gold[12], borderWidth: 2, borderColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  fsPlayIcon:{ color: C.gold, fontSize: 34, marginLeft: 6 },
});
