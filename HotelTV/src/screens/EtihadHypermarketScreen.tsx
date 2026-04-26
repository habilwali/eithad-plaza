/**
 * Etihad Plaza Hotel — Hypermarket Screen
 * React Native TV App · Dark Teal/Green Theme · Full D-Pad Navigation
 *
 * Navigation layout:
 *   'sidebar'   – hypermarket list  (UP/DOWN to move, OK to select)
 *   'viewer'    – Catalogue image viewer (UP/DOWN scroll, LEFT/RIGHT change image, LEFT → back)
 *
 * Remote key codes (Android TV):
 *   19 = UP | 20 = DOWN | 21 = LEFT | 22 = RIGHT | 23/66 = OK | 4 = BACK
 */

import React, {
  useState, useRef, useEffect, useCallback,
} from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, Dimensions,
  DeviceEventEmitter, Platform,
  ImageSourcePropType,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { FontFamily } from '../theme/typography';
import { Colors } from '../theme/colors';
import { AppHeader } from '../components/common/AppHeader';
import { useAppHeaderClock } from '../hooks/useAppHeaderClock';

const { width: SW, height: SH } = Dimensions.get('window');

/** Matches WelcomeScreen `bottomNavBar` — store title / meta row */
const BOTTOM_BAR_BG = 'rgba(40,52,62,0.88)';

/* ─── THEME (align with FacilitiesScreen — Etihad text + primary accents) ── */
const C = {
  bg: Colors.background.dark,
  surface: '#0C1A12',
  panel: '#0E1F15',
  text: Colors.text.light,
  muted: Colors.text.muted,
  border: Colors.overlay.gold[15],
  borderDim: Colors.overlay.gold[8],
  focusBorder: Colors.overlay.gold[75],
  focusBg: Colors.overlay.gold[10],
  selectedBg: Colors.overlay.gold[10],
  priceRed: '#E74C3C',
  offerYellow: '#F1C40F',
};

/* ─── SIDEBAR WIDTH ─────────────────────────────────────── */
const SIDEBAR_W = 280;
const CONTENT_W = SW - SIDEBAR_W;

/* ─── DATA ───────────────────────────────────────────────── */
const HYPERMARKETS = [
  {
    id: 1,
    name: 'LuLu Hypermarket',
    emoji: '🛒',
    tagline: 'Fresh · Value · Everything',
    location: 'Khalifa City, Abu Dhabi',
    badge: '🏆 #1 in UAE',
    color: '#E8251A',
    hours: '8AM – 12AM',
    floorArea: '15,000 sqm',
  },
  {
    id: 2,
    name: 'Nesto Hypermarket',
    emoji: '🥬',
    tagline: 'Fresh Savings Every Day',
    location: 'Mussafah, Abu Dhabi',
    badge: null,
    color: '#27AE60',
    hours: '7AM – 11PM',
    floorArea: '8,500 sqm',
  },
  {
    id: 3,
    name: 'Géant Hypermarket',
    emoji: '🧺',
    tagline: 'Le Bon Marché · Quality & Value',
    location: 'Ibn Battuta, Dubai',
    badge: '🇫🇷 French',
    color: '#2980B9',
    hours: '9AM – 12AM',
    floorArea: '20,000 sqm',
  },
  {
    id: 4,
    name: 'Carrefour',
    emoji: '🏪',
    tagline: 'Act For Food · Live Better',
    location: 'Deira City Centre, Dubai',
    badge: '🌍 Global',
    color: '#1A6EC9',
    hours: '8AM – 12AM',
    floorArea: '22,000 sqm',
  },
  {
    id: 5,
    name: 'VIVA Supermarket',
    emoji: '🍊',
    tagline: 'Fresh · Local · Affordable',
    location: 'Sharjah & RAK',
    badge: null,
    color: '#E67E22',
    hours: '7AM – 11PM',
    floorArea: '6,000 sqm',
  },
];

const CATALOGUE_TABS = ['Weekly Offers', 'Fresh & Organic', 'Bakery', 'Electronics', 'Household'] as const;
type CatalogueTab = typeof CATALOGUE_TABS[number];

