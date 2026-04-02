/**
 * Etihad Airways Plaza — Employee Welcome Screen (1280×720 TV)
 * Single component with all sub-components; pixel-perfect layout.
 * Typography: Etihad Altis (FontFamily) per brand guidelines.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  DeviceEventEmitter,
  Dimensions,
  Image,
  ImageBackground,
  ImageSourcePropType,
  Platform,
  StyleSheet,
  Text,
  TouchableHighlight,
  View,
} from 'react-native';
import { FontFamily } from '../theme/typography';
import { Colors } from '../theme/colors';

const { width: WINDOW_WIDTH, height: WINDOW_HEIGHT } = Dimensions.get('window');
const DESIGN_WIDTH = 1280;
const scale = WINDOW_WIDTH / DESIGN_WIDTH;
const s = (n: number) => Math.round(n * scale);

// ─── Types ─────────────────────────────────────────────────────────────────
export interface NavItemData {
  id: string;
  icon: 'health' | 'dining' | 'cart' | 'plaza' | 'facilities' | 'channel' | 'tv' | 'notifications';
  label: string; // use '\n' for line breaks
}

export interface WelcomeScreenProps {
  onNavItemPress?: (item: NavItemData, index: number) => void;
  onNotificationsPress?: () => void;
  notificationCount?: number;
  guestName?: string;
  /** From Welcome API `welcome_message` (e.g. "Welcome"). */
  welcomeMessage?: string;
  /** From Welcome API `signature_title` (optional line under subtitle). */
  signatureTitle?: string;
  /** Shown on bottom bar, e.g. "Room NO: 101" or "Room NO: —". */
  roomNavLabel?: string;
  temperature?: number;
  weatherCondition?: string;
  date?: string;
  time?: string;
  activeNavIndex?: number;
  navItems?: NavItemData[];
  /** When true, filters out the notifications nav item (for testing when notifications feature is disabled) */
  hideNotificationsNav?: boolean;
  backgroundImageSource?: ImageSourcePropType | null;
  isActive?: boolean;
}

// ─── Default nav items (order as per spec) ───────────────────────────────────
const DEFAULT_NAV_ITEMS: NavItemData[] = [
  { id: '1', icon: 'health', label: 'OCCUPATIONAL\nHEALTH & SAFETY' },
  { id: '2', icon: 'dining', label: 'DINING' },
  { id: '3', icon: 'cart', label: 'HYPERMARKET' },
  { id: '4', icon: 'plaza', label: 'EY PLAZA' },
  { id: '5', icon: 'facilities', label: 'ETIHAD\nFACILITIES' },
  { id: '6', icon: 'channel', label: 'ETIHAD\nCHANNEL' },
  { id: '7', icon: 'tv', label: 'TV CHANNEL' },
  { id: '8', icon: 'notifications', label: 'MESSAGES' },
];

// ─── Colors (Etihad brand — primary gold ~50%, secondary ~30%) ───────────────
const COLORS = {
  gold: Colors.primary,
  goldAlt: Colors.primaryLight,
  white: Colors.white,
  secondary: Colors.text.muted,
  topBarBg: Colors.midnightDune[500],
  topBarLabelStrip: Colors.midnightDune[700],
  overlay: Colors.overlay.black[45],
  navBg: Colors.background.dark,
  navDivider: Colors.overlay.white[35],
  activeNav: Colors.overlay.gold[75],
};

// ─── Sub-component: Dark overlay ─────────────────────────────────────────────
function DarkOverlay() {
  return (
    <View style={[StyleSheet.absoluteFill, styles.darkOverlay]} pointerEvents="none" />
  );
}

// ─── Sub-component: DateTime section (left zone) ─────────────────────────────
function DateTimeSection({ date, time }: { date: string; time: string }) {
  return (
    <View style={styles.dateTimeSection}>
      <Text style={styles.timeText}>{time}</Text>
      <Text style={styles.dateText}>{date}</Text>
    </View>
  );
}

