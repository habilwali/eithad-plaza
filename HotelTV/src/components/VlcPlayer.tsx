/**
 * VlcPlayer — thin wrapper around react-native-vlc-media-player
 *
 * Key design decisions:
 *  • Hardware decoding via initOptions (mediacodec_ndk → iomx → avcodec fallback)
 *  • Caching tuned for live / UDP multicast streams
 *  • Clock sync disabled so live streams never seek backwards
 *  • Auto-retry on error (up to MAX_RETRIES), uses key remount to force a clean VLC instance
 *  • Loading overlay only during initial connect and reconnect — NOT on every mid-stream
 *    buffer event (avoids flashing overlay during normal IPTV playback)
 */

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { VLCPlayer, type VideoInfo } from 'react-native-vlc-media-player';
import { FontFamily } from '../theme/typography';
import { Colors } from '../theme/colors';

export interface VlcPlayerProps {
  uri: string | null | undefined;
  style?: ViewStyle | object;
  /** Stretch the view to fill the screen absolutely (fullscreen mode) */
  isFullscreen?: boolean;
  paused?: boolean;
  channelName?: string;
}

/**
 * VLC init options for smooth live / UDP-multicast IPTV on budget Android TV devices
 * (tested on Videocon E43EL1100, Amlogic / Realtek class SoCs).
 *
 * Codec chain  mediacodec_ndk → mediacodec → iomx → avcodec (software last resort):
 *   mediacodec_ndk  — NDK-direct MediaCodec; fastest path on Android 5+ / API 21+.
 *   mediacodec      — Java-side MediaCodec wrapper; needed on devices where NDK init
 *                     fails (many budget Amlogic/Realtek sets fall into this bucket).
 *   iomx            — Legacy OpenMAX IL; still required on some Android 8/9 Amlogic
 *                     builds that expose hardware decode only via the OMX layer.
 *   avcodec         — FFmpeg software; last resort, almost always too slow for HD IPTV.
 *
 * --avcodec-hw=any  — Tells FFmpeg's avcodec module to try any available hwaccel.
 *                     Works in parallel with the codec list above; whichever activates
 *                     first "wins" for a given stream, giving maximum hw coverage.
 *
 * --clock-jitter=7000:
 *   UDP timing variance tolerance (ms); balances live IPTV on busy TV UI threads.
 *
 * --clock-synchro=0:
 *   Rely solely on the stream's own PTS/DTS — don't fight an external wall-clock.
 *
 * No --demux=ts:
 *   Forcing ts demuxer is overly strict for real-world streams; some carry extra
 *   non-standard adaptation fields that make the TS demuxer drop sync frames.
 *   Auto-detection handles these cases correctly.
 *
 * Network / live / file caching ~2000 ms:
 *   Lower than 3200–3800 ms so the video decoder gets picture data sooner; large
 *   caches often cause “sound first, black video for several seconds” on IPTV.
 *
 * --avcodec-threads=0:
 *   Let FFmpeg auto-select the thread count (= number of CPU cores). Budget SoCs
 *   are typically quad-core; without this VLC may only use 1-2 threads, leaving
 *   the other cores idle while the active thread falls behind.
 *
 * --audio-time-stretch:
 *   Enables audio time-stretching to absorb A/V drift during network jitter without
 *   causing audible pops or pitch shifts. Keeps audio and video locked together.
 *
 * --no-spu:
 *   Disables the subtitle / teletext parser that runs alongside the video decoder.
 *   Live IPTV channels rarely carry useful SPU data; disabling it frees CPU cycles.
 */
// NOTE: if hard-crashes persist on channel switch, try moving mediacodec_ndk to the
// END of the codec list (mediacodec,iomx,mediacodec_ndk,avcodec) so the safer
// Java-side MediaCodec path is preferred on crash-prone budget SoCs.
//
// Frozen outside the component — never recreated on re-render. VlcPlayer spreads it
// ([...VLC_INIT]) before passing to the native bridge so the library can .push()
// onto a fresh mutable copy without hitting a frozen-array TypeError.
const VLC_INIT: readonly string[] = Object.freeze([
  '--codec=mediacodec_ndk,mediacodec,iomx,avcodec',
  '--avcodec-hw=any',
  // Fixed at 2 — avcodec-threads=0 (auto) causes native decoder init crashes on
  // some budget Amlogic/Realtek SoCs that miscalculate available core count.
  '--avcodec-threads=8',
  // Drop frames that arrive late instead of buffering them; prevents the decoder
  // queue from growing unbounded during UDP bursts and avoids OOM-induced crashes.
  '--drop-late-frames',
  '--skip-frames',
  '--network-caching=1000',
  '--live-caching=2000',
  '--file-caching=2000',
  '--clock-jitter=2000',
  '--clock-synchro=0',
  '--audio-time-stretch',
  '--no-spu',
  '--no-stats',
]);

