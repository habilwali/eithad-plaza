/**
 * Etihad Plaza Hotel — TV Home Screen (EY Plaza)
 * React Native TV App · Etihad Brand · Full D-Pad Navigation
 *
 * Sections (focusable zones):
 *   'nav'        – top nav bar          LEFT/RIGHT to move, OK to select
 *   'hero'       – hero CTA buttons     LEFT/RIGHT, OK to activate
 *   'highlights' – feature strip cards  LEFT/RIGHT, OK → detail
 *   'gallery'    – photo grid           LEFT/RIGHT, OK → full-screen
 *   'rooms'      – room cards           LEFT/RIGHT, OK → detail
 *
 * Key codes: 19=UP 20=DOWN 21=LEFT 22=RIGHT 23/66=OK 4=BACK
 */

import React, {useState, useRef, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  DeviceEventEmitter,
  Platform,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {FontFamily} from '../theme/typography';
import {Colors} from '../theme/colors';
import {
  fetchEtihadPlazaHome,
  type EtihadPlazaGalleryItem,
  type EtihadPlazaHome,
} from '../services/etihadPlazaApi';

const {width: SW, height: SH} = Dimensions.get('window');

/* ─── THEME (Etihad brand — primary gold ~50%, Midnight Dune ~30%) ─────────── */
const C = {
  bg: Colors.background.dark,
  surface: Colors.midnightDune[600],
  panel: Colors.midnightDune[600],
  gold: Colors.primary,
  goldLight: Colors.primaryLight,
  text: Colors.text.light,
  muted: Colors.jebelGrey[300],
  border: Colors.overlay.gold[15],
  borderHi: Colors.overlay.gold[75],
  focusBg: Colors.overlay.gold[10],
  sep: Colors.overlay.white[7],
  green: Colors.saadiyatBlue[400],
};

type Section = 'nav' | 'hero' | 'highlights' | 'gallery' | 'rooms';

function maxIdx(len: number): number {
  return Math.max(0, len - 1);
}

export interface EtihadPlazaScreenProps {
  onBack?: () => void;
  isActive?: boolean;
}

function GoldRule({style = {}}: {style?: object}) {
  return (
    <LinearGradient
      colors={[
        'transparent',
        Colors.primary,
        Colors.primaryLight,
        Colors.primary,
        'transparent',
      ]}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 0}}
      style={[s.goldRule, style]}
    />
  );
}

function Eyebrow({children}: {children: string}) {
  return (
    <View style={s.eyebrow}>
      <View style={s.eyebrowLine} />
      <Text style={s.eyebrowTxt}>{children}</Text>
    </View>
  );
}

