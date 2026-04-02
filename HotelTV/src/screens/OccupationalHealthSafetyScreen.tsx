/**
 * Etihad Plaza — Occupational Health & Safety
 * React Native Android TV — full D-pad remote navigation
 *
 * Layout:
 * ┌─────────────────────────────────────────────────────────┐
 * │  TOPBAR: weather │ logo │ title                         │
 * ├─────────────────────────────────────────────────────────┤
 * │                                                         │
 * │  ┌──────────────────────────┐  ┌─────────────────────┐ │
 * │  │   VIDEO / HERO PLAYER    │  │   DETAIL PANEL      │ │
 * │  │   (active item media)    │  │   name + desc +     │ │
 * │  └──────────────────────────┘  │   highlight +       │ │
 * │                                │   contact +         │ │
 * │  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐│   resources         │ │
 * │  │  │ │  │ │  │ │  │ │  │ │  ││                     │ │
 * │  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘└─────────────────────┘ │
 * │                                                         │
 * ├─────────────────────────────────────────────────────────┤
 * │  BACK                    nav hints                      │
 * └─────────────────────────────────────────────────────────┘
 *
 * Remote nav:
 *   categories (← →): 0-5 cards + 6=back
 *   UP/DOWN while on cards: no-op (single row)
 *   UP from back → cards
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Platform,
  DeviceEventEmitter,
  ImageSourcePropType,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { FontFamily } from '../theme/typography';
import { Colors } from '../theme/colors';
import { BackButton, PulseDot } from '../components/common';
import { getClockStr, getDateStr } from '../utils/dateTime';
import VLCPlayer from 'react-native-vlc-media-player/VLCPlayer';

/* ─── DIMENSIONS ─────────────────────────────────────────── */
const { width: SW, height: SH } = Dimensions.get('window');

const TOPBAR_H   = 78;
const BOTTOM_H   = 52;
const H_PAD      = 40;
const CONTENT_H  = SH - TOPBAR_H - BOTTOM_H;
const DETAIL_W   = Math.round(SW * 0.29);
const LEFT_W     = SW - H_PAD * 2 - DETAIL_W - 16;
const CARD_STRIP = 130;          // height of thumbnail strip
const PLAYER_H   = CONTENT_H - CARD_STRIP - 32 - 16; // 32 = strip margin-top, 16 = padding
const CARD_W     = Math.round((LEFT_W - 5 * 10) / 6); // 6 cards, 10px gap

/* ─── THEME ──────────────────────────────────────────────── */
const C = {
  bg:      Colors.background.dark,
  surface: Colors.midnightDune?.[600] ?? '#1A1A22',
  gold:    Colors.primary,
  gold2:   Colors.primaryLight,
  text:    Colors.text.light,
  muted:   Colors.text.muted,
  border:  Colors.overlay?.border?.gold20 ?? 'rgba(200,170,127,0.2)',
  sep:     'rgba(255,255,255,0.07)',
  red:     '#C8443A',
  green:   '#4CAF7D',
  blue:    '#4A9FD4',
  amber:   '#D4960A',
};

type ContentType = 'VIDEO' | 'PDF' | 'INFO' | 'TRAINING' | 'EMERGENCY' | 'POLICY';

const TYPE_META: Record<ContentType, { bg: string; color: string; icon: string; label: string }> = {
  VIDEO:     { bg: 'rgba(74,159,212,0.22)',  color: C.blue,  icon: '▶',  label: 'VIDEO'     },
  PDF:       { bg: 'rgba(200,68,58,0.22)',   color: C.red,   icon: '⬇',  label: 'PDF'       },
  INFO:      { bg: 'rgba(200,170,127,0.18)', color: C.gold,  icon: 'ℹ',  label: 'INFO'      },
  TRAINING:  { bg: 'rgba(76,175,125,0.22)',  color: C.green, icon: '✦',  label: 'TRAINING'  },
  EMERGENCY: { bg: 'rgba(200,68,58,0.28)',   color: C.red,   icon: '⚠',  label: 'EMERGENCY' },
  POLICY:    { bg: 'rgba(212,150,10,0.22)',  color: C.amber, icon: '◈',  label: 'POLICY'    },
};

