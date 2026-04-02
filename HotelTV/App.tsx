import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, StatusBar, StyleSheet, View } from 'react-native';
import { Colors } from './src/theme/colors';
import { EmergencyAlertProvider } from './src/context/EmergencyAlertContext';
import { NotificationProvider, useNotifications } from './src/context/NotificationContext';
import { EmergencyAlertModal } from './src/components/EmergencyAlertModal';
import { UpdateModal } from './src/components/UpdateModal';
import { useAppUpdate } from './src/hooks/useAppUpdate';
import { useAlertListener } from './src/hooks/useAlertListener';
import { useNotificationListener } from './src/hooks/useNotificationListener';
import { useWelcomeGuest } from './src/hooks/useWelcomeGuest';
import EtihadSplashScreen from './src/screens/EtihadSplashScreen';
import WelcomeScreen, { NavItemData } from './src/screens/WelcomeScreen';
import FacilitiesScreen from './src/screens/FacilitiesScreen';
import EtihadChannelScreen from './src/screens/EtihadChannelScreen';
import EtihadChannelsScreen from './src/screens/EtihadChannelsScreen';
import EtihadDiningScreen from './src/screens/EtihadDiningScreen';
import EtihadPlazaScreen from './src/screens/EtihadPlazaScreen';
import OccupationalHealthSafetyScreen from './src/screens/OccupationalHealthSafetyScreen';
import EtihadHypermarketScreen from './src/screens/EtihadHypermarketScreen';
import NotificationScreen from './src/screens/NotificationScreen';

// Diagnostic: log every hardware key received from the physical remote.
// Remove or comment out when no longer needed.
function useDiagnosticKeyLog() {
  useEffect(() => {
    if (!__DEV__) return;
    let subscription: { remove: () => void } | null = null;
    try {
      // react-native-keyevent is already linked — use it to confirm JS receives keys
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const KeyEvent = require('react-native-keyevent').default;
      KeyEvent.onKeyDownListener((evt: { keyCode: number; pressedKey: string }) => {
        console.log('[REMOTE] keyDown  keyCode=' + evt.keyCode + '  key=' + evt.pressedKey);
      });
      subscription = { remove: () => KeyEvent.removeKeyDownListener() };
    } catch (e) {
      console.warn('[REMOTE] react-native-keyevent not available:', e);
    }
    return () => subscription?.remove();
  }, []);
}