// ─── Sub-component: Weather section (center zone) ───────────────────────────
function WeatherSection({
  temperature,
  weatherCondition,
}: {
  temperature: number;
  weatherCondition: string;
}) {
  return (
    <View style={styles.weatherSection}>
      <View style={styles.weatherRow}>
        <View style={styles.tempWrap}>
          <Text style={styles.tempText}>{temperature}</Text>
          <View style={styles.tempDegreeWrap}>
            <Text style={styles.tempDegreeSymbol}>{'\u00B0'}</Text>
            <Text style={styles.tempDegreeC}>C</Text>
          </View>
        </View>
        <View style={styles.weatherIconWrap}>
          <Text style={[styles.weatherCloud, { fontSize: s(32) }]}>{'\u2601\uFE0F'}</Text>
          <Text style={[styles.weatherSun, { fontSize: s(28) }]}>{'\u2600\uFE0F'}</Text>
        </View>
      </View>
      <Text style={styles.weatherCondition}>{weatherCondition}</Text>
    </View>
  );
}

// ─── Sub-component: Top bar ──────────────────────────────────────────────────
function TopBar({
  date,
  time,
  temperature,
  weatherCondition,
  onNotificationsPress,
  notificationCount = 0,
}: {
  date: string;
  time: string;
  temperature: number;
  weatherCondition: string;
  onNotificationsPress?: () => void;
  notificationCount?: number;
}) {
  return (
    <View style={styles.topBar}>
      {/* Dark top strip — labels aligned with content below */}
      <View style={styles.topBarLabelStrip}>
        <View style={styles.topBarLabelLeftWrap}>
          <Text style={styles.topBarLabelText}>DATE AND TIME</Text>
        </View>
        <View style={styles.topBarLabelCenterWrap}>
          <Text style={styles.topBarLabelText}>ACTUAL WEATHER</Text>
        </View>
        <View style={styles.topBarLabelRightWrap} />
      </View>
      {/* Main content row */}
      <View style={styles.topBarContent}>
        <View style={styles.topBarLeft}>
          <DateTimeSection date={date} time={time} />
        </View>
        <View style={styles.topBarCenter}>
          <WeatherSection temperature={temperature} weatherCondition={weatherCondition} />
        </View>
        <View style={styles.topBarRight}>
          {onNotificationsPress != null && (
            <TouchableHighlight
              onPress={onNotificationsPress}
              underlayColor={Colors.overlay.gold[15]}
              style={styles.notificationBellBtn}
              {...({ focusable: true } as any)}
            >
              <View style={styles.notificationBellWrap}>
                <Text style={styles.notificationBellIcon}>{'\u{1F514}'}</Text>
                {notificationCount > 0 && (
                  <View style={styles.notificationBellBadge}>
                    <Text style={styles.notificationBellBadgeText}>
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableHighlight>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Sub-component: Welcome text ────────────────────────────────────────────
function WelcomeText({
  guestName,
  welcomeMessage = 'Welcome',
  signatureTitle,
}: {
  guestName: string;
  welcomeMessage?: string;
  signatureTitle?: string;
}) {
  return (
    <View style={styles.welcomeWrap}>
      <Text style={styles.welcomeTitle}>
        Welcome, {guestName},
      </Text>
      <Text style={styles.welcomeSubtitle}>to your home away from home</Text>
      {signatureTitle ? (
        <Text style={styles.welcomeSignature}>{signatureTitle}</Text>
      ) : null}
    </View>
  );
}

// ─── Nav icon renderer (all fit in fixed 48×48 box via StyleSheet) ───────────
function NavIcon({ type }: { type: NavItemData['icon'] }) {
  const iconColor = COLORS.white;
  const stroke = 2;

  switch (type) {
    case 'health':
      return (
        <View style={styles.iconOuter}>
          <Image
            source={require('../assets/health-menu.png')}
            style={styles.iconHealthImage}
            resizeMode="contain"
          />
        </View>
      );
    case 'dining':
      return (
        <View style={styles.iconOuter}>
          <Image
            source={require('../assets/dining-menu.png')}
            style={styles.iconDiningImage}
            resizeMode="contain"
          />
        </View>
      );
    case 'cart':
      return (
        <View style={styles.iconOuter}>
          <Image
            source={require('../assets/hypermarket-menu.png')}
            style={styles.iconCartImage}
            resizeMode="contain"
          />
        </View>
      );
    case 'plaza':
      return (
        <View style={styles.iconOuter}>
          <Image
            source={require('../assets/ey-plaza-menu.png')}
            style={styles.iconPlazaImage}
            resizeMode="contain"
          />
        </View>
      );
    case 'facilities':
      return (
        <View style={styles.iconOuter}>
          <Image
            source={require('../assets/facilities-menu-icon.png')}
            style={styles.iconFacilitiesImage}
            resizeMode="contain"
          />
        </View>
      );
    case 'channel':
      return (
        <View style={styles.iconOuter}>
          <Image
            source={require('../assets/ethiad-channel-menu.png')}
            style={styles.iconChannelImage}
            resizeMode="contain"
          />
        </View>
      );
    case 'tv':
      return (
        <View style={styles.iconOuter}>
          <Image
            source={require('../assets/tv-channels-menu.png')}
            style={styles.iconTvImage}
            resizeMode="contain"
          />
        </View>
      );
    case 'notifications':
      return (
        <View style={styles.iconOuter}>
          <Image
            source={require('../assets/message-menu.png')}
            style={styles.iconMessageImage}
            resizeMode="contain"
          />
        </View>
      );
    default:
      return null;
  }
}

// ─── Sub-component: Single nav item ─────────────────────────────────────────
function NavItem({
  item,
  index,
  totalItems,
  isActive,
  isFocused,
  isFirst,
  isLast,
  isPreferredFocus,
  messageCount,
  onPress,
  onFocus,
}: {
  item: NavItemData;
  index: number;
  totalItems: number;
  isActive: boolean;
  isFocused: boolean;
  isFirst: boolean;
  isLast: boolean;
  isPreferredFocus: boolean;
  messageCount: number;
  onPress: () => void;
  onFocus: () => void;
}) {
  return (
    <TouchableHighlight
      onPress={onPress}
      onFocus={onFocus}
      underlayColor={isActive ? Colors.primaryDark : Colors.overlay.gold[35]}
      focusable
      // hasTVPreferredFocus is an Android TV prop not yet in RN's TS types
      {...(isPreferredFocus ? ({ hasTVPreferredFocus: true } as any) : null)}
      
    >
      <View>
        <View  style={[
        styles.navItemTouch,
        isActive && styles.navItemActive,
        isFocused && styles.navItemFocused,
      ]}>
          <NavIcon type={item.icon} />
          {item.icon === 'notifications' && (
            <View style={styles.messagesCountBadge} pointerEvents="none">
              <Text style={styles.messagesCountBadgeText}>
                {messageCount > 99 ? '99+' : String(messageCount)}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.navItemLabelWrap}>
          <Text style={[styles.navItemLabel, isActive && styles.navItemLabelActive, {marginTop: s(20), textAlign: 'center'}]}>{item.label}</Text>
        </View>
      </View>
    </TouchableHighlight>
  );
}

// ─── Sub-component: Bottom nav bar ──────────────────────────────────────────
// Shows a sliding window of 7 items; scrolls when user navigates to next/prev.
const VISIBLE_NAV_COUNT = 7;

function BottomNavBar({
  items,
  activeIndex,
  focusedIndex,
  messageCount,
  roomNavLabel = 'Room NO: —',
  onSelectIndex,
  onFocusIndex,
  onNavItemPress,
}: {
  items: NavItemData[];
  activeIndex: number;
  focusedIndex: number;
  messageCount: number;
  roomNavLabel?: string;
  onSelectIndex: (index: number) => void;
  onFocusIndex: (index: number) => void;
  onNavItemPress?: (item: NavItemData, index: number) => void;
}) {
  const goPrev = () => onFocusIndex(Math.max(0, focusedIndex - 1));
  const goNext = () => onFocusIndex(Math.min(items.length - 1, focusedIndex + 1));

  // Sliding window: show only 7 items; when user moves, shift window to keep focused in view
  const visibleStart = Math.max(
    0,
    Math.min(focusedIndex - Math.floor(VISIBLE_NAV_COUNT / 2), items.length - VISIBLE_NAV_COUNT),
  );
  const visibleEnd = Math.min(visibleStart + VISIBLE_NAV_COUNT, items.length);
  const visibleItems = items.slice(visibleStart, visibleEnd);

  return (
    <View style={styles.bottomNavBar}>
      {/* Room number — top left */}
      <Text style={styles.roomNoText}>{roomNavLabel}</Text>
      {/* Gold line — below icons, above labels, spans full width */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: s(126),
          paddingVertical: s(4),
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            height: 2,
            backgroundColor: Colors.primary,
          }}
        />
      </View>
      {/* Left arrow — aligned with nav icon row */}
      <TouchableHighlight
        onPress={goPrev}
        underlayColor={Colors.overlay.gold[10]}
        style={styles.navArrow}
      >
        <View style={styles.navArrowIconBox}>
          <Text style={styles.navArrowIcon}>{'\u2039'}</Text>
        </View>
      </TouchableHighlight>
      <View style={styles.navRow}>
        {visibleItems.map((item, localIndex) => {
          const realIndex = visibleStart + localIndex;
          return (
            <NavItem
              key={item.id}
              item={item}
              index={realIndex}
              totalItems={items.length}
              isActive={realIndex === activeIndex}
              isFocused={realIndex === focusedIndex}
              isFirst={realIndex === 0}
              isLast={realIndex === items.length - 1}
              isPreferredFocus={realIndex === focusedIndex}
              messageCount={messageCount}
              onPress={() => {
                onSelectIndex(realIndex);
                onNavItemPress?.(item, realIndex);
              }}
              onFocus={() => onFocusIndex(realIndex)}
            />
          );
        })}
      </View>
      {/* Right arrow — aligned with nav icon row */}
      <TouchableHighlight
        onPress={goNext}
        underlayColor={Colors.overlay.gold[10]}
        style={styles.navArrow}
      >
        <View style={styles.navArrowIconBox}>
          <Text style={styles.navArrowIcon}>{'\u203A'}</Text>
        </View>
      </TouchableHighlight>
    </View>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
function formatDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatTime(d: Date): string {
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${mins}`;
}

export default function WelcomeScreen({
  guestName = 'Guest',
  welcomeMessage = 'Welcome',
  signatureTitle,
  roomNavLabel = 'Room NO: —',
  temperature = 23,
  weatherCondition = 'SUNNY',
  date: dateProp,
  time: timeProp,
  activeNavIndex = 3,
  navItems: navItemsProp = DEFAULT_NAV_ITEMS,
  hideNotificationsNav = false,
  backgroundImageSource = null,
  onNavItemPress,
  onNotificationsPress,
  notificationCount = 0,
  isActive = true,
}: WelcomeScreenProps) {
  const navItems = hideNotificationsNav
    ? navItemsProp.filter((item) => item.icon !== 'notifications')
    : navItemsProp;

  const [currentDate, setCurrentDate] = useState(() => formatDate(new Date()));
  const [currentTime, setCurrentTime] = useState(() => formatTime(new Date()));

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentDate(formatDate(now));
      setCurrentTime(formatTime(now));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Always use real-time date/time on home screen
  const date = currentDate;
  const time = currentTime;

  // Single atomic index — focus and selection are always the same value
  const [navIndex, setNavIndex] = React.useReducer(
    (_prev: number, next: number) => next,
    activeNavIndex,
  );
  const focusedNavIndex = navIndex;
  const selectedNavIndex = navIndex;

  // Refs so the key listener closure never goes stale
  const navIndexRef = useRef(navIndex);
  navIndexRef.current = navIndex;
  const navItemsRef = useRef(navItems);
  navItemsRef.current = navItems;
  const onNavItemPressRef = useRef(onNavItemPress);
  onNavItemPressRef.current = onNavItemPress;

  useEffect(() => {
    setNavIndex(activeNavIndex);
  }, [activeNavIndex]);

  // JS-driven remote navigation.
  // Key events ARE confirmed reaching JS (diagnostic log shows keyCode 21/22).
  // Native TV focus engine has no initial focused view so DPAD does nothing
  // natively — we drive everything from JS instead.
  useEffect(() => {
    if (Platform.OS !== 'android' || !isActive) return;
    const sub = DeviceEventEmitter.addListener(
      'onKeyDown',
      (evt: { keyCode: number }) => {
        const kc = evt.keyCode;
        const count = navItemsRef.current.length;
        if (kc === 4) {
          // BACK on welcome screen → exit the app
          BackHandler.exitApp();
        } else if (kc === 21) {
          // DPAD_LEFT
          setNavIndex(Math.max(0, navIndexRef.current - 1));
        } else if (kc === 22) {
          // DPAD_RIGHT
          setNavIndex(Math.min(count - 1, navIndexRef.current + 1));
        } else if (kc === 23 || kc === 66 || kc === 109) {
          // DPAD_CENTER (OK) or ENTER — fire the highlighted item's action
          const idx = navIndexRef.current;
          const item = navItemsRef.current[idx];
          if (item) onNavItemPressRef.current?.(item, idx);
        }
      },
    );
    return () => sub.remove();
  }, [isActive]);

  const content = (
    <>
      <DarkOverlay />
      <TopBar
        date={date}
        time={time}
        temperature={temperature}
        weatherCondition={weatherCondition}
        onNotificationsPress={onNotificationsPress}
        notificationCount={notificationCount}
      />
      {/* Logo — absolute, top of screen, always fully visible */}
      <View
        style={{
          position: 'absolute',
          top: s(20),
          right: s(6.5),
          width: s(340),
          height: s(200),
          zIndex: 10,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center', width: s(340), height: s(200) }}>
          <Image
            source={require('../assets/images/etihad-logo-white.png')}
            style={{ width: s(340), height: s(200) }}
            resizeMode="contain"
          />
          <View
            style={[
              StyleSheet.absoluteFillObject,
              { justifyContent: 'center', alignItems: 'center' },
            ]}
          >
            <Image
              source={require('../assets/images/etihad-text-white-logo.png')}
              style={{
                position: 'absolute',
                width: s(170),
                height: s(45),
                top: 48,
                right: 52,
                alignSelf: 'center',
                marginTop: -10,
              }}
              resizeMode="contain"
            />
          </View>
        </View>
      </View>
      <WelcomeText
        guestName={guestName}
        welcomeMessage={welcomeMessage}
        signatureTitle={signatureTitle}
      />
      <BottomNavBar
        items={navItems}
        activeIndex={selectedNavIndex}
        focusedIndex={focusedNavIndex}
        messageCount={notificationCount}
        roomNavLabel={roomNavLabel}
        onSelectIndex={(i) => setNavIndex(i)}
        onFocusIndex={(i) => setNavIndex(i)}
        onNavItemPress={onNavItemPress}
      />
    </>
  );

  if (backgroundImageSource) {
    return (
      <ImageBackground
        source={backgroundImageSource}
        resizeMode="cover"
        style={styles.container}
      >
        {content}
      </ImageBackground>
    );
  }

  return <View style={[styles.container, styles.containerFallback]}>{content}</View>;
}

// ─── Styles (1280×720 design, scaled) ───────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
  },
  containerFallback: {
    backgroundColor: Colors.background.dark,
  },
  darkOverlay: {
    backgroundColor: COLORS.overlay,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: s(120),
    marginTop: s(20),
    marginRight: s(20),
    flexDirection: 'column',
    overflow: 'hidden',
  },
  topBarLabelStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.topBarLabelStrip,
    paddingVertical: s(6),
  },
  topBarLabelLeftWrap: {
    paddingLeft: s(80),
    minWidth: s(220),
    justifyContent: 'center',
  },
  topBarLabelCenterWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: s(20),
  },
  topBarLabelRightWrap: {
    width: s(200),
  },
  topBarLabelText: {
    fontFamily: FontFamily.medium,
    fontSize: s(16),
    color: COLORS.gold,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  topBarContent: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: COLORS.overlay,
    flex: 1,
    minHeight: s(70),
  },
  topBarLeft: {
    paddingLeft: s(40),
    paddingVertical: s(10),
    justifyContent: 'center',
    minWidth: s(220),
  },
  topBarCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: s(20),
  },
  topBarRight: {
    width: s(200),
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  notificationBellBtn: {
    width: s(44),
    height: s(44),
    borderRadius: s(22),
    backgroundColor: Colors.overlay.white[8],
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBellWrap: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  notificationBellIcon: {
    fontSize: s(24),
  },
  notificationBellBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: s(18),
    height: s(18),
    borderRadius: s(9),
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBellBadgeText: {
    fontSize: s(10),
    fontWeight: '700',
    color: Colors.white,
  },
  dateTimeSection: {
    flexDirection: 'column',
    alignItems: 'center',
    alignSelf: 'center',
  },
  timeText: {
    fontFamily: FontFamily.light,
    fontSize: s(36),
    color: COLORS.gold,
    lineHeight: s(46),
    textAlign: 'center',
  },
  dateText: {
    fontFamily: FontFamily.light,
    fontSize: s(16),
    color: COLORS.white,
    marginTop: s(1),
    textAlign: 'center',
  },
  weatherSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  weatherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
  tempWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tempText: {
    fontFamily: FontFamily.light,
    fontSize: s(36),
    color: COLORS.white,
  },
  tempDegreeWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  tempDegreeSymbol: {
    fontFamily: FontFamily.light,
    fontSize: s(18),
    color: COLORS.white,
  },
  tempDegreeC: {
    fontFamily: FontFamily.light,
    fontSize: s(18),
    color: COLORS.gold,
  },
  weatherIconWrap: {
    width: s(47),
    height: s(36),
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  weatherCloud: {
    position: 'absolute',
    opacity: 0.9,
    right: s(20),
    top: s(2),
    
  },
  weatherSun: {
    position: 'absolute',
    opacity: 0.9,
    marginLeft: s(15),
    
  },
  weatherCondition: {
    fontFamily: FontFamily.book,
    fontSize: s(13),
    color: COLORS.white,
    textAlign: 'center',
    marginTop: s(2),
  },
  welcomeWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: WINDOW_HEIGHT * 0.35,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontFamily: FontFamily.bold,
    fontWeight: '800',
    fontSize: s(64),
    color: COLORS.white,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontFamily: FontFamily.book,
    fontSize: s(36),
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: s(-8),
  },
  welcomeSignature: {
    fontFamily: FontFamily.medium,
    fontSize: s(22),
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: s(16),
  },
  bottomNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: s(190),
    marginBottom: s(28),
    backgroundColor: COLORS.overlay,
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomNoText: {
    position: 'absolute',
    top: s(-25),
    left: s(24),
    fontFamily: FontFamily.bold,
    fontSize: s(20),
    color: COLORS.white,
    letterSpacing: 1,
  },
  navArrow: {
    width: s(48),
    height: s(200),
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: s(0),
    marginBottom: s(30),
  },
  navArrowIconBox: {
    width: s(122),
    height: s(122),
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowIcon: {
    fontSize: s(120),
    color: COLORS.white,
    fontWeight: '300',
  },
  navRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    
  },
  navItemTouch: {
    width: s(165),
    minWidth: s(165),
    height: s(100),
    minHeight: s(100),
    paddingVertical: s(8),
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  messagesCountBadge: {
    position: 'absolute',
    top: s(16),
    right: s(40),
    minWidth: s(22),
    height: s(22),
    borderRadius: s(11),
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: s(5),
  },
  messagesCountBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: s(11),
    color: Colors.white,
    textAlign: 'center',
    includeFontPadding: false,
  },
  iconBox: {
    width: s(64),
    height: s(64),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  navItemLabelWrap: {
    width: '100%',
    minHeight: s(56),
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemActive: {
    backgroundColor: Colors.primaryDark,
    fontFamily: FontFamily.bold,
    borderRadius: 4,
  },
  navItemActiveInner: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 4,
    overflow: 'hidden',
  },
  navItemFocused: {
    borderWidth: 2,
    borderRadius: 8,
    borderColor: COLORS.white,
    transform: [{ scale: 1.05 }],
  },
  navItemInner: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navItemLabel: {
    fontFamily: FontFamily.text,
    fontSize: s(14),
    // color: Colors.jebelGrey[400],
    color: Colors.white,
    textAlign: 'center',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  navItemLabelActive: {
    color: Colors.white,
    fontFamily: FontFamily.book,
    fontWeight: '900',
    fontSize: s(14),
  },
  iconOuter: {
    width: s(64),
    height: s(64),
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconOuterRelative: {
    position: 'relative',
  },
  iconShield: {
    width: s(36),
    height: s(40),
    borderRadius: s(6),
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCross: {
    fontFamily: FontFamily.bold,
    fontSize: s(20),
  },
  iconCircle: {
    width: s(38),
    height: s(38),
    borderRadius: s(19),
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconForkKnife: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
  },
  iconFork: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  iconForkTines: {
    flexDirection: 'row',
    gap: 1,
  },
  iconForkTine: {
    width: 2,
    height: s(8),
  },
  iconForkHandle: {
    width: 2,
    height: s(12),
    marginTop: s(2),
  },
  iconKnife: {
    width: s(2),
    height: s(16),
    transform: [{ rotate: '-25deg' }],
  },
  iconPlaza: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: s(6),
    height: s(48),
  },
  iconPlazaTower: {
    width: s(14),
    height: s(36),
    borderRadius: 2,
  },
  iconPlazaTowerRight: {
    height: s(30),
  },
  iconFacilities: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(3),
  },
  iconFacilityCell: {
    width: s(12),
    height: s(12),
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFacilityP: {
    fontFamily: FontFamily.bold,
    fontSize: s(8),
  },
  iconDumbbell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDumbbellEnd: {
    width: s(5),
    height: s(8),
    borderRadius: s(2),
  },
  iconDumbbellBar: {
    width: s(6),
    height: 2,
    marginHorizontal: 1,
  },
  iconWifi: {
    width: s(12),
    height: s(12),
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  iconWifiBar: {
    width: 1,
    height: s(4),
    position: 'absolute',
    bottom: 0,
    left: 1,
  },
  iconWifiBarM: {
    height: s(7),
    left: s(4),
  },
  iconWifiBarR: {
    height: s(10),
    left: s(9),
  },
  iconHealthImage: {
    width: s(52),
    height: s(52),
    alignSelf: 'center',
  },
  iconFacilitiesImage: {
    width: s(52),
    height: s(52),
    alignSelf: 'center',
  },
  iconChannelImage: {
    width: s(52),
    height: s(52),
    alignSelf: 'center',
  },
  iconTvImage: {
    width: s(52),
    height: s(52),
    alignSelf: 'center',
  },
  iconMessageImage: {
    width: s(52),
    height: s(52),
    alignSelf: 'center',
  },
  iconNotificationsText: {
    fontSize: s(32),
    textAlign: 'center',
  },
  iconMessagesOutline: {
    width: s(36),
    height: s(28),
    borderWidth: 2,
    borderColor: Colors.white,
    borderRadius: s(6),
    backgroundColor: 'transparent',
  },
  iconPlazaImage: {
    width: s(52),
    height: s(52),
    alignSelf: 'center',
  },
  iconCartImage: {
    width: s(52),
    height: s(52),
    alignSelf: 'center',
  },
  iconMonitor: {
    width: s(34),
    height: s(30),
    borderRadius: s(3),
    overflow: 'hidden',
    alignItems: 'center',
  },
  iconScreen: {
    width: '100%',
    height: s(20),
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconMonitorText: {
    fontFamily: FontFamily.bold,
    fontSize: s(9),
  },
  iconRemote: {
    width: s(12),
    height: s(6),
    borderRadius: 2,
    marginTop: s(1),
    alignSelf: 'center',
  },
  iconCartBasket: {
    position: 'absolute',
    width: s(32),
    height: s(18),
    borderTopWidth: 0,
    borderBottomLeftRadius: s(4),
    borderBottomRightRadius: s(4),
    top: s(10),
    left: s(7),
  },
  iconCartHandle: {
    position: 'absolute',
    width: s(14),
    height: 2,
    top: s(8),
    right: s(4),
    transform: [{ rotate: '-20deg' }],
  },
  iconCartWheel: {
    position: 'absolute',
    width: s(7),
    height: s(7),
    borderRadius: s(4),
    bottom: s(4),
    left: s(9),
  },
  iconCartWheelRight: {
    position: 'absolute',
    width: s(7),
    height: s(7),
    borderRadius: s(4),
    bottom: s(4),
    right: s(9),
  },
  iconDiningImage: {
    width: s(52),
    height: s(52),
    alignSelf: 'center',
  },
});