/* ─── DATA ───────────────────────────────────────────────── */
// Public domain / CC0 video sources
const VIDEOS = {
  emergency: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  fire:      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
  ergo:      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4',
  incident:  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4',
  health:    'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
  ppe:       'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
};

const OHS_ITEMS = [
  {
    id: 'emergency',
    label: 'Emergency\nProcedures',
    type: 'EMERGENCY' as ContentType,
    icon: '🚨',
    img: 'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?w=600&h=400&q=75&fit=crop',
    videoUrl: VIDEOS.emergency,
    hasVideo: true,
    name: 'Emergency Procedures',
    desc: 'Know what to do in any emergency. Covers fire evacuation routes, assembly points, emergency contact numbers, and first response protocols for all areas of Etihad Plaza.',
    contact: 'Emergency: 999  ·  Security: 02 511 5911',
    highlight: 'Assembly Point: Main Car Park — Gate B',
    resources: [
      { label: 'Evacuation Floor Plan',    type: 'PDF'      as ContentType },
      { label: 'Emergency Response Video', type: 'VIDEO'    as ContentType },
      { label: 'First Aid Guide',          type: 'PDF'      as ContentType },
    ],
  },
  {
    id: 'fire',
    label: 'Fire Safety',
    type: 'TRAINING' as ContentType,
    icon: '🔥',
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&h=400&q=75&fit=crop',
    videoUrl: VIDEOS.fire,
    hasVideo: true,
    name: 'Fire Safety Awareness',
    desc: 'Our fire safety programme covers prevention, detection systems, extinguisher types and usage, and evacuation drills. All staff complete annual training. Review evacuation notices posted in every room.',
    contact: 'Fire Safety Officer: 02 511 5920',
    highlight: 'Last Drill: March 2026 — All Clear',
    resources: [
      { label: 'Fire Safety Training',  type: 'VIDEO'    as ContentType },
      { label: 'Fire Warden Handbook',  type: 'PDF'      as ContentType },
      { label: 'Extinguisher Guide',    type: 'INFO'     as ContentType },
    ],
  },
  {
    id: 'ergonomics',
    label: 'Ergonomics &\nWellness',
    type: 'INFO' as ContentType,
    icon: '🪑',
    img: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&q=75&fit=crop',
    videoUrl: VIDEOS.ergo,
    hasVideo: true,
    name: 'Ergonomics & Workplace Wellness',
    desc: 'Prolonged sitting and poor posture are leading causes of workplace injury. Guidance on workstation setup, posture correction, micro-break exercises, and eye strain reduction.',
    contact: 'Wellness Desk: 02 511 5200',
    highlight: 'Book a free ergonomic assessment — Dial 5200',
    resources: [
      { label: 'Self-Assessment Form',      type: 'PDF'      as ContentType },
      { label: 'Posture & Stretching',      type: 'VIDEO'    as ContentType },
      { label: 'Workstation Setup Guide',   type: 'INFO'     as ContentType },
    ],
  },
  {
    id: 'incident',
    label: 'Incident\nReporting',
    type: 'POLICY' as ContentType,
    icon: '📋',
    img: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&h=400&q=75&fit=crop',
    videoUrl: VIDEOS.incident,
    hasVideo: true,
    name: 'Incident Reporting',
    desc: 'All accidents, near-misses, and unsafe conditions must be reported immediately. Etihad Plaza operates a no-blame reporting culture. Submit via front desk, QR code in room, or directly to OHS.',
    contact: 'OHS Hotline: 02 511 5950',
    highlight: 'Report any incident within 24 hours',
    resources: [
      { label: 'Incident Report Form',   type: 'PDF'      as ContentType },
      { label: 'How to Report — Video',  type: 'VIDEO'    as ContentType },
      { label: 'Near-Miss Guidance',     type: 'INFO'     as ContentType },
    ],
  },
  {
    id: 'health',
    label: 'Occupational\nHealth',
    type: 'INFO' as ContentType,
    icon: '🏥',
    img: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&h=400&q=75&fit=crop',
    videoUrl: VIDEOS.health,
    hasVideo: true,
    name: 'Occupational Health Services',
    desc: 'Supporting physical and mental wellbeing of all staff. Services include health screenings, stress management, vaccination programmes, and return-to-work assessments — all fully confidential.',
    contact: 'EAMC Clinic: 02 511 5555',
    highlight: 'EAMC — First aeromedical centre in the region',
    resources: [
      { label: 'Health Screening Info',      type: 'PDF'      as ContentType },
      { label: 'Mental Wellbeing Resources', type: 'INFO'     as ContentType },
      { label: 'Vaccination Programme',      type: 'TRAINING' as ContentType },
    ],
  },
  {
    id: 'ppe',
    label: 'PPE & Safe\nPractices',
    type: 'TRAINING' as ContentType,
    icon: '🦺',
    img: 'https://images.unsplash.com/photo-1581092160562-40aa08e8b7c7?w=600&h=400&q=75&fit=crop',
    videoUrl: VIDEOS.ppe,
    hasVideo: true,
    name: 'PPE & Safe Working Practices',
    desc: 'Personal Protective Equipment is mandatory in designated areas. Covers PPE selection, fitting, maintenance, and disposal. Guides available for housekeeping, engineering, and F&B roles.',
    contact: 'Safety Coordinator: 02 511 5930',
    highlight: 'PPE required: Engineering, Kitchen & Pool areas',
    resources: [
      { label: 'PPE Selection Guide',        type: 'PDF'      as ContentType },
      { label: 'Safe Practices Training',    type: 'VIDEO'    as ContentType },
      { label: 'PPE Maintenance Checklist',  type: 'PDF'      as ContentType },
    ],
  },
];

