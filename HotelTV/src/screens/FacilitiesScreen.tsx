/**
 * Etihad Facilities — React Native TV App
 * Full remote navigation: UP/DOWN/LEFT/RIGHT moves focus, OK selects, BACK exits.
 */

import React, {useState, useEffect, useRef, useCallback} from 'react';
import {
  ActivityIndicator,
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
} from 'react-native';
import {FontFamily} from '../theme/typography';
import {Colors} from '../theme/colors';
import LinearGradient from 'react-native-linear-gradient';
import {BackButton} from '../components/common';
import {getClockStr, getDateStr} from '../utils/dateTime';
import {
  fetchGuestFacilities,
  mapFacilityDto,
  type FacilityRow,
} from '../services/facilitiesApi';

/* ─── DIMENSIONS ─────────────────────────────────────────── */
const {width: SW, height: SH} = Dimensions.get('window');

// Design: header ~12%, bottom ~7%, main content fills the rest
const TOPBAR_H = 80;
const BOTTOM_H = 50;
const H_PAD = 36;
const CONTENT_H = SH - TOPBAR_H - BOTTOM_H;

const DETAIL_W = Math.round(SW * 0.28);
const GRID_DETAIL_GAP = 8;
const CELL_GAP = 20;
const GRID_INSET_H = 50; // horizontal padding (smaller = less gap to detail panel)
const GRID_INSET_V = 16; // vertical padding → keep card height
const GRID_W = SW - H_PAD - DETAIL_W - GRID_DETAIL_GAP - H_PAD;
const CELL_W = Math.round((GRID_W - GRID_INSET_H * 2 - CELL_GAP) / 2);
const MAIN_PAD_V = 24;
const CELL_H = Math.round(
  (CONTENT_H - MAIN_PAD_V * 2 - GRID_INSET_V * 2 - CELL_GAP) / 2,
);

const BADGE_STRIP_H = 44;
const BADGE_STRIP_W = 200;
const BADGE_LEFT_OFFSET = 0;

/* ─── THEME (Etihad brand colours — primary ~50%, secondary ~30%) ─────────── */
const C = {
  bg: Colors.background.dark,
  gold: Colors.primary,
  gold2: Colors.primaryLight,
  text: Colors.text.light,
  muted: Colors.text.muted,
  sep: Colors.overlay.white[7],
};

type Facility = FacilityRow;

/* ─── Grid nav: cells [0][1] / [2][3], [4] = back (D-pad) ──────────── */
const GRID_NAV_FULL: Record<string, Record<number, number>> = {
  right: {0: 1, 2: 3},
  left: {1: 0, 3: 2},
  down: {0: 2, 1: 3, 2: 4, 3: 4},
  up: {2: 0, 3: 1, 4: 2},
};

/** D-pad map when fewer than 4 facilities (cells 0..n-1 only, 4 = back). */
function buildGridNav(n: number): Record<string, Record<number, number>> {
  if (n >= 4) {
    return GRID_NAV_FULL;
  }
  if (n === 3) {
    return {
      right: {0: 1},
      left: {1: 0},
      down: {0: 2, 1: 4, 2: 4},
      up: {2: 0, 4: 2},
    };
  }
  if (n === 2) {
    return {
      right: {0: 1},
      left: {1: 0},
      down: {0: 4, 1: 4},
      up: {4: 0},
    };
  }
  if (n === 1) {
    return {
      down: {0: 4},
      up: {4: 0},
      left: {0: 0, 4: 4},
      right: {0: 0, 4: 4},
    };
  }
  return {};
}

function gridMove(dir: string, cur: number, n: number): number {
  if (n <= 0) {
    return cur;
  }
  const nav = buildGridNav(n);
  return nav[dir]?.[cur] ?? cur;
}

/* ─── Props ──────────────────────────────────────────────── */
export interface FacilitiesScreenProps {
  guestName?: string;
  date?: string;
  time?: string;
  temperature?: number;
  weatherCondition?: string;
  backgroundImageSource?: ImageSourcePropType | null;
  onBack: () => void;
  isActive?: boolean;
}