// TV performance: Short fade only. All 4 screens mounted for instant D-pad response
// (unmounting causes focus loss). Animations reduced for budget TV (~1GB RAM).
function AnimatedScreen({
  isActive,
  children,
}: {
  isActive: boolean;
  children: React.ReactNode;
}) {
  const opacity = useRef(new Animated.Value(isActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: isActive ? 1 : 0,
      duration: isActive ? 120 : 80,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [isActive, opacity]);

  return (
    <Animated.View
      style={[styles.screen, { opacity }]}
      pointerEvents={isActive ? 'auto' : 'none'}
    >
      {children}
    </Animated.View>
  );
}

function AppContent(): React.JSX.Element {
  const [showSplash, setShowSplash] = useState(true);
  // After splash, mount Welcome first; defer other screens so home isn’t blocked by 7+ heavy trees.
  const [heavyScreensReady, setHeavyScreensReady] = useState(false);
  // Start network listeners only after splash to avoid slow first paint.
  useAlertListener(!showSplash);
  useNotificationListener(!showSplash);
  const welcomeGuest = useWelcomeGuest(!showSplash);
  const { unreadCount } = useNotifications();
  const [screen, setScreen] = useState<'welcome' | 'facilities' | 'channel' | 'etihadChannels' | 'dining' | 'plaza' | 'health' | 'hypermarket' | 'notifications'>('welcome');

  // Diagnostic — remove after confirming remote events reach JS
  useDiagnosticKeyLog();

  const handleSplashFinish = React.useCallback(() => setShowSplash(false), []);

  useEffect(() => {
    if (showSplash) {
      setHeavyScreensReady(false);
      return;
    }
    setHeavyScreensReady(false);
    let raf2: number | undefined;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setHeavyScreensReady(true));
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2 != null) cancelAnimationFrame(raf2);
    };
  }, [showSplash]);

  const mountSecondaryScreens = heavyScreensReady || screen !== 'welcome';

  const commonProps = {
    guestName: welcomeGuest.guestName,
    temperature: 23,
    weatherCondition: 'SUNNY',
    // date and time omitted — WelcomeScreen uses real-time values
  } as const;

  const welcomeScreenExtra = {
    welcomeMessage: welcomeGuest.welcomeMessage,
    signatureTitle: welcomeGuest.signatureTitle,
    roomNavLabel: welcomeGuest.roomNavLabel,
  };

  // Fast startup: while splash is visible, avoid mounting all heavy screens.
  // This reduces JS work at cold start and prevents long pre-splash delays.
  if (showSplash) {
    return (
      <View style={[styles.container, styles.containerSplash]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <EtihadSplashScreen onFinish={handleSplashFinish} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Home screens — always mounted underneath, ready when splash ends */}
      <AnimatedScreen isActive={screen === 'welcome'}>
        <WelcomeScreen
          {...commonProps}
          {...welcomeScreenExtra}
          isActive={screen === 'welcome'}
          activeNavIndex={3}
          backgroundImageSource={require('./src/assets/plaza-bg.jpg')}
          onNotificationsPress={() => setScreen('notifications')}
          notificationCount={unreadCount}
          onNavItemPress={(item: NavItemData) => {
            if (item.icon === 'health') {
              setScreen('health');
            } else if (item.icon === 'cart') {
              setScreen('hypermarket');
            } else if (item.icon === 'facilities') {
              setScreen('facilities');
            } else if (item.icon === 'channel') {
              setScreen('etihadChannels');
            } else if (item.icon === 'tv') {
              setScreen('channel');
            } else if (item.icon === 'dining') {
              setScreen('dining');
            } else if (item.icon === 'plaza') {
              setScreen('plaza');
            } else if (item.icon === 'notifications') {
              setScreen('notifications');
            }
          }}
        />
      </AnimatedScreen>

      {mountSecondaryScreens ? (
        <>
          <AnimatedScreen isActive={screen === 'health'}>
            <OccupationalHealthSafetyScreen
              {...commonProps}
              isActive={screen === 'health'}
              onBack={() => setScreen('welcome')}
            />
          </AnimatedScreen>

          <AnimatedScreen isActive={screen === 'facilities'}>
            <FacilitiesScreen
              {...commonProps}
              isActive={screen === 'facilities'}
              backgroundImageSource={null}
              onBack={() => setScreen('welcome')}
            />
          </AnimatedScreen>

          <AnimatedScreen isActive={screen === 'channel'}>
            <EtihadChannelScreen
              isActive={screen === 'channel'}
              onBack={() => setScreen('welcome')}
            />
          </AnimatedScreen>

          <AnimatedScreen isActive={screen === 'etihadChannels'}>
            <EtihadChannelsScreen
              isActive={screen === 'etihadChannels'}
              onBack={() => setScreen('welcome')}
            />
          </AnimatedScreen>

          <AnimatedScreen isActive={screen === 'dining'}>
            <EtihadDiningScreen
              isActive={screen === 'dining'}
              onBack={() => setScreen('welcome')}
            />
          </AnimatedScreen>

          <AnimatedScreen isActive={screen === 'plaza'}>
            <EtihadPlazaScreen
              isActive={screen === 'plaza'}
              onBack={() => setScreen('welcome')}
            />
          </AnimatedScreen>

          <AnimatedScreen isActive={screen === 'hypermarket'}>
            <EtihadHypermarketScreen
              isActive={screen === 'hypermarket'}
              onBack={() => setScreen('welcome')}
            />
          </AnimatedScreen>

          <AnimatedScreen isActive={screen === 'notifications'}>
            <NotificationScreen
              isActive={screen === 'notifications'}
              onBack={() => setScreen('welcome')}
            />
          </AnimatedScreen>
        </>
      ) : null}

    </View>
  );
}

function AppUpdateLayer(): React.JSX.Element {
  const { modalVisible, updateData, dismiss } = useAppUpdate();
  return (
    <UpdateModal
      visible={modalVisible}
      updateData={updateData}
      onDismiss={dismiss}
    />
  );
}

function App(): React.JSX.Element {
  return (
    <EmergencyAlertProvider>
      <NotificationProvider>
        <AppContent />
        <EmergencyAlertModal />
        <AppUpdateLayer />
      </NotificationProvider>
    </EmergencyAlertProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.dark,
  },
  containerSplash: {
    backgroundColor: Colors.background.dark,
  },
  screen: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default App;