type OHSItem = typeof OHS_ITEMS[0];

/* ─── Remote nav ─────────────────────────────────────────── */
// Sections: 'cards' | 'back'
// Within cards: index 0-5
// back = 6
type NavSection = 'cards' | 'back';

/* ─── Props ──────────────────────────────────────────────── */
export interface OHSScreenProps {
  guestName?:             string;
  temperature?:           number;
  weatherCondition?:      string;
  backgroundImageSource?: ImageSourcePropType | null;
  onBack:                 () => void;
  isActive?:              boolean;
}

/* ─── TypePill ───────────────────────────────────────────── */
function TypePill({ type, small }: { type: ContentType; small?: boolean }) {
  const m = TYPE_META[type];
  return (
    <View style={[st.pill, { backgroundColor: m.bg }, small && st.pillSm]}>
      <Text style={[st.pillTxt, { color: m.color }, small && st.pillTxtSm]}>
        {m.icon}  {m.label}
      </Text>
    </View>
  );
}

/* ─── ResourceRow ────────────────────────────────────────── */
function ResourceRow({ label, type, last }: { label: string; type: ContentType; last?: boolean }) {
  const m = TYPE_META[type];
  return (
    <View style={[st.resRow, last && { borderBottomWidth: 0 }]}>
      <View style={[st.resIconWrap, { backgroundColor: m.bg }]}>
        <Text style={[st.resIcon, { color: m.color }]}>{m.icon}</Text>
      </View>
      <Text style={st.resLabel} numberOfLines={1}>{label}</Text>
      <View style={[st.resBadge, { backgroundColor: m.bg }]}>
        <Text style={[st.resBadgeTxt, { color: m.color }]}>{m.label}</Text>
      </View>
    </View>
  );
}