/* ─── GRID CARD ──────────────────────────────────────────── */
const GridCard = React.memo(function GridCard({
  item,
  focused,
  onPress,
}: {
  item: Facility;
  focused: boolean;
  onPress: (item: Facility) => void;
}) {
  const press = useCallback(() => onPress(item), [item, onPress]);

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={press}
      style={{width: CELL_W, height: CELL_H}}>
      <View style={[st.card, focused && st.cardFocused]}>
        <Image
          source={{uri: item.img}}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', Colors.overlay.black[75]]}
          style={st.cardGrad}>
          <Text style={[st.cardLabel, focused && st.cardLabelFocused]}>
            {item.label}
          </Text>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
});

/* ─── DETAIL PANEL ───────────────────────────────────────── */
const DetailPanel = React.memo(function DetailPanel({
  facility,
}: {
  facility: Facility;
}) {
  const imgH = Math.round(CONTENT_H * 0.32);

  return (
    <View style={st.detail}>
      <View style={[st.detailImg, {height: imgH}]}>
        <Image
          source={{uri: facility.img}}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      </View>
      <View style={st.detailInfo}>
        <Text style={st.dName} numberOfLines={2}>
          {facility.name}
        </Text>
        <Text style={st.dDesc} numberOfLines={6}>
          {facility.desc}
        </Text>
        {!!facility.phone && (
          <Text style={st.dPhone}>
            <Text style={st.dPhoneBold}>Phone: </Text>
            {facility.phone}
          </Text>
        )}
        <Text style={st.dHoursTitle}>Hours:</Text>
        {facility.hours.map(([day, time], i) => (
          <View
            key={day}
            style={[st.dHourRow, i < facility.hours.length - 1 && st.dHourSep]}>
            <Text style={st.dHourDay}>{day}</Text>
            <Text style={st.dHourTime}>{time}</Text>
          </View>
        ))}
      </View>
    </View>
  );
});

/* ─── MAIN SCREEN ────────────────────────────────────────── */
const BACK_FOCUS = 4;