/* ─── Catalogue images: array of images per store+tab. Use require() for local, { uri } for remote.
 *     Add images to src/assets/catalogues/ and reference here. Left/Right arrows or D-pad to change image.
 * ─────────────────────────────────────────────────────────────────────────────────────────────────── */
type CatalogueImageSet = (ImageSourcePropType)[] | ImageSourcePropType | null;

const CATALOGUE_IMAGES: Record<string, Record<CatalogueTab, CatalogueImageSet>> = {
  'LuLu Hypermarket': {
    'Weekly Offers':    [
      require('../assets/catalogues/lulu-weekly-offers.png'),
      require('../assets/catalogues/lulu-weekly-offers-2.png'),
    ],
    'Fresh & Organic':  null,
    'Bakery':           null,
    'Electronics':      null,
    'Household':        null,
  },
  'Nesto Hypermarket': {
    'Weekly Offers':    null,
    'Fresh & Organic':  null,
    'Bakery':           null,
    'Electronics':      null,
    'Household':        null,
  },
  'Géant Hypermarket': {
    'Weekly Offers':    null,
    'Fresh & Organic':  null,
    'Bakery':           null,
    'Electronics':      null,
    'Household':        null,
  },
  'Carrefour': {
    'Weekly Offers':    null,
    'Fresh & Organic':  null,
    'Bakery':           null,
    'Electronics':      null,
    'Household':        null,
  },
  'VIVA Supermarket': {
    'Weekly Offers':    null,
    'Fresh & Organic':  null,
    'Bakery':           null,
    'Electronics':      null,
    'Household':        null,
  },
};

/* Tab icons */
const TAB_ICONS: Record<CatalogueTab, string> = {
  'Weekly Offers':   '🏷️',
  'Fresh & Organic': '🥦',
  'Bakery':          '🥐',
  'Electronics':     '📱',
  'Household':       '🧹',
};

type NavSection = 'sidebar' | 'viewer';

export interface EtihadHypermarketScreenProps {
  onBack?: () => void;
  isActive?: boolean;
}

/* ─── Brand rule (Etihad primary — same idea as Etihad Plaza / Facilities) ─ */
function GreenRule() {
  return (
    <LinearGradient
      colors={[
        'transparent',
        Colors.primary,
        Colors.primaryLight,
        Colors.primary,
        'transparent',
      ]}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      style={s.greenRule}
    />
  );
}

/* ─── Normalize image set to array ─────────────────────────────────────────── */
function toImageArray(set: CatalogueImageSet): (ImageSourcePropType)[] | null {
  if (!set) return null;
  return Array.isArray(set) ? set : [set];
}

/* Scroll step in pixels per UP/DOWN keypress */
const IMAGE_SCROLL_STEP = 180;

/* ─── CATALOGUE IMAGE VIEWER ──────────────────────────────────────────────────
 *  Shows images with left/right arrows. Add images to assets/catalogues/
 * ───────────────────────────────────────────────────────────────────────────── */