const MAX_RETRIES = 3;
const RETRY_MS    = 2500;
/** If `onLoad` never reports video size, stop covering the player after this (ms). */
const VISUAL_READY_FALLBACK_MS = 1100;
const DEFAULT_STREAM_URI = 'udp://@224.2.2.2:2000';

type Status = 'loading' | 'playing' | 'reconnecting' | 'failed';

function getSafeStreamUri(value: string | null | undefined): string {
  if (typeof value !== 'string') {
    return DEFAULT_STREAM_URI;
  }

  const trimmed = value.trim();
  if (!trimmed || /^(null|undefined|false)$/i.test(trimmed)) {
    return DEFAULT_STREAM_URI;
  }

  // Native VLC can hard-crash on malformed source values, so never mount it
  // with raw bad data. Use the default multicast stream instead.
  if (/[\s\u0000-\u001F\u007F]/.test(trimmed)) {
    return DEFAULT_STREAM_URI;
  }

  if (/^(udp|rtp|rtsp|http|https):\/\//i.test(trimmed)) {
    return trimmed;
  }

  return DEFAULT_STREAM_URI;
}

function VlcPlayer({
  uri,
  style,
  isFullscreen = false,
  paused = false,
  channelName,
}: VlcPlayerProps) {
  const [status,  setStatus]  = useState<Status>('loading');
  const [vlcKey,  setVlcKey]  = useState(0);
  const safeUri = getSafeStreamUri(uri);
  /** True once we know the stream has a video track (or fallback elapsed) — hides overlay so picture shows. */
  const [visualReady, setVisualReady] = useState(false);
  const retriesRef     = useRef(0);
  const timerRef       = useRef<ReturnType<typeof setTimeout>>();
  const stoppedTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const visualFallbackRef = useRef<ReturnType<typeof setTimeout>>();
  /** Ref to native VLC wrapper — used to recover from stuck pause/mute after spurious native events. */
  const playerRef = useRef<InstanceType<typeof VLCPlayer> | null>(null);
  const statusRef = useRef<Status>(status);
  statusRef.current = status;
  const parentPausedRef = useRef(paused);
  parentPausedRef.current = paused;
  /**
   * Native unpause/volume nudge only once per VLC mount. VLC can emit Playing many
   * times during a session; repeating setNativeProps each time causes visible stutter.
   */
  const nativeUnstickDoneRef = useRef(false);
  /** Only one post-`onPlaying` fallback timer — VLC can emit Playing repeatedly. */
  const visualFallbackScheduledRef = useRef(false);

  useEffect(() => {
    nativeUnstickDoneRef.current = false;
    visualFallbackScheduledRef.current = false;
    setVisualReady(false);
    if (visualFallbackRef.current != null) {
      clearTimeout(visualFallbackRef.current);
      visualFallbackRef.current = undefined;
    }
  }, [vlcKey]);

  // Full reset whenever the stream URI changes.
  // setVlcKey is deferred via setImmediate so the old native VLC SurfaceView/TextureView
  // has a full JS-frame to detach and release hardware decoder resources before the new
  // instance is initialized — prevents hardware decoder collision crashes on channel switch.
  useEffect(() => {
    clearTimeout(timerRef.current);
    clearTimeout(stoppedTimerRef.current);
    if (visualFallbackRef.current != null) {
      clearTimeout(visualFallbackRef.current);
      visualFallbackRef.current = undefined;
    }
    retriesRef.current = 0;
    if (!safeUri) {
      setStatus('failed');
      playerRef.current = null;
      return;
    }
    setStatus('loading');

    // Nullify the ref so stale callbacks from the old instance cannot fire after unmount.
    playerRef.current = null;

    const id = setImmediate(() => setVlcKey(k => k + 1));
    return () => clearImmediate(id);
  }, [safeUri]);

  useEffect(() => () => {
    clearTimeout(timerRef.current);
    clearTimeout(stoppedTimerRef.current);
    if (visualFallbackRef.current != null) {
      clearTimeout(visualFallbackRef.current);
    }
    // Nullify on unmount so any in-flight native callbacks cannot access a stale ref.
    playerRef.current = null;
  }, []);

  const handleError = () => {
    clearTimeout(timerRef.current);
    clearTimeout(stoppedTimerRef.current);
    if (retriesRef.current < MAX_RETRIES) {
      retriesRef.current += 1;
      setVisualReady(false);
      visualFallbackScheduledRef.current = false;
      if (visualFallbackRef.current != null) {
        clearTimeout(visualFallbackRef.current);
        visualFallbackRef.current = undefined;
      }
      setStatus('reconnecting');
      timerRef.current = setTimeout(() => {
        setStatus('loading');
        setVlcKey(k => k + 1);
      }, RETRY_MS);
    } else {
      setStatus('failed');
    }
  };

  const markVisualReady = useCallback(() => {
    if (visualFallbackRef.current != null) {
      clearTimeout(visualFallbackRef.current);
      visualFallbackRef.current = undefined;
    }
    visualFallbackScheduledRef.current = false;
    setVisualReady(true);
  }, []);

  const handleLoad = useCallback(
    (info: VideoInfo) => {
      const w = info.videoSize?.width ?? 0;
      const h = info.videoSize?.height ?? 0;
      if (w >= 4 && h >= 4) {
        markVisualReady();
      }
    },
    [markVisualReady],
  );

  /** Native `onLoad` / `updateVideoInfo` only runs when a progress interval is set (see VLCPlayer.js). */
  const onProgressNoop = useCallback(() => {}, []);

  const handlePlaying = () => {
    clearTimeout(stoppedTimerRef.current);
    retriesRef.current = 0;
    // react-native-vlc-media-player's native _onStopped can leave paused=true in native
    // while JS still has paused=false. Fix once per mount only — repeated nudges stutter playback.
    if (
      !parentPausedRef.current &&
      !nativeUnstickDoneRef.current
    ) {
      nativeUnstickDoneRef.current = true;
      const ply = playerRef.current as unknown as {
        setNativeProps?: (p: {
          paused?: boolean;
          muted?: boolean;
          volume?: number;
        }) => void;
      } | null;
      ply?.setNativeProps?.({ paused: false, muted: false, volume: 100 });
    }
    setStatus('playing');
    if (!visualFallbackScheduledRef.current) {
      visualFallbackScheduledRef.current = true;
      if (visualFallbackRef.current != null) {
        clearTimeout(visualFallbackRef.current);
      }
      visualFallbackRef.current = setTimeout(
        markVisualReady,
        VISUAL_READY_FALLBACK_MS,
      );
    }
  };

  // VLC fires onStopped during normal internal state transitions on live streams
  // (codec restart, TS gap recovery, etc.). Debounce before treating it as a real
  // error to avoid false-positive remounts that would interrupt smooth playback.
  const handleStopped = () => {
    if (statusRef.current !== 'playing') return;
    clearTimeout(stoppedTimerRef.current);
    stoppedTimerRef.current = setTimeout(handleError, 4000);
  };

  const showOverlay =
    status !== 'playing' || (status === 'playing' && !visualReady);

  return (
    <View style={[st.root, style, isFullscreen && st.fullscreen]}>
      {!!safeUri && status !== 'failed' && (
        <VLCPlayer
          ref={playerRef}
          key={`vlc-${vlcKey}`}
          source={{ uri: safeUri, initOptions: [...VLC_INIT] }}
          style={StyleSheet.absoluteFill}
          paused={paused || status === 'reconnecting'}
          repeat={false}
          muted={false}
          volume={100}
          resizeMode="contain"
          onLoad={handleLoad}
          onProgress={onProgressNoop}
          onPlaying={handlePlaying}
          onError={handleError}
          onStopped={handleStopped}
        />
      )}

      {showOverlay && (
        <View style={st.overlay}>
          {status === 'failed' ? (
            <>
              <Text style={st.icon}>⚠</Text>
              <Text style={st.label}>Stream unavailable</Text>
              {!!channelName && <Text style={st.sub}>{channelName}</Text>}
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={st.label}>
                {status === 'reconnecting'
                  ? `Reconnecting… ${retriesRef.current}/${MAX_RETRIES}`
                  : status === 'playing' && !visualReady
                    ? 'Starting video…'
                    : (channelName ?? 'Connecting…')}
              </Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}

export default memo(VlcPlayer);

const st = StyleSheet.create({
  root: {
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  fullscreen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  icon: {
    color: Colors.primary,
    fontSize: 30,
  },
  label: {
    fontFamily: FontFamily.book,
    color: Colors.primary,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  sub: {
    fontFamily: FontFamily.book,
    color: Colors.text.muted,
    fontSize: 10,
    letterSpacing: 1,
    marginTop: 4,
  },
});