export default function FacilitiesScreen({
  guestName = 'Nancy',
  temperature = 23,
  weatherCondition = 'SUNNY',
  onBack,
  isActive = false,
}: FacilitiesScreenProps) {
  const [loadState, setLoadState] = useState<
    'idle' | 'loading' | 'ready' | 'error'
  >('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [reloadToken, setReloadToken] = useState(0);
  const [facilities, setFacilities] = useState<Facility[]>([]);

  const [focusIdx, setFocusIdx] = useState(0);
  const [selected, setSelected] = useState<Facility | null>(null);
  const [clock, setClock] = useState(getClockStr());
  const [date, setDate] = useState(getDateStr());

  const focusIdxRef = useRef(0);
  const onBackRef = useRef(onBack);
  const facilitiesRef = useRef(facilities);
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);
  useEffect(() => {
    focusIdxRef.current = focusIdx;
  }, [focusIdx]);
  useEffect(() => {
    facilitiesRef.current = facilities;
  }, [facilities]);

  // TV performance: Update clock every 60s to reduce re-renders; D-pad needs CPU headroom
  useEffect(() => {
    const t = setInterval(() => {
      setClock(getClockStr());
      setDate(getDateStr());
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!isActive) {
      return;
    }
    let cancelled = false;
    setLoadState('loading');
    setErrorMsg('');
    (async () => {
      const res = await fetchGuestFacilities();
      if (cancelled) {
        return;
      }
      if (!res.ok) {
        setFacilities([]);
        setSelected(null);
        setErrorMsg(res.message);
        setLoadState('error');
        setFocusIdx(BACK_FOCUS);
        focusIdxRef.current = BACK_FOCUS;
        return;
      }
      const mapped = res.facilities.map(mapFacilityDto);
      setFacilities(mapped);
      setLoadState('ready');
    })();
    return () => {
      cancelled = true;
    };
  }, [isActive, reloadToken]);

  useEffect(() => {
    if (!isActive || loadState !== 'ready') {
      return;
    }
    if (facilities.length === 0) {
      setFocusIdx(BACK_FOCUS);
      focusIdxRef.current = BACK_FOCUS;
      setSelected(null);
      return;
    }
    const n = Math.min(4, facilities.length);
    const idx = Math.min(3, n - 1);
    focusIdxRef.current = idx;
    setFocusIdx(idx);
    setSelected(facilities[idx]!);
  }, [isActive, loadState, facilities]);

  const moveFocus = useCallback((dir: string) => {
    const n = Math.min(4, facilitiesRef.current.length);
    if (n <= 0) {
      return;
    }
    const next = gridMove(dir, focusIdxRef.current, n);
    if (next === focusIdxRef.current) {
      return;
    }
    focusIdxRef.current = next;
    setFocusIdx(next);
    if (next < 4) {
      setSelected(facilitiesRef.current[next]!);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android' || !isActive) {
      return;
    }
    const sub = DeviceEventEmitter.addListener(
      'onKeyDown',
      (evt: {keyCode: number}) => {
        const kc = evt.keyCode;
        if (kc === 4) {
          onBackRef.current?.();
        } else if (kc === 19) {
          moveFocus('up');
        } else if (kc === 20) {
          moveFocus('down');
        } else if (kc === 21) {
          moveFocus('left');
        } else if (kc === 22) {
          moveFocus('right');
        } else if (kc === 23 || kc === 66 || kc === 109) {
          if (focusIdxRef.current === BACK_FOCUS) {
            onBackRef.current?.();
          } else {
            const f = facilitiesRef.current[focusIdxRef.current];
            if (f) {
              setSelected(f);
            }
          }
        }
      },
    );
    return () => sub.remove();
  }, [isActive, moveFocus]);

  const padded: (Facility | null)[] = [...facilities.slice(0, 4)];
  while (padded.length < 4) {
    padded.push(null);
  }
  const [tl, tr, bl, br] = padded;

  const mainBody = () => {
    if (loadState === 'loading' || loadState === 'idle') {
      return (
        <View style={st.mainCenter}>
          <ActivityIndicator size="large" color={C.gold} />
          <Text style={st.mainHint}>Loading facilities…</Text>
        </View>
      );
    }
    if (loadState === 'error') {
      return (
        <View style={st.mainCenter}>
          <Text style={st.mainErrorTitle}>Could not load facilities</Text>
          <Text style={st.mainErrorBody}>{errorMsg}</Text>
          <TouchableOpacity
            onPress={() => setReloadToken(t => t + 1)}
            style={st.retryBtn}
            focusable>
            <Text style={st.retryBtnTxt}>TRY AGAIN</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (facilities.length === 0) {
      return (
        <View style={st.mainCenter}>
          <Text style={st.mainHint}>No facilities available.</Text>
        </View>
      );
    }
    return (
      <>
        <View style={[st.gridArea, {width: GRID_W}]}>
          <View style={st.badgeWrap} pointerEvents="none">
            <LinearGradient
              colors={[Colors.primary, Colors.gold[600]]}
              start={{x: 0, y: 0}}
              end={{x: 0, y: 1}}
              style={st.badge}>
              <Text style={st.badgeText}>ETIHAD FACILITIES</Text>
            </LinearGradient>
          </View>

          <View style={st.gridRows}>
            <View style={st.gridRow}>
              {tl ? (
                <GridCard
                  item={tl}
                  focused={focusIdx === 0}
                  onPress={() => {
                    focusIdxRef.current = 0;
                    setFocusIdx(0);
                    setSelected(tl);
                  }}
                />
              ) : (
                <View style={{width: CELL_W, height: CELL_H}} />
              )}
              <View style={{width: CELL_GAP}} />
              {tr ? (
                <GridCard
                  item={tr}
                  focused={focusIdx === 1}
                  onPress={() => {
                    focusIdxRef.current = 1;
                    setFocusIdx(1);
                    setSelected(tr);
                  }}
                />
              ) : (
                <View style={{width: CELL_W, height: CELL_H}} />
              )}
            </View>
            <View style={{height: CELL_GAP}} />
            <View style={st.gridRow}>
              {bl ? (
                <GridCard
                  item={bl}
                  focused={focusIdx === 2}
                  onPress={() => {
                    focusIdxRef.current = 2;
                    setFocusIdx(2);
                    setSelected(bl);
                  }}
                />
              ) : (
                <View style={{width: CELL_W, height: CELL_H}} />
              )}
              <View style={{width: CELL_GAP}} />
              {br ? (
                <GridCard
                  item={br}
                  focused={focusIdx === 3}
                  onPress={() => {
                    focusIdxRef.current = 3;
                    setFocusIdx(3);
                    setSelected(br);
                  }}
                />
              ) : (
                <View style={{width: CELL_W, height: CELL_H}} />
              )}
            </View>
          </View>
        </View>

        <View style={{width: GRID_DETAIL_GAP}} />

        {selected ? (
          <DetailPanel facility={selected} />
        ) : (
          <View style={[st.detail, st.detailEmpty]}>
            <Text style={st.dDesc}>Select a facility</Text>
          </View>
        )}
      </>
    );
  };

  return (
    <View style={st.root}>
      <StatusBar hidden />

      {/* ── TOPBAR ── */}
      <View style={st.topbar}>
        {/* LEFT: weather + clock */}
        <View style={st.headerLeft}>
          <View style={st.weatherBlock}>
            <View style={st.weatherTextBlock}>
              <View style={st.tempRow}>
                <Text style={st.temp}>{temperature}</Text>
                <Text style={st.tempUnit}>°C</Text>
              </View>
              <Text style={st.sunLabel}>{weatherCondition}</Text>
            </View>
            <Text style={st.sunIcon}>⛅</Text>
          </View>
          <View style={st.clockBlock}>
            <Text style={st.clockTime}>{clock}</Text>
            <Text style={st.clockDate}>{date}</Text>
          </View>
        </View>

        {/* CENTER: logo */}
        <View style={st.logoOuter}>
          <Image
            source={require('../assets/images/ethiad-logo-marketing.png')}
            style={st.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* RIGHT: welcome — both lines left-aligned with each other */}
        <View style={st.welcomeBlock}>
          <View style={st.welcomeTextWrap}>
            <Text style={st.welcomeL1}>
              {'Welcome, '}
              <Text style={st.welcomeName}>{guestName},</Text>
            </Text>
            <Text style={st.welcomeL2}>to your home away from home</Text>
          </View>
        </View>
      </View>

      <View style={st.headerSep} />

      <View style={st.main}>{mainBody()}</View>

      <View style={st.bottombar}>
        <BackButton
          onPress={onBack}
          focused={focusIdx === BACK_FOCUS}
          size="sm"
        />
      </View>
    </View>
  );
}

/* ─── STYLES ─────────────────────────────────────────────── */
const st = StyleSheet.create({
  root: {flex: 1, backgroundColor: C.bg},

  /* TOPBAR */
  topbar: {
    height: TOPBAR_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    paddingVertical: 12,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    width: SW * 0.28,
  },

  weatherBlock: {flexDirection: 'row', alignItems: 'center', gap: 8},
  weatherTextBlock: {flexDirection: 'column', alignItems: 'flex-start'},
  tempRow: {flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2},
  temp: {
    fontFamily: FontFamily.bold,
    fontSize: 21,
    color: C.text,
    lineHeight: 24,
  },
  tempUnit: {
    fontFamily: FontFamily.book,
    fontSize: 12,
    color: C.gold,
    marginTop: 1,
    marginLeft: 1,
  },
  sunLabel: {
    fontFamily: FontFamily.light,
    fontSize: 7,
    letterSpacing: 1.2,
    color: C.text,
    textTransform: 'uppercase',
  },
  sunIcon: {fontSize: 34, lineHeight: 34},

  clockBlock: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    marginLeft: 14,
  },
  clockTime: {
    fontFamily: FontFamily.light,
    fontSize: 21,
    color: C.gold,
    letterSpacing: 1,
    lineHeight: 24,
    marginBottom: 1,
  },
  clockDate: {
    fontFamily: FontFamily.light,
    fontSize: 7,
    color: C.text,
    letterSpacing: 0.5,
    textAlign: 'center',
  },

  logoOuter: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  logoImage: {width: 140, height: 45},

  welcomeBlock: {
    width: SW * 0.28,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  welcomeTextWrap: {alignItems: 'flex-start'},
  welcomeL1: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: C.gold,
    lineHeight: 19,
    textAlign: 'left',
  },
  welcomeName: {fontFamily: FontFamily.medium, color: C.gold},
  welcomeL2: {
    fontFamily: FontFamily.book,
    fontSize: 11,
    color: C.text,
    marginTop: 2,
    textAlign: 'left',
  },

  headerSep: {height: 1, backgroundColor: C.sep},

  mainCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  mainHint: {
    fontFamily: FontFamily.book,
    fontSize: 12,
    color: C.muted,
    textAlign: 'center',
  },
  mainErrorTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: C.gold,
    marginBottom: 8,
    textAlign: 'center',
  },
  mainErrorBody: {
    fontFamily: FontFamily.book,
    fontSize: 12,
    color: C.text,
    textAlign: 'center',
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.gold,
    borderRadius: 4,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  retryBtnTxt: {
    fontFamily: FontFamily.medium,
    color: C.gold,
    fontSize: 11,
    letterSpacing: 2,
  },

  /* MAIN */
  main: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: H_PAD,
    paddingVertical: MAIN_PAD_V,
  },
  detailEmpty: {justifyContent: 'center'},

  /* GRID AREA */
  gridArea: {
    flex: 0,
    position: 'relative',
    paddingHorizontal: GRID_INSET_H,
    paddingVertical: GRID_INSET_V,
  },

  badgeWrap: {
    position: 'absolute',
    left: BADGE_LEFT_OFFSET,
    top: '50%',
    marginTop: -(BADGE_STRIP_W / 2),
    width: BADGE_STRIP_H,
    height: BADGE_STRIP_W,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  badge: {
    width: BADGE_STRIP_W,
    height: BADGE_STRIP_H,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{rotate: '-90deg'}],
    shadowColor: C.gold,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: {width: 0, height: 2},
    elevation: 8,
  },
  badgeText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 3,
    color: Colors.text.dark,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  gridRows: {flex: 1, flexDirection: 'column', marginLeft: 18},
  gridRow: {flexDirection: 'row', height: CELL_H},

  /* GRID CARD */
  card: {
    flex: 1,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardFocused: {
    borderColor: C.gold2,
    shadowColor: C.gold,
    shadowOpacity: 0.6,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 0},
    elevation: 12,
  },
  cardGrad: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 24,
    paddingBottom: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  cardLabel: {
    fontFamily: FontFamily.book,
    fontSize: 11,
    color: C.text,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  cardLabelFocused: {fontFamily: FontFamily.medium, color: C.gold2},

  /* DETAIL PANEL */
  detail: {width: DETAIL_W, flexDirection: 'column'},
  detailImg: {
    width: '100%',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  detailInfo: {flex: 1, minHeight: 0, alignItems: 'stretch'},

  dName: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: C.text,
    lineHeight: 18,
    marginBottom: 4,
    letterSpacing: 0.2,
    textAlign: 'left',
  },
  dDesc: {
    fontFamily: FontFamily.book,
    fontSize: 10,
    lineHeight: 14,
    color: C.muted,
    marginBottom: 4,
    textAlign: 'left',
  },
  dPhone: {
    fontFamily: FontFamily.book,
    fontSize: 10,
    color: C.muted,
    marginBottom: 4,
    textAlign: 'left',
  },
  dPhoneBold: {fontFamily: FontFamily.medium, color: C.text},
  dHoursTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 9,
    color: C.text,
    marginBottom: 3,
    letterSpacing: 0.3,
    textAlign: 'left',
  },
  dHourRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 1,
    alignItems: 'center',
  },
  dHourSep: {borderBottomWidth: 1, borderBottomColor: Colors.overlay.white[5]},
  dHourDay: {
    fontFamily: FontFamily.book,
    fontSize: 8,
    color: C.text,
    textAlign: 'left',
  },
  dHourTime: {
    fontFamily: FontFamily.book,
    fontSize: 8,
    color: C.muted,
    textAlign: 'right',
  },

  /* BOTTOMBAR */
  bottombar: {
    height: BOTTOM_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    borderTopWidth: 1,
    borderTopColor: C.sep,
  },
});