function CatalogueImagePanel({
  images,
  currentIdx,
  onPrev,
  onNext,
  scrollViewRef,
  onScroll,
  focused,
  storeName,
  tabName,
}: {
  images: (ImageSourcePropType)[];
  currentIdx: number;
  onPrev: () => void;
  onNext: () => void;
  scrollViewRef: React.RefObject<ScrollView | null>;
  onScroll: (y: number) => void;
  focused: boolean;
  storeName: string;
  tabName: CatalogueTab;
}) {
  const total = images.length;
  const hasMultiple = total > 1;
  const currentImage = images[currentIdx];

  return (
    <View style={s.imageViewerWrap}>
      {/* Left arrow */}
      {hasMultiple && (
        <TouchableOpacity
          onPress={onPrev}
          focusable
          style={[s.arrowBtn, s.arrowLeft, focused && s.arrowBtnFocused]}
          accessibilityLabel="Previous image"
        >
          <Text style={s.arrowTxt}>‹</Text>
        </TouchableOpacity>
      )}

      {/* Image area */}
      <ScrollView
        ref={scrollViewRef as React.RefObject<ScrollView>}
        style={s.imageScrollView}
        contentContainerStyle={s.imageScrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => onScroll(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={50}
      >
        <Image
          source={currentImage}
          style={s.catalogueImage}
          resizeMode="contain"
        />
      </ScrollView>

      {/* Right arrow */}
      {hasMultiple && (
        <TouchableOpacity
          onPress={onNext}
          focusable
          style={[s.arrowBtn, s.arrowRight, focused && s.arrowBtnFocused]}
          accessibilityLabel="Next image"
        >
          <Text style={s.arrowTxt}>›</Text>
        </TouchableOpacity>
      )}

      {/* Page indicator */}
      {hasMultiple && (
        <View style={s.pageIndicator}>
          <Text style={s.pageIndicatorTxt}>
            {currentIdx + 1} / {total}
          </Text>
        </View>
      )}
    </View>
  );
}

/* ─── Placeholder when no images ───────────────────────────────────────────── */
function CataloguePlaceholder({ focused, storeName, tabName }: {
  focused: boolean;
  storeName: string;
  tabName: CatalogueTab;
}) {
  return (
    <View style={[s.imagePlaceholder, focused && s.imagePlaceholderFocused]}>
      <LinearGradient
        colors={['transparent', Colors.overlay.gold[6], 'transparent']}
        style={StyleSheet.absoluteFill}
      />
      <View style={s.gridOverlay} pointerEvents="none">
        {Array.from({ length: 7 }).map((_, i) => (
          <View key={`h${i}`} style={[s.gridLine,  { top:  `${(i + 1) * 12}%` as any }]} />
        ))}
        {Array.from({ length: 5 }).map((_, i) => (
          <View key={`v${i}`} style={[s.gridLineV, { left: `${(i + 1) * 17}%` as any }]} />
        ))}
      </View>
      <View style={[s.corner, s.cornerTL]} />
      <View style={[s.corner, s.cornerTR]} />
      <View style={[s.corner, s.cornerBL]} />
      <View style={[s.corner, s.cornerBR]} />
      <Text style={s.imagePlaceholderEmoji}>{TAB_ICONS[tabName]}</Text>
      <Text style={s.imagePlaceholderTitle}>{tabName.toUpperCase()}</Text>
      <Text style={s.imagePlaceholderStore}>{storeName}</Text>
      <View style={s.imagePlaceholderDivider} />
      <Text style={s.imagePlaceholderHint}>
        {'Add images to '}
        <Text style={{ color: Colors.primary }}>src/assets/catalogues/</Text>
        {' and add to CATALOGUE_IMAGES array'}
      </Text>
    </View>
  );
}

/* ─── MAIN SCREEN ────────────────────────────────────────── */
export default function EtihadHypermarketScreen({
  onBack,
  isActive = false,
}: EtihadHypermarketScreenProps) {

  const [navSection,  setNavSection]  = useState<NavSection>('sidebar');
  const [storeIdx,    setStoreIdx]    = useState(0);
  const [imageIdx,    setImageIdx]    = useState(0);

  const navRef     = useRef<NavSection>('sidebar');
  const storeRef   = useRef(0);
  const imageIdxRef = useRef(0);
  const onBackRef  = useRef(onBack);
  useEffect(() => { onBackRef.current = onBack; }, [onBack]);

  const setNav   = useCallback((v: NavSection) => { navRef.current = v; setNavSection(v);  }, []);
  const setStore = useCallback((v: number)      => { storeRef.current = v; setStoreIdx(v);  }, []);
  useEffect(() => { imageIdxRef.current = imageIdx; }, [imageIdx]);

  const sidebarScrollRef   = useRef<ScrollView>(null);
  const imageScrollRef     = useRef<ScrollView>(null);
  const imageScrollYRef    = useRef(0);

  const store       = HYPERMARKETS[storeIdx];
  const imageSet    = CATALOGUE_IMAGES[store.name]?.['Weekly Offers'] ?? null;
  const images      = toImageArray(imageSet);

  useEffect(() => {
    sidebarScrollRef.current?.scrollTo({ y: storeIdx * 118, animated: true });
  }, [storeIdx]);

  useEffect(() => { setImageIdx(0); imageScrollYRef.current = 0; }, [storeIdx]);
  useEffect(() => { imageScrollYRef.current = 0; }, [imageIdx]);

  useEffect(() => {
    if (isActive) {
      setNav('sidebar'); setStore(0);
    }
  }, [isActive]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !isActive) return;

    const sub = DeviceEventEmitter.addListener('onKeyDown', (evt: { keyCode: number }) => {
      const kc  = evt.keyCode;
      const sec = navRef.current;

      if (kc === 4) { onBackRef.current?.(); return; }

      if (kc === 19) {
        if (sec === 'sidebar') {
          setStore(Math.max(0, storeRef.current - 1));
        } else if (sec === 'viewer') {
          const newY = Math.max(0, imageScrollYRef.current - IMAGE_SCROLL_STEP);
          imageScrollRef.current?.scrollTo({ y: newY, animated: true });
        }
      } else if (kc === 20) {
        if (sec === 'sidebar') {
          setStore(Math.min(HYPERMARKETS.length - 1, storeRef.current + 1));
        } else if (sec === 'viewer') {
          const newY = imageScrollYRef.current + IMAGE_SCROLL_STEP;
          imageScrollRef.current?.scrollTo({ y: newY, animated: true });
        }
      } else if (kc === 21) {
        if (sec === 'viewer') {
          const imgs = toImageArray(CATALOGUE_IMAGES[HYPERMARKETS[storeRef.current].name]?.['Weekly Offers']);
          if (imgs && imgs.length > 1 && imageIdxRef.current > 0) {
            setImageIdx(imageIdxRef.current - 1);
          } else {
            setNav('sidebar');
          }
        }
      } else if (kc === 22) {
        if (sec === 'sidebar') {
          setNav('viewer');
        } else if (sec === 'viewer') {
          const imgs = toImageArray(CATALOGUE_IMAGES[HYPERMARKETS[storeRef.current].name]?.['Weekly Offers']);
          if (imgs && imgs.length > 1 && imageIdxRef.current < imgs.length - 1) {
            setImageIdx(imageIdxRef.current + 1);
          }
        }
      } else if (kc === 23 || kc === 66) {
        if (sec === 'sidebar') {
          setNav('viewer');
        }
      }
    });

    return () => sub.remove();
  }, [isActive]);

  const headerClock = useAppHeaderClock();

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <AppHeader
        date={headerClock.date}
        time={headerClock.time}
        temperature={headerClock.temperature}
        weatherCondition={headerClock.weatherCondition}
      />

      <View style={s.body}>
        <View style={[s.sidebar, navSection === 'sidebar' && s.sidebarFocused]}>
          <View style={s.sidebarHeader}>
            <Text style={s.sidebarHeaderTxt}>STORES</Text>
            <View style={s.sidebarHeaderLine} />
          </View>

          <ScrollView
            ref={sidebarScrollRef}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
          >
            {HYPERMARKETS.map((hm, i) => {
              const active  = i === storeIdx;
              const focused = navSection === 'sidebar' && i === storeIdx;
              return (
                <TouchableOpacity
                  key={hm.id}
                  onPress={() => { setStore(i); setNav('viewer'); }}
                  activeOpacity={0.85}
                  focusable
                >
                  <View style={[
                    s.sidebarItem,
                    active  && s.sidebarItemActive,
                    focused && s.sidebarItemFocused,
                  ]}>
                    {active && (
                      <LinearGradient
                        colors={[Colors.overlay.gold[10], 'transparent']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                      />
                    )}
                    <View style={[s.storeColorChip, { backgroundColor: hm.color + '33', borderColor: hm.color + '66' }]}>
                      <Text style={s.sidebarEmoji}>{hm.emoji}</Text>
                    </View>
                    <View style={s.sidebarItemBody}>
                      <Text style={[s.sidebarName, (active || focused) && s.sidebarNameActive]}>
                        {hm.name}
                      </Text>
                      <Text style={s.sidebarSub}>{hm.tagline.toUpperCase()}</Text>
                      <Text style={s.sidebarLocation}>📍 {hm.location}</Text>
                    </View>
                    {focused && (
                      <View style={s.sidebarArrow}>
                        <Text style={s.sidebarArrowTxt}>›</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={s.sidebarHint}>
            <GreenRule />
            <View style={s.hintRow}>
              <Text style={s.hintKey}>↕</Text><Text style={s.hintLabel}>Browse</Text>
              <Text style={s.hintKey}>›</Text><Text style={s.hintLabel}>Catalogue</Text>
            </View>
          </View>
        </View>

        <View style={s.content}>
          <View style={[s.viewerArea, navSection === 'viewer' && s.viewerAreaFocused]}>
            <View style={s.viewerTopBar}>
              <Text style={s.viewerTabName}>{store.name.toUpperCase()}  ·  CATALOGUE</Text>
              <View style={s.viewerStorePill}>
                <Text style={s.viewerStorePillTxt}>{store.name.toUpperCase()}</Text>
              </View>
              <Text style={s.viewerHint}>
                {images?.length ? '↕ Scroll  ·  ← → Change image  ·  ← Back' : 'NO IMAGE ASSIGNED'}
              </Text>
            </View>

            <GreenRule />

            <View style={s.imageContainer}>
              {images && images.length > 0 ? (
                <CatalogueImagePanel
                  images={images}
                  currentIdx={imageIdx}
                  onPrev={() => setImageIdx(Math.max(0, imageIdx - 1))}
                  onNext={() => setImageIdx(Math.min(images.length - 1, imageIdx + 1))}
                  scrollViewRef={imageScrollRef}
                  onScroll={(y) => { imageScrollYRef.current = y; }}
                  focused={navSection === 'viewer'}
                  storeName={store.name}
                  tabName="Weekly Offers"
                />
              ) : (
                <CataloguePlaceholder
                  focused={navSection === 'viewer'}
                  storeName={store.name}
                  tabName="Weekly Offers"
                />
              )}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

/* ─── STYLES ─────────────────────────────────────────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },

  greenRule: { height: 1 },

  body: { flex: 1, flexDirection: 'row', overflow: 'hidden' },

  sidebar: {
    width: SIDEBAR_W,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
    backgroundColor: BOTTOM_BAR_BG,
    flexDirection: 'column',
  },
  sidebarFocused: { borderRightColor: 'rgba(255,255,255,0.14)' },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  sidebarHeaderTxt: {
    fontFamily: FontFamily.book,
    fontSize: 10,
    letterSpacing: 0.2,
    color: C.muted,
  },
  sidebarHeaderLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    gap: 12,
    position: 'relative',
  },
  sidebarItemActive: { borderLeftColor: Colors.primary },
  sidebarItemFocused: { borderLeftColor: Colors.primary, backgroundColor: C.focusBg },
  storeColorChip: {
    width: 40,
    height: 40,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sidebarEmoji: { fontSize: 22 },
  sidebarItemBody: { flex: 1 },
  sidebarName: {
    fontFamily: FontFamily.book,
    fontSize: 13,
    lineHeight: 18,
    color: C.muted,
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  sidebarNameActive: { fontFamily: FontFamily.text, color: C.text },
  sidebarSub: {
    fontFamily: FontFamily.book,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.2,
    color: C.muted,
    marginBottom: 2,
  },
  sidebarLocation: {
    fontFamily: FontFamily.book,
    fontSize: 10,
    lineHeight: 15,
    color: C.text,
  },
  sidebarArrow: {
    width: 22,
    height: 22,
    backgroundColor: Colors.primary,
    borderRadius: 2,
    flexShrink: 0,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarArrowTxt: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    lineHeight: 14,
    color: Colors.button.primaryText,
    textAlign: 'center',
    includeFontPadding: false,
    ...(Platform.OS === 'android' ? { marginTop: 2 } : {}),
  },
  sidebarHint: { paddingTop: 2, paddingBottom: 14 },
  hintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 10 },
  hintKey: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.primary,
    backgroundColor: Colors.overlay.gold[10],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: Colors.overlay.gold[30],
  },
  hintLabel: {
    fontFamily: FontFamily.book,
    fontSize: 10,
    letterSpacing: 0.2,
    color: C.muted,
    marginRight: 8,
  },

  content: { flex: 1, flexDirection: 'column', backgroundColor: 'transparent' },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.bg,
  },
  tabBarFocused: { borderBottomColor: C.focusBorder },
  tabBtn: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    position: 'relative',
    gap: 2,
  },
  tabBtnFocused: { backgroundColor: C.focusBg },
  tabIcon: { fontSize: 16, marginBottom: 1 },
  tabLabel: {
    fontFamily: FontFamily.book,
    fontSize: 10,
    letterSpacing: 0.2,
    color: C.muted,
  },
  tabLabelActive: { fontFamily: FontFamily.text, color: Colors.primary },
  tabLine: { position: 'absolute', bottom: -1, left: 12, right: 12, height: 2 },
  imageDot: { width: 5, height: 5, borderRadius: 2.5, marginTop: 2 },
  imageDotAvail: { backgroundColor: Colors.primary },
  imageDotMissing: { backgroundColor: 'rgba(240,244,242,0.15)' },

  viewerArea: {
    flex: 1,
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: 'transparent',
    margin: 16,
    marginTop: 12,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: C.surface,
  },
  viewerAreaFocused: { borderColor: Colors.overlay.gold[35] },
  viewerTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
    backgroundColor: C.panel,
    borderBottomWidth: 1,
    borderBottomColor: C.borderDim,
  },
  viewerTabName: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    letterSpacing: 2,
    color: Colors.primary,
  },
  viewerStorePill: {
    backgroundColor: Colors.overlay.gold[10],
    borderWidth: 1,
    borderColor: Colors.overlay.gold[30],
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  viewerStorePillTxt: {
    fontFamily: FontFamily.book,
    fontSize: 10,
    letterSpacing: 0.2,
    color: Colors.primaryLight,
  },
  viewerHint: {
    flex: 1,
    textAlign: 'right',
    fontFamily: FontFamily.book,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.2,
    color: C.muted,
  },

  imageContainer: { flex: 1 },
  imageViewerWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
    position: 'relative',
  },
  arrowBtn: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.overlay.gold[8],
    borderWidth: 1,
    borderColor: C.border,
  },
  arrowLeft: { borderRightWidth: 0 },
  arrowRight: { borderLeftWidth: 0 },
  arrowBtnFocused: {
    backgroundColor: C.focusBg,
    borderColor: Colors.primary,
  },
  arrowTxt: {
    fontFamily: FontFamily.medium,
    fontSize: 28,
    color: Colors.primary,
  },
  pageIndicator: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pageIndicatorTxt: {
    fontFamily: FontFamily.book,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.2,
    color: C.muted,
    backgroundColor: Colors.overlay.black[55],
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
  },
  imageScrollView: { flex: 1 },
  imageScrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  catalogueImage: {
    width: CONTENT_W - 96 - 48,
    height: SH * 1.5,
  },

  imagePlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
    borderStyle: 'dashed',
  },
  imagePlaceholderFocused: { borderColor: Colors.overlay.gold[20] },
  imagePlaceholderEmoji: { fontSize: 48, marginBottom: 4 },
  imagePlaceholderTitle: {
    fontFamily: FontFamily.book,
    fontSize: 24,
    letterSpacing: 0.4,
    color: C.text,
  },
  imagePlaceholderStore: {
    fontFamily: FontFamily.book,
    fontSize: 10,
    lineHeight: 15,
    letterSpacing: 0.2,
    color: Colors.primaryLight,
  },
  imagePlaceholderDivider: {
    width: 60,
    height: 1,
    backgroundColor: Colors.overlay.gold[30],
    marginVertical: 6,
  },
  imagePlaceholderHint: {
    fontFamily: FontFamily.book,
    fontSize: 10,
    letterSpacing: 0.2,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 400,
  },
  gridOverlay: { ...StyleSheet.absoluteFillObject },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.overlay.gold[6],
  },
  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: Colors.overlay.gold[6],
  },
  corner: { position: 'absolute', width: 14, height: 14 },
  cornerTL: {
    top: 16,
    left: 16,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: Colors.overlay.gold[30],
  },
  cornerTR: {
    top: 16,
    right: 16,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.overlay.gold[30],
  },
  cornerBL: {
    bottom: 16,
    left: 16,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: Colors.overlay.gold[30],
  },
  cornerBR: {
    bottom: 16,
    right: 16,
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: Colors.overlay.gold[30],
  },
});