function FullScreenView({item}: {item: EtihadPlazaGalleryItem | null}) {
  if (!item) {
    return null;
  }
  return (
    <View style={s.fsOverlay} pointerEvents="none">
      <Image source={{uri: item.img}} style={s.fsImg} resizeMode="cover" />
      <LinearGradient
        colors={['transparent', 'transparent', Colors.overlay.midnight[96]]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <View style={s.fsLabel}>
        <Text style={s.fsLabelTxt}>{item.label.toUpperCase()}</Text>
        <Text style={s.fsClose}>Press BACK to close</Text>
      </View>
    </View>
  );
}

export default function EtihadPlazaScreen({
  onBack,
  isActive = false,
}: EtihadPlazaScreenProps) {
  const [section, setSection] = useState<Section>('hero');
  const [_navIdx, setNavIdx] = useState(0);
  const [heroBtnIdx, setHeroBtnIdx] = useState(0);
  const [hlIdx, setHlIdx] = useState(0);
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [roomIdx, setRoomIdx] = useState(0);
  const [fullScreen, setFullScreen] = useState<EtihadPlazaGalleryItem | null>(
    null,
  );
  const [activeRoom, setActiveRoom] = useState(0);

  const [home, setHome] = useState<EtihadPlazaHome | null>(null);
  const [loadState, setLoadState] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [reloadToken, setReloadToken] = useState(0);

  const hero = home?.hero;
  const highlights = useMemo(() => home?.highlights ?? [], [home?.highlights]);
  const gallery = useMemo(() => home?.gallery ?? [], [home?.gallery]);
  const rooms = useMemo(() => home?.rooms ?? [], [home?.rooms]);
  const stats = useMemo(() => home?.stats ?? [], [home?.stats]);
  const navLabels = useMemo(
    () => home?.navItems.filter(n => n.enabled).map(n => n.label) ?? [],
    [home?.navItems],
  );

  const galleryRef = useRef(gallery);
  const listsRef = useRef({
    hl: highlights.length,
    gal: gallery.length,
    rm: rooms.length,
    nav: navLabels.length,
  });
  useEffect(() => {
    galleryRef.current = gallery;
  }, [gallery]);
  useEffect(() => {
    listsRef.current = {
      hl: highlights.length,
      gal: gallery.length,
      rm: rooms.length,
      nav: navLabels.length,
    };
  }, [highlights.length, gallery.length, rooms.length, navLabels.length]);

  const sRef = useRef<Section>('hero');
  const navRef = useRef(0);
  const hbRef = useRef(0);
  const hlRef = useRef(0);
  const galRef = useRef(0);
  const rmRef = useRef(0);
  const fsRef = useRef<EtihadPlazaGalleryItem | null>(null);
  const onBkRef = useRef(onBack);
  useEffect(() => {
    onBkRef.current = onBack;
  }, [onBack]);

  const setSec = useCallback((v: Section) => {
    sRef.current = v;
    setSection(v);
  }, []);
  const setNav = useCallback((v: number) => {
    navRef.current = v;
    setNavIdx(v);
  }, []);
  const setHB = useCallback((v: number) => {
    hbRef.current = v;
    setHeroBtnIdx(v);
  }, []);
  const setHL = useCallback((v: number) => {
    hlRef.current = v;
    setHlIdx(v);
  }, []);
  const setGal = useCallback((v: number) => {
    galRef.current = v;
    setGalleryIdx(v);
  }, []);
  const setRm = useCallback((v: number) => {
    rmRef.current = v;
    setRoomIdx(v);
  }, []);
  const setFS = useCallback((v: EtihadPlazaGalleryItem | null) => {
    fsRef.current = v;
    setFullScreen(v);
  }, []);

  useEffect(() => {
    if (!isActive) {
      return;
    }
    let cancelled = false;
    setLoadState('loading');
    setErrorMsg('');
    (async () => {
      const res = await fetchEtihadPlazaHome();
      if (cancelled) {
        return;
      }
      if (!res.ok) {
        setHome(null);
        setErrorMsg(res.message);
        setLoadState('error');
        return;
      }
      setHome(res.home);
      setLoadState('ready');
    })();
    return () => {
      cancelled = true;
    };
  }, [isActive, reloadToken]);

  const mainRef = useRef<ScrollView>(null);
  const hlScrollRef = useRef<ScrollView>(null);
  const galScrollRef = useRef<ScrollView>(null);
  const rmScrollRef = useRef<ScrollView>(null);

  /* Scroll positions — tuned so section headers stay fully visible (no overscroll) */
  const NAV_H = 69;
  const HERO_H = SH * 0.8;
  const SECTION_HIGHLIGHTS = 400;
  const SECTION_GALLERY = 380;

  const HERO_Y = 0;
  const HL_Y = NAV_H + HERO_H + 2;
  const GALLERY_Y = HL_Y + SECTION_HIGHLIGHTS;
  const ROOMS_Y = GALLERY_Y + SECTION_GALLERY;

  useEffect(() => {
    const yMap: Record<Section, number> = {
      nav: 0,
      hero: HERO_Y,
      highlights: HL_Y,
      gallery: GALLERY_Y,
      rooms: ROOMS_Y,
    };
    mainRef.current?.scrollTo({y: Math.max(0, yMap[section]), animated: true});
  }, [section, HERO_Y, HL_Y, GALLERY_Y, ROOMS_Y]);

  useEffect(() => {
    hlScrollRef.current?.scrollTo({x: hlIdx * 260, animated: true});
  }, [hlIdx]);
  useEffect(() => {
    galScrollRef.current?.scrollTo({x: galleryIdx * 248, animated: true});
  }, [galleryIdx]);
  useEffect(() => {
    rmScrollRef.current?.scrollTo({x: roomIdx * 320, animated: true});
  }, [roomIdx]);

  useEffect(() => {
    if (isActive) {
      setSec('hero');
      setNav(0);
      setHB(0);
      setHL(0);
      setGal(0);
      setRm(0);
      setFS(null);
      mainRef.current?.scrollTo({y: 0, animated: false});
    }
  }, [isActive, setSec, setNav, setHB, setHL, setGal, setRm, setFS]);

  useEffect(() => {
    if (Platform.OS !== 'android' || !isActive) {
      return;
    }
    const sub = DeviceEventEmitter.addListener(
      'onKeyDown',
      (evt: {keyCode: number}) => {
        const kc = evt.keyCode;
        const sec = sRef.current;

        if (fsRef.current) {
          if (kc === 4) {
            setFS(null);
            return;
          }
          return;
        }

        if (kc === 4) {
          onBkRef.current?.();
          return;
        }

        if (kc === 19) {
          if (sec === 'nav') {
            setSec('hero');
          } else if (sec === 'hero') {
            setSec('nav');
          } else if (sec === 'highlights') {
            setSec('hero');
          } else if (sec === 'gallery') {
            setSec('highlights');
          } else if (sec === 'rooms') {
            setSec('gallery');
          }
        } else if (kc === 20) {
          if (sec === 'nav') {
            setSec('hero');
            setHB(0);
          } else if (sec === 'hero') {
            setSec('highlights');
          } else if (sec === 'highlights') {
            setSec('gallery');
          } else if (sec === 'gallery') {
            setSec('rooms');
          }
        } else if (kc === 21) {
          if (sec === 'nav') {
            setNav(Math.max(0, navRef.current - 1));
          } else if (sec === 'hero') {
            setHB(Math.max(0, hbRef.current - 1));
          } else if (sec === 'highlights') {
            setHL(Math.max(0, hlRef.current - 1));
          } else if (sec === 'gallery') {
            setGal(Math.max(0, galRef.current - 1));
          } else if (sec === 'rooms') {
            setRm(Math.max(0, rmRef.current - 1));
          }
        } else if (kc === 22) {
          const L = listsRef.current;
          if (sec === 'nav') {
            setNav(Math.min(maxIdx(L.nav), navRef.current + 1));
          } else if (sec === 'hero') {
            setHB(Math.min(1, hbRef.current + 1));
          } else if (sec === 'highlights') {
            setHL(Math.min(maxIdx(L.hl), hlRef.current + 1));
          } else if (sec === 'gallery') {
            setGal(Math.min(maxIdx(L.gal), galRef.current + 1));
          } else if (sec === 'rooms') {
            setRm(Math.min(maxIdx(L.rm), rmRef.current + 1));
          }
        } else if (kc === 23 || kc === 66) {
          if (sec === 'nav') {
            setSec('hero');
          } else if (sec === 'hero') {
            if (hbRef.current === 0) {
              setSec('highlights');
            } else {
              setSec('gallery');
            }
          } else if (sec === 'gallery') {
            const item = galleryRef.current[galRef.current];
            if (item) {
              setFS(item);
            }
          } else if (sec === 'rooms') {
            setActiveRoom(rmRef.current);
          }
        }
      },
    );
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- D-pad handler uses refs; only isActive should rebind
  }, [isActive]);

  const showFullLoader = isActive && home === null && loadState !== 'error';
  const showError = isActive && home === null && loadState === 'error';

  if (showError) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <View style={s.loadingOverlay}>
          <Text style={s.errorStateTitle}>Unable to load Etihad Plaza</Text>
          <Text style={s.errorStateBody}>{errorMsg || 'Unknown error'}</Text>
          <TouchableOpacity
            onPress={() => setReloadToken(t => t + 1)}
            activeOpacity={0.85}
            style={s.apiRetryBtn}>
            <Text style={s.apiRetryTxt}>RETRY</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (showFullLoader) {
    return (
      <View style={s.root}>
        <StatusBar barStyle="light-content" backgroundColor={C.bg} />
        <View style={s.loadingOverlay}>
          <ActivityIndicator size="large" color={C.gold} />
          <Text style={s.loadingHint}>Loading plaza…</Text>
        </View>
      </View>
    );
  }

  if (!home || !hero) {
    return <View style={s.root} />;
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <FullScreenView item={fullScreen} />

      <ScrollView
        ref={mainRef}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{paddingBottom: 60}}
        style={{flex: 1}}>
        {/* NAV */}
        <View style={[s.nav, section === 'nav' && s.navFocused]}>
          <View style={s.navBrand}>
            <Image
              source={require('../assets/images/ethiad-logo-marketing.png')}
              style={s.navLogo}
              resizeMode="contain"
            />
          </View>

          {/* <View style={s.navLinks}>
            {navLabels.map((item, i) => {
              const focused = section === 'nav' && _navIdx === i;
              return (
                <View key={item} style={[s.navItem, focused && s.navItemFocused]}>
                  <Text style={[s.navItemTxt, focused && s.navItemTxtFocused]}>{item}</Text>
                  {focused && <LinearGradient colors={[Colors.primary, Colors.primaryLight]} start={{x:0,y:0}} end={{x:1,y:0}} style={s.navUnderline} />}
                </View>
              );
            })}
          </View> */}

          <View style={s.navRight}>
            <Text style={s.navTime}>ABU DHABI</Text>
            <View style={s.navLiveDot}>
              <View style={s.liveDot} />
              <Text style={s.navLiveTxt}>LIVE</Text>
            </View>
          </View>
        </View>

        <GoldRule />

        {/* HERO */}
        <View style={s.hero}>
          <View style={s.heroContent}>
            <View style={s.heroLeft}>
              <View style={s.heroPreviewCard}>
                <Image
                  source={{uri: hero.preview.image}}
                  style={s.heroPreviewImg}
                  resizeMode="cover"
                />
                <LinearGradient
                  colors={[
                    'transparent',
                    'transparent',
                    Colors.overlay.midnight[96],
                  ]}
                  locations={[0, 0.45, 1]}
                  style={StyleSheet.absoluteFill}
                />
                <View style={s.heroPreviewBody}>
                  <Text style={s.heroPreviewCat}>{hero.preview.category}</Text>
                  <Text style={s.heroPreviewTitle}>{hero.preview.title}</Text>
                  <View style={s.liveRow}>
                    <View style={s.liveDot} />
                    <Text style={s.heroPreviewSub}>
                      {hero.preview.statusLine}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={s.heroRight}>
              <Eyebrow>{hero.eyebrow}</Eyebrow>
              <Text style={s.heroTitle}>
                {hero.titleLines[0] ?? ''}
                {'\n'}
                <Text style={s.heroTitleGold}>{hero.titleGoldWord}</Text>
              </Text>
              <Text style={s.heroDesc}>{hero.description}</Text>

              <View style={s.heroBtns}>
                <TouchableOpacity
                  onPress={() => {
                    setHB(0);
                    setSec('highlights');
                  }}
                  activeOpacity={0.85}
                  focusable>
                  <LinearGradient
                    colors={
                      section === 'hero' && heroBtnIdx === 0
                        ? [C.goldLight, C.gold]
                        : [C.gold, C.goldLight]
                    }
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={[
                      s.btnGold,
                      section === 'hero' && heroBtnIdx === 0 && s.btnFocused,
                    ]}>
                    <Text style={s.btnGoldTxt}>{hero.cta.primaryLabel}</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setHB(1);
                    setSec('gallery');
                  }}
                  activeOpacity={1}
                  focusable
                  style={[
                    s.btnGhost,
                    section === 'hero' && heroBtnIdx === 1 && s.btnGhostFocused,
                  ]}>
                  <Text
                    style={[
                      s.btnGhostTxt,
                      section === 'hero' &&
                        heroBtnIdx === 1 &&
                        s.btnGhostTxtFocused,
                    ]}>
                    {hero.cta.secondaryLabel}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={s.statsBar}>
            {stats.map((stat, i) => (
              <View
                key={stat.id}
                style={[s.statItem, i < stats.length - 1 && s.statBorder]}>
                <Text style={s.statNum}>{stat.n}</Text>
                <Text style={s.statLabel}>{stat.l.toUpperCase()}</Text>
              </View>
            ))}
          </View>
        </View>

        <GoldRule />

        {/* HIGHLIGHTS */}
        <View style={[s.section, section === 'highlights' && s.sectionFocused]}>
          <View style={s.sectionHdr}>
            <Eyebrow>SIGNATURE EXPERIENCES</Eyebrow>
            <Text style={s.sectionTitle}>
              Discover <Text style={s.sectionGold}>Excellence</Text>
            </Text>
            <Text style={s.sectionHint}>
              LEFT / RIGHT to browse · OK to select
            </Text>
          </View>

          <ScrollView
            ref={hlScrollRef}
            horizontal
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.hlStrip}>
            {highlights.map((hl, i) => {
              const focused = section === 'highlights' && hlIdx === i;
              return (
                <View
                  key={hl.id}
                  style={[s.hlCard, focused && s.hlCardFocused]}>
                  <Image
                    source={{uri: hl.img}}
                    style={s.hlImg}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={[
                      'transparent',
                      'transparent',
                      Colors.overlay.midnight[96],
                    ]}
                    locations={[0, 0.25, 1]}
                    style={StyleSheet.absoluteFill}
                  />
                  {focused && (
                    <LinearGradient
                      colors={[
                        Colors.primary,
                        Colors.primaryLight,
                        Colors.primary,
                      ]}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 0}}
                      style={s.hlFocusLine}
                    />
                  )}
                  <View style={s.hlBody}>
                    <View style={s.hlTopRow}>
                      <Text style={s.hlCat}>{hl.category}</Text>
                      {hl.badge && <Text style={s.hlBadge}>{hl.badge}</Text>}
                    </View>
                    <Text style={[s.hlTitle, focused && s.hlTitleFocused]}>
                      {hl.title}
                    </Text>
                    <Text style={s.hlSub}>{hl.sub}</Text>
                    <View style={s.hlStatRow}>
                      <LinearGradient
                        colors={[Colors.primary, Colors.primaryLight]}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 0}}
                        style={s.hlStatLine}
                      />
                      <Text style={s.hlStat}>{hl.stat}</Text>
                    </View>
                  </View>
                  {focused && (
                    <View style={s.hlFocusPill}>
                      <Text style={s.hlFocusPillTxt}>● SELECTED</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>

          <View style={s.dots}>
            {highlights.map((_, i) => (
              <View key={i} style={[s.dot, i === hlIdx && s.dotActive]} />
            ))}
          </View>
        </View>

        <GoldRule />

        {/* GALLERY */}
        <View style={[s.section, section === 'gallery' && s.sectionFocused]}>
          <View style={s.sectionHdr}>
            <Eyebrow>PHOTO GALLERY</Eyebrow>
            <View style={s.sectionHdrRow}>
              <Text style={s.sectionTitle}>
                Captured in <Text style={s.sectionGold}>Light</Text>
              </Text>
              <Text style={s.sectionHint}>OK to open full-screen</Text>
            </View>
          </View>

          <ScrollView
            ref={galScrollRef}
            horizontal
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.galStrip}>
            {gallery.map((item, i) => {
              const focused = section === 'gallery' && galleryIdx === i;
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.9}
                  onPress={() => setFS(item)}
                  focusable
                  style={[s.galCard, focused && s.galCardFocused]}>
                  <Image
                    source={{uri: item.img}}
                    style={s.galImg}
                    resizeMode="cover"
                  />
                  <LinearGradient
                    colors={[
                      'transparent',
                      'transparent',
                      Colors.overlay.midnight[96],
                    ]}
                    locations={[0, 0.45, 1]}
                    style={StyleSheet.absoluteFill}
                  />
                  {focused && (
                    <View style={s.galFocusFrame}>
                      <LinearGradient
                        colors={[
                          Colors.primary,
                          Colors.primaryLight,
                          Colors.primary,
                        ]}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 0}}
                        style={s.galFocusTop}
                      />
                    </View>
                  )}
                  <View style={s.galLabel}>
                    <Text style={s.galLabelTxt}>
                      {item.label.toUpperCase()}
                    </Text>
                    {focused && (
                      <Text style={s.galOpenHint}>Press OK to open</Text>
                    )}
                  </View>
                  {focused && (
                    <View style={s.galZoomIcon}>
                      <Text style={{fontSize: 14, color: C.gold}}>⊕</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={s.dots}>
            {gallery.map((_, i) => (
              <View key={i} style={[s.dot, i === galleryIdx && s.dotActive]} />
            ))}
          </View>
        </View>

        <GoldRule />

        {/* ROOMS */}
        <View style={[s.section, section === 'rooms' && s.sectionFocused]}>
          <View style={s.sectionHdr}>
            <Eyebrow>ACCOMMODATION</Eyebrow>
            <View style={s.sectionHdrRow}>
              <Text style={s.sectionTitle}>
                Spaces for <Text style={s.sectionGold}>Living</Text>
              </Text>
              <Text style={s.sectionHint}>LEFT / RIGHT to browse</Text>
            </View>
          </View>

          <ScrollView
            ref={rmScrollRef}
            horizontal
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.rmStrip}>
            {rooms.map((room, i) => {
              const focused = section === 'rooms' && roomIdx === i;
              const selected = activeRoom === i;
              return (
                <View
                  key={room.id}
                  style={[
                    s.rmCard,
                    focused && s.rmCardFocused,
                    selected && s.rmCardSelected,
                  ]}>
                  {selected && (
                    <LinearGradient
                      colors={[Colors.overlay.gold[8], 'transparent']}
                      style={StyleSheet.absoluteFill}
                    />
                  )}
                  <View style={s.rmThumb}>
                    <Image
                      source={{uri: room.img}}
                      style={s.rmImg}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={[
                        'transparent',
                        'transparent',
                        Colors.overlay.midnight[96],
                      ]}
                      locations={[0, 0.45, 1]}
                      style={StyleSheet.absoluteFill}
                    />
                    <View style={s.rmViewBadge}>
                      <Text style={s.rmViewBadgeTxt}>
                        {room.view.toUpperCase()}
                      </Text>
                    </View>
                    {focused && (
                      <LinearGradient
                        colors={[
                          Colors.primary,
                          Colors.primaryLight,
                          Colors.primary,
                        ]}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 0}}
                        style={s.rmFocusLine}
                      />
                    )}
                  </View>
                  <View style={s.rmBody}>
                    <Text style={[s.rmName, focused && s.rmNameFocused]}>
                      {room.name}
                    </Text>
                    <Text style={s.rmSize}>{room.size.toUpperCase()}</Text>
                    <View style={s.rmDivider} />
                    <View style={s.rmFooter}>
                      <View>
                        <Text style={s.rmFromLabel}>FROM</Text>
                        <Text style={[s.rmPrice, focused && s.rmPriceFocused]}>
                          {room.price}
                        </Text>
                        <Text style={s.rmNight}>/night</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={s.dots}>
            {rooms.map((_, i) => (
              <View key={i} style={[s.dot, i === roomIdx && s.dotActive]} />
            ))}
          </View>
        </View>

        <View style={{height: SH * 0.1}} />
      </ScrollView>
    </View>
  );
}

const HL_CARD_W = SW * 0.19;
const GAL_CARD_W = SW * 0.19;
const RM_CARD_W = SW * 0.23;

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: C.bg},
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingHint: {
    fontFamily: FontFamily.book,
    fontSize: 12,
    color: C.muted,
    letterSpacing: 1.5,
  },
  errorStateTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    color: C.gold,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 24,
  },
  errorStateBody: {
    fontFamily: FontFamily.book,
    fontSize: 12,
    color: C.text,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 32,
  },
  apiRetryBtn: {
    borderWidth: 1,
    borderColor: C.gold,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  apiRetryTxt: {
    fontFamily: FontFamily.medium,
    fontSize: 9,
    letterSpacing: 2,
    color: C.gold,
  },
  goldRule: {height: 1},

  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 36,
    paddingVertical: 14,
    height: 68,
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  navFocused: {backgroundColor: C.bg},
  navBrand: {},
  navLogo: {width: 140, height: 45},
  brandSub: {
    fontFamily: FontFamily.book,
    fontSize: 8,
    letterSpacing: 3.5,
    color: C.goldLight,
    marginTop: 3,
  },
  navLinks: {flexDirection: 'row', gap: 28, alignItems: 'center'},
  navItem: {paddingVertical: 4, position: 'relative'},
  navItemFocused: {
    backgroundColor: C.focusBg,
    paddingHorizontal: 12,
    borderRadius: 2,
  },
  navItemTxt: {
    fontFamily: FontFamily.light,
    fontSize: 9.5,
    letterSpacing: 2.8,
    color: C.goldLight,
  },
  navItemTxtFocused: {fontFamily: FontFamily.book, color: C.gold},
  navUnderline: {
    position: 'absolute',
    bottom: -2,
    left: 0,
    right: 0,
    height: 1.5,
  },
  navRight: {alignItems: 'flex-end', gap: 6},
  navTime: {
    fontFamily: FontFamily.book,
    fontSize: 9,
    letterSpacing: 2.5,
    color: C.goldLight,
  },
  navLiveDot: {flexDirection: 'row', alignItems: 'center', gap: 6},
  liveDot: {width: 6, height: 6, borderRadius: 3, backgroundColor: C.green},
  navLiveTxt: {
    fontFamily: FontFamily.text,
    fontSize: 8,
    letterSpacing: 2,
    color: C.green,
  },

  hero: {
    height: SH * 0.8,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: C.bg,
  },
  heroBg: {...StyleSheet.absoluteFillObject},
  heroBackdrop: {
    position: 'absolute',
    top: 24,
    left: 28,
    right: 28,
    bottom: 60,
    borderRadius: 4,
    overflow: 'hidden',
  },
  heroBackdropGradient: {flex: 1},
  heroContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 52,
    paddingTop: 0,
    paddingBottom: 67,
    gap: 48,
  },
  heroLeft: {width: SW * 0.22, alignSelf: 'center'},
  heroPreviewCard: {
    height: 240,
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    position: 'relative',
  },
  heroPreviewImg: {width: '100%', height: '100%'},
  heroPreviewBody: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
  },
  heroPreviewCat: {
    fontFamily: FontFamily.text,
    fontSize: 8,
    letterSpacing: 2.5,
    color: C.gold,
    marginBottom: 6,
  },
  heroPreviewTitle: {
    fontFamily: FontFamily.light,
    fontSize: 18,
    color: C.text,
    marginBottom: 5,
  },
  liveRow: {flexDirection: 'row', alignItems: 'center', gap: 7},
  heroPreviewSub: {
    fontFamily: FontFamily.book,
    fontSize: 9,
    color: C.goldLight,
    letterSpacing: 0.3,
  },

  heroRight: {flex: 1, maxWidth: '70%'},
  heroTitle: {
    fontFamily: FontFamily.light,
    fontSize: 52,
    color: C.text,
    lineHeight: 60,
    marginBottom: 16,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 6,
  },
  heroTitleGold: {
    color: C.goldLight,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: {width: 0, height: 2},
    textShadowRadius: 6,
  },
  heroDesc: {
    fontFamily: FontFamily.book,
    fontSize: 14,
    lineHeight: 22,
    color: C.goldLight,
    marginBottom: 32,
    textShadowColor: 'rgba(0,0,0,0.95)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 5,
  },
  heroBtns: {flexDirection: 'row', gap: 14},
  btnGold: {paddingHorizontal: 28, paddingVertical: 13},
  btnFocused: {
    elevation: 8,
    transform: [{scale: 1.02}],
  },
  btnGoldTxt: {
    fontFamily: FontFamily.medium,
    fontSize: 9.5,
    letterSpacing: 2.5,
    color: Colors.button.primaryText,
  },
  btnGhost: {
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: 'transparent',
  },
  btnGhostFocused: {
    borderColor: C.goldLight,
    borderWidth: 2,
    backgroundColor: 'transparent',
    transform: [{scale: 1.02}],
  },
  btnGhostTxt: {
    fontFamily: FontFamily.medium,
    fontSize: 9.5,
    letterSpacing: 2.5,
    color: C.goldLight,
  },
  btnGhostTxtFocused: {color: C.goldLight},

  statsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  statItem: {flex: 1, paddingVertical: 18, alignItems: 'center'},
  statBorder: {borderRightWidth: 1, borderRightColor: C.sep},
  statNum: {
    fontFamily: FontFamily.light,
    fontSize: 26,
    color: C.gold,
    lineHeight: 30,
    marginBottom: 5,
  },
  statLabel: {
    fontFamily: FontFamily.book,
    fontSize: 8,
    letterSpacing: 2,
    color: C.goldLight,
  },

  section: {
    paddingHorizontal: 44,
    paddingVertical: 36,
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.overlay.gold[8],
  },
  sectionFocused: {backgroundColor: C.bg, borderBottomColor: C.border},
  sectionHdr: {marginBottom: 24},
  sectionHdrRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: FontFamily.light,
    fontSize: 26,
    color: C.text,
    letterSpacing: 0.4,
  },
  sectionGold: {color: C.goldLight},
  sectionHint: {
    fontFamily: FontFamily.book,
    fontSize: 8.5,
    letterSpacing: 2,
    color: C.goldLight,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  eyebrowLine: {width: 24, height: 1, backgroundColor: C.gold, opacity: 0.8},
  eyebrowTxt: {
    fontFamily: FontFamily.text,
    fontSize: 8,
    letterSpacing: 3.5,
    color: C.text,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },

  hlStrip: {paddingRight: 16, gap: 12},
  hlCard: {
    width: HL_CARD_W,
    height: 240,
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    position: 'relative',
  },
  hlCardFocused: {borderColor: C.goldLight, borderWidth: 2, elevation: 8},
  hlImg: {...StyleSheet.absoluteFillObject},
  hlFocusLine: {position: 'absolute', top: 0, left: 0, right: 0, height: 2.5},
  hlBody: {position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16},
  hlTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  hlCat: {
    fontFamily: FontFamily.text,
    fontSize: 7.5,
    letterSpacing: 2.5,
    color: C.goldLight,
  },
  hlBadge: {fontSize: 13},
  hlTitle: {
    fontFamily: FontFamily.light,
    fontSize: 17,
    color: C.text,
    marginBottom: 5,
  },
  hlTitleFocused: {fontFamily: FontFamily.book, color: C.text},
  hlSub: {
    fontFamily: FontFamily.book,
    fontSize: 10,
    lineHeight: 15,
    color: C.goldLight,
    marginBottom: 10,
  },
  hlStatRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  hlStatLine: {width: 20, height: 1},
  hlStat: {
    fontFamily: FontFamily.book,
    fontSize: 9,
    letterSpacing: 1.5,
    color: C.goldLight,
  },
  hlFocusPill: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: Colors.overlay.gold[18],
    borderWidth: 1,
    borderColor: C.gold,
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  hlFocusPillTxt: {
    fontFamily: FontFamily.medium,
    fontSize: 7,
    letterSpacing: 1.5,
    color: C.gold,
  },

  galStrip: {paddingRight: 16, gap: 12},
  galCard: {
    width: GAL_CARD_W,
    height: 200,
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    position: 'relative',
  },
  galCardFocused: {borderColor: C.goldLight, borderWidth: 2, elevation: 8},
  galImg: {...StyleSheet.absoluteFillObject},
  galFocusFrame: {...StyleSheet.absoluteFillObject},
  galFocusTop: {position: 'absolute', top: 0, left: 0, right: 0, height: 2.5},
  galLabel: {position: 'absolute', bottom: 0, left: 0, right: 0, padding: 14},
  galLabelTxt: {
    fontFamily: FontFamily.book,
    fontSize: 9,
    letterSpacing: 2,
    color: C.text,
    marginBottom: 4,
  },
  galOpenHint: {
    fontFamily: FontFamily.book,
    fontSize: 8,
    letterSpacing: 1.5,
    color: C.gold,
  },
  galZoomIcon: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.gold,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  rmStrip: {paddingRight: 16, gap: 16},
  rmCard: {
    width: RM_CARD_W,
    backgroundColor: C.surface,
    borderRadius: 3,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    position: 'relative',
  },
  rmCardFocused: {borderColor: C.goldLight, borderWidth: 2, elevation: 8},
  rmCardSelected: {borderColor: C.gold},
  rmThumb: {height: 180, position: 'relative', overflow: 'hidden'},
  rmImg: {width: '100%', height: '100%'},
  rmFocusLine: {position: 'absolute', top: 0, left: 0, right: 0, height: 2.5},
  rmViewBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 1,
  },
  rmViewBadgeTxt: {
    fontFamily: FontFamily.book,
    fontSize: 7.5,
    letterSpacing: 2,
    color: C.goldLight,
  },
  rmBody: {padding: 18},
  rmName: {
    fontFamily: FontFamily.book,
    fontSize: 18,
    color: C.text,
    marginBottom: 5,
  },
  rmNameFocused: {color: C.text},
  rmSize: {
    fontFamily: FontFamily.book,
    fontSize: 8,
    letterSpacing: 2,
    color: C.goldLight,
    marginBottom: 12,
  },
  rmDivider: {height: 1, backgroundColor: C.sep, marginBottom: 12},
  rmFooter: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  rmFromLabel: {
    fontFamily: FontFamily.book,
    fontSize: 7.5,
    letterSpacing: 1.5,
    color: C.goldLight,
    marginBottom: 3,
  },
  rmPrice: {fontFamily: FontFamily.medium, fontSize: 17, color: C.gold},
  rmPriceFocused: {color: C.goldLight},
  rmNight: {fontFamily: FontFamily.book, fontSize: 9, color: C.goldLight},
  dots: {flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 18},
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.overlay.gold[30],
  },
  dotActive: {width: 20, backgroundColor: C.gold},

  fsOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    backgroundColor: C.bg,
  },
  fsImg: {width: '100%', height: '100%'},
  fsLabel: {
    position: 'absolute',
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 10,
  },
  fsLabelTxt: {
    fontFamily: FontFamily.light,
    fontSize: 18,
    letterSpacing: 4,
    color: C.text,
  },
  fsClose: {
    fontFamily: FontFamily.book,
    fontSize: 10,
    letterSpacing: 2.5,
    color: C.goldLight,
  },
});