/* ─── ThumbCard ──────────────────────────────────────────── */
const ThumbCard = React.memo(function ThumbCard({
  item, active, focused, onPress,
}: {
  item: OHSItem; active: boolean; focused: boolean; onPress: () => void;
}) {
  const m = TYPE_META[item.type];
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[st.thumb, active && st.thumbActive, focused && st.thumbFocused]}
    >
      <Image source={{ uri: item.img }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={active
          ? ['rgba(0,0,0,0.0)', 'rgba(0,0,0,0.82)']
          : ['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.70)']}
        style={StyleSheet.absoluteFill}
      />

      {/* Active gold top line */}
      {active && <View style={st.thumbActiveLine} />}

      {/* Type dot top-left */}
      <View style={[st.thumbDot, { backgroundColor: m.color }]} />

      {/* Icon + label */}
      <View style={st.thumbBottom}>
        <Text style={st.thumbIcon}>{item.icon}</Text>
        <Text style={[st.thumbLabel, active && st.thumbLabelActive]} numberOfLines={2}>
          {item.label}
        </Text>
      </View>

      {/* Video badge */}
      {item.hasVideo && (
        <View style={st.thumbVideoBadge}>
          <Text style={st.thumbVideoBadgeTxt}>▶</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

/* ─── DetailPanel ────────────────────────────────────────── */
const DetailPanel = React.memo(function DetailPanel({ item }: { item: OHSItem }) {
  return (
    <View style={st.detail}>
      {/* Title area */}
      <View style={st.detailTitleRow}>
        <Text style={st.detailIcon}>{item.icon}</Text>
        <View style={st.detailTitleText}>
          <TypePill type={item.type} small />
          <Text style={st.detailName} numberOfLines={2}>{item.name}</Text>
        </View>
      </View>

      <View style={st.detailDivider} />

      <ScrollView style={st.detailScroll} showsVerticalScrollIndicator={false}>
        {/* Description */}
        <Text style={st.detailDesc}>{item.desc}</Text>

        {/* Highlight callout */}
        <View style={st.highlight}>
          <View style={st.highlightBar} />
          <Text style={st.highlightTxt}>{item.highlight}</Text>
        </View>

        {/* Contact */}
        {!!item.contact && (
          <View style={st.contactRow}>
            <Text style={st.contactIcon}>📞</Text>
            <Text style={st.contactTxt}>{item.contact}</Text>
          </View>
        )}

        {/* Resources */}
        <View style={st.resSection}>
          <Text style={st.resSectionTitle}>RESOURCES</Text>
          {item.resources.map((r, i) => (
            <ResourceRow
              key={i}
              label={r.label}
              type={r.type}
              last={i === item.resources.length - 1}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
});

/* ─── MAIN SCREEN ────────────────────────────────────────── */
export default function OccupationalHealthSafetyScreen({
  guestName        = 'Nancy',
  temperature      = 23,
  weatherCondition = 'SUNNY',
  onBack,
  isActive         = false,
}: OHSScreenProps) {

  const [activeIdx,  setActiveIdx]  = useState(0);
  const [focusIdx,   setFocusIdx]   = useState(0);   // 0-5 = cards, 6 = back
  const [navSection, setNavSection] = useState<NavSection>('cards');
  const [videoPaused, setVideoPaused] = useState(false);
  const [clock, setClock] = useState(getClockStr());
  const [date,  setDate]  = useState(getDateStr());

  const activeIdxRef  = useRef(0);
  const focusIdxRef   = useRef(0);
  const navSectionRef = useRef<NavSection>('cards');
  const onBackRef     = useRef(onBack);
  onBackRef.current   = onBack;

  useEffect(() => {
    const t = setInterval(() => { setClock(getClockStr()); setDate(getDateStr()); }, 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (isActive) {
      activeIdxRef.current  = 0; setActiveIdx(0);
      focusIdxRef.current   = 0; setFocusIdx(0);
      navSectionRef.current = 'cards'; setNavSection('cards');
      setVideoPaused(false);
    }
  }, [isActive]);

  const selectCard = useCallback((idx: number) => {
    activeIdxRef.current = idx;
    focusIdxRef.current  = idx;
    setActiveIdx(idx);
    setFocusIdx(idx);
    setVideoPaused(false);
    navSectionRef.current = 'cards';
    setNavSection('cards');
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android' || !isActive) return;
    const sub = DeviceEventEmitter.addListener('onKeyDown', (evt: { keyCode: number }) => {
      const kc  = evt.keyCode;
      const sec = navSectionRef.current;

      // BACK key
      if (kc === 4) { onBackRef.current?.(); return; }

      if (sec === 'cards') {
        if (kc === 22) {
          // RIGHT
          const next = Math.min(5, focusIdxRef.current + 1);
          focusIdxRef.current = next; setFocusIdx(next);
        } else if (kc === 21) {
          // LEFT
          const next = Math.max(0, focusIdxRef.current - 1);
          focusIdxRef.current = next; setFocusIdx(next);
        } else if (kc === 20) {
          // DOWN → back
          navSectionRef.current = 'back'; setNavSection('back');
        } else if (kc === 23 || kc === 66 || kc === 109) {
          // OK → activate card
          selectCard(focusIdxRef.current);
        }
      } else if (sec === 'back') {
        if (kc === 19) {
          // UP → cards
          navSectionRef.current = 'cards'; setNavSection('cards');
        } else if (kc === 23 || kc === 66 || kc === 109) {
          onBackRef.current?.();
        }
      }
    });
    return () => sub.remove();
  }, [isActive, selectCard]);

  const activeItem = OHS_ITEMS[activeIdx];

  return (
    <View style={st.root}>
      <StatusBar hidden />

      {/* ── TOPBAR ── */}
      <View style={st.topbar}>

        {/* LEFT: weather + clock */}
        <View style={st.topLeft}>
          <View style={st.weatherRow}>
            <Text style={st.sunIcon}>⛅</Text>
            <View>
              <View style={st.tempRow}>
                <Text style={st.temp}>{temperature}</Text>
                <Text style={st.tempUnit}>°C</Text>
              </View>
              <Text style={st.sunLabel}>{weatherCondition}</Text>
            </View>
          </View>
          <View style={st.divV} />
          <View style={st.clockWrap}>
            <Text style={st.clockTime}>{clock}</Text>
            <Text style={st.clockDate}>{date}</Text>
          </View>
        </View>

        {/* CENTER: logo */}
        <View style={st.topCenter}>
          <Image
            source={require('../assets/images/ethiad-logo-marketing.png')}
            style={st.logo}
            resizeMode="contain"
          />
        </View>

        {/* RIGHT: page title */}
        <View style={st.topRight}>
          <Text style={st.pageSubtitle}>OCCUPATIONAL HEALTH</Text>
          <Text style={st.pageTitle}>& Safety</Text>
        </View>

      </View>

      {/* Gold separator */}
      <LinearGradient
        colors={['transparent', C.gold, 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={st.sep}
      />

      {/* ── MAIN CONTENT ── */}
      <View style={st.main}>

        {/* LEFT COLUMN: video + thumbnail strip */}
        <View style={st.leftCol}>

          {/* ── VIDEO / HERO PLAYER ── */}
          <View style={[st.player, { height: PLAYER_H }]}>
            <VLCPlayer
              style={StyleSheet.absoluteFill}
              source={{ uri: activeItem.videoUrl }}
              videoAspectRatio="16:9"
              resizeMode="fill"
              paused={videoPaused || !isActive}
            />

            {/* Subtle gradient top → transparent for readability */}
            <LinearGradient
              colors={['rgba(0,0,0,0.45)', 'transparent', 'rgba(0,0,0,0.55)']}
              locations={[0, 0.4, 1]}
              style={StyleSheet.absoluteFill}
              pointerEvents="none"
            />

            {/* TOP-LEFT: section type pill + live pulse */}
            <View style={st.playerTopLeft}>
              <View style={st.playerLiveBadge}>
                <PulseDot size={5} color={C.red} />
                <Text style={st.playerLiveTxt}>OHS · {activeItem.type}</Text>
              </View>
            </View>

            {/* TOP-RIGHT: play/pause hint */}
            <View style={st.playerTopRight}>
              <TypePill type={activeItem.type} />
            </View>

            {/* BOTTOM: title overlay */}
            <LinearGradient
              colors={['transparent', 'rgba(6,6,12,0.92)']}
              style={st.playerBottom}
              pointerEvents="none"
            >
              <Text style={st.playerIcon}>{activeItem.icon}</Text>
              <View style={st.playerBottomText}>
                <Text style={st.playerTitle}>{activeItem.name}</Text>
                <Text style={st.playerSubtitle} numberOfLines={1}>{activeItem.highlight}</Text>
              </View>
              {/* Video indicator */}
              <View style={st.playerVideoTag}>
                <Text style={st.playerVideoTagTxt}>▶  VIDEO</Text>
              </View>
            </LinearGradient>
          </View>

          {/* ── THUMBNAIL STRIP ── */}
          <View style={st.strip}>
            {OHS_ITEMS.map((item, i) => (
              <ThumbCard
                key={item.id}
                item={item}
                active={i === activeIdx}
                focused={navSection === 'cards' && i === focusIdx}
                onPress={() => selectCard(i)}
              />
            ))}
          </View>

        </View>

        {/* GAP */}
        <View style={{ width: 16 }} />

        {/* RIGHT: detail panel */}
        <DetailPanel item={activeItem} />

      </View>

      {/* ── BOTTOMBAR ── */}
      <View style={st.bottombar}>
        <BackButton
          onPress={onBack}
          focused={navSection === 'back'}
          size="sm"
        />
        <View style={st.navHintWrap}>
          <Text style={st.navHint}>← →  Browse   ·   OK  Select   ·   ↓  Back   ·   ⌫  Exit</Text>
        </View>
      </View>

    </View>
  );
}

/* ─── STYLES ─────────────────────────────────────────────── */
const st = StyleSheet.create({

  root: { flex: 1, backgroundColor: C.bg },

  /* TOPBAR */
  topbar: {
    height: TOPBAR_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: SW * 0.26,
    gap: 12,
  },
  weatherRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tempRow:    { flexDirection: 'row', alignItems: 'flex-start' },
  temp:       { fontFamily: FontFamily.bold,  fontSize: 22, color: C.text, lineHeight: 26 },
  tempUnit:   { fontFamily: FontFamily.book,  fontSize: 11, color: C.gold, marginTop: 2, marginLeft: 1 },
  sunLabel:   { fontFamily: FontFamily.light, fontSize: 7,  color: C.muted, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 2 },
  sunIcon:    { fontSize: 30, lineHeight: 30 },
  divV:       { width: 1, height: 30, backgroundColor: C.sep },
  clockWrap:  { alignItems: 'flex-start' },
  clockTime:  { fontFamily: FontFamily.light, fontSize: 22, color: C.gold, letterSpacing: 1.5, lineHeight: 26 },
  clockDate:  { fontFamily: FontFamily.book,  fontSize: 8,  color: C.muted, letterSpacing: 0.8, marginTop: 2 },

  topCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo:      { width: 140, height: 46 },

  topRight:    { width: SW * 0.26, alignItems: 'flex-end', justifyContent: 'center' },
  pageSubtitle:{ fontFamily: FontFamily.medium, fontSize: 9,  color: C.gold,  letterSpacing: 2.5, textAlign: 'right' },
  pageTitle:   { fontFamily: FontFamily.light,  fontSize: 20, color: C.text,  letterSpacing: 0.5, textAlign: 'right', marginTop: 3 },

  sep: { height: 1 },

  /* MAIN */
  main: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: H_PAD,
    paddingTop: 16,
    paddingBottom: 8,
  },

  leftCol: {
    flex: 1,
    flexDirection: 'column',
  },

  /* VIDEO PLAYER */
  player: {
    width: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: C.border,
  },
  playerTopLeft: {
    position: 'absolute', top: 12, left: 14,
  },
  playerLiveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(6,6,12,0.72)',
    borderRadius: 3, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(200,68,58,0.3)',
  },
  playerLiveTxt: {
    fontFamily: FontFamily.medium, color: C.text,
    fontSize: 8, letterSpacing: 2,
  },
  playerTopRight: {
    position: 'absolute', top: 12, right: 14,
  },
  playerBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingTop: 40, paddingBottom: 14,
    gap: 12,
  },
  playerIcon:         { fontSize: 28, marginBottom: 2 },
  playerBottomText:   { flex: 1 },
  playerTitle:        { fontFamily: FontFamily.medium, color: C.text,  fontSize: 16, letterSpacing: 0.3, marginBottom: 3 },
  playerSubtitle:     { fontFamily: FontFamily.book,   color: C.gold,  fontSize: 9,  letterSpacing: 0.5 },
  playerVideoTag: {
    backgroundColor: 'rgba(74,159,212,0.22)',
    borderRadius: 3, paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(74,159,212,0.35)',
    alignSelf: 'flex-end',
  },
  playerVideoTagTxt: { fontFamily: FontFamily.medium, color: C.blue, fontSize: 8, letterSpacing: 2 },

  /* THUMBNAIL STRIP */
  strip: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 10,
    height: CARD_STRIP,
  },
  thumb: {
    flex: 1,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
  },
  thumbActive: {
    borderColor: C.gold,
  },
  thumbFocused: {
    borderColor: C.gold2,
    shadowColor: C.gold,
    shadowOpacity: 0.6,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  thumbActiveLine: {
    position: 'absolute', top: 0, left: 0, right: 0,
    height: 2, backgroundColor: C.gold, zIndex: 2,
  },
  thumbDot: {
    position: 'absolute', top: 8, left: 8,
    width: 6, height: 6, borderRadius: 3,
  },
  thumbBottom:       { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8 },
  thumbIcon:         { fontSize: 14, marginBottom: 2 },
  thumbLabel:        { fontFamily: FontFamily.book,   color: C.text,  fontSize: 8,  letterSpacing: 0.2, lineHeight: 11 },
  thumbLabelActive:  { fontFamily: FontFamily.medium, color: C.gold2 },
  thumbVideoBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 2, width: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  thumbVideoBadgeTxt: { color: C.blue, fontSize: 7 },

  /* TYPE PILL */
  pill:      { borderRadius: 3, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', flexDirection: 'row' },
  pillSm:    { paddingHorizontal: 6, paddingVertical: 2 },
  pillTxt:   { fontFamily: FontFamily.medium, fontSize: 8, letterSpacing: 1.2 },
  pillTxtSm: { fontSize: 7 },

  /* DETAIL PANEL */
  detail: {
    width: DETAIL_W,
    backgroundColor: 'rgba(12,12,18,0.6)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    flexDirection: 'column',
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
    backgroundColor: 'rgba(200,170,127,0.04)',
  },
  detailIcon:      { fontSize: 28, marginTop: 2 },
  detailTitleText: { flex: 1, gap: 6 },
  detailName: {
    fontFamily: FontFamily.medium,
    fontSize: 14, color: C.text,
    lineHeight: 19, letterSpacing: 0.2,
    marginTop: 4,
  },
  detailDivider: { height: 1, backgroundColor: C.border, marginHorizontal: 0 },
  detailScroll:  { flex: 1, padding: 14 },

  detailDesc: {
    fontFamily: FontFamily.book,
    fontSize: 10, color: C.muted,
    lineHeight: 16, marginBottom: 12,
  },

  /* Highlight */
  highlight: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(200,170,127,0.07)',
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
  highlightBar: { width: 2, borderRadius: 1, backgroundColor: C.gold, alignSelf: 'stretch' },
  highlightTxt: { flex: 1, fontFamily: FontFamily.book, fontSize: 9, color: C.gold, lineHeight: 14, letterSpacing: 0.3 },

  /* Contact */
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  contactIcon: { fontSize: 11 },
  contactTxt:  { fontFamily: FontFamily.book, fontSize: 9, color: C.muted, letterSpacing: 0.3, flex: 1 },

  /* Resources */
  resSection:      { gap: 0 },
  resSectionTitle: { fontFamily: FontFamily.medium, fontSize: 7, color: C.gold, letterSpacing: 3, marginBottom: 8 },
  resRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  resIconWrap:  { width: 24, height: 24, borderRadius: 4, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  resIcon:      { fontSize: 10 },
  resLabel:     { flex: 1, fontFamily: FontFamily.book, fontSize: 9, color: C.text, letterSpacing: 0.2 },
  resBadge:     { borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2 },
  resBadgeTxt:  { fontFamily: FontFamily.medium, fontSize: 7, letterSpacing: 1 },

  /* BOTTOMBAR */
  bottombar: {
    height: BOTTOM_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    borderTopWidth: 1,
    borderTopColor: C.sep,
    gap: 16,
  },
  navHintWrap: { flex: 1, alignItems: 'center' },
  navHint:     { fontFamily: FontFamily.book, fontSize: 9, color: 'rgba(200,170,127,0.3)', letterSpacing: 1.5 },
});