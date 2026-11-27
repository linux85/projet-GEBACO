import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_IDLE_TIMEOUT_MS,
  DEFAULT_WARNING_LEAD_MS,
  INACTIVITY_LOGOUT_MESSAGE,
  pingServerSession,
} from '../lib/sessionClient';

const ACTIVITY_EVENTS = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'] as const;
const EVENT_THROTTLE_MS = 1000;
const SERVER_SYNC_PING_INTERVAL_MS = 60 * 1000;
const BROADCAST_CHANNEL_NAME = 'gebaco_idle_activity_v1';

interface UseIdleTimeoutOptions {
  enabled: boolean;
  idleTimeoutMs?: number;
  warningLeadMs?: number;
  onTimeout: (message: string) => void;
}

interface UseIdleTimeoutResult {
  isWarningOpen: boolean;
  remainingSeconds: number;
  warningLeadSeconds: number;
  isRenewing: boolean;
  stayConnected: () => Promise<void>;
  resetActivity: () => void;
}

export function useIdleTimeout({
  enabled,
  idleTimeoutMs = DEFAULT_IDLE_TIMEOUT_MS,
  warningLeadMs = DEFAULT_WARNING_LEAD_MS,
  onTimeout,
}: UseIdleTimeoutOptions): UseIdleTimeoutResult {
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(
    Math.ceil(warningLeadMs / 1000)
  );
  const [isRenewing, setIsRenewing] = useState(false);

  const lastActivityAtRef = useRef<number>(Date.now());
  const lastEventHandledAtRef = useRef<number>(0);
  const lastServerPingAtRef = useRef<number>(Date.now());
  const isWarningOpenRef = useRef<boolean>(false);
  const hasTimedOutRef = useRef<boolean>(false);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const onTimeoutRef = useRef(onTimeout);

  onTimeoutRef.current = onTimeout;

  const effectiveIdleMs = Math.max(2000, idleTimeoutMs);
  const effectiveWarningMs = Math.min(
    Math.max(1000, warningLeadMs),
    Math.floor(effectiveIdleMs / 2)
  );
  const warningLeadSeconds = Math.max(1, Math.ceil(effectiveWarningMs / 1000));

  const triggerExpire = useCallback((message: string, broadcast = true) => {
    if (hasTimedOutRef.current) return;
    hasTimedOutRef.current = true;
    isWarningOpenRef.current = false;
    setIsWarningOpen(false);
    if (broadcast && channelRef.current) {
      try {
        channelRef.current.postMessage({ type: 'expired', message });
      } catch {
        // Ignore broadcast errors
      }
    }
    onTimeoutRef.current(message);
  }, []);

  const syncServerActivityIfNeeded = useCallback(async (now: number) => {
    if (now - lastServerPingAtRef.current < SERVER_SYNC_PING_INTERVAL_MS) {
      return;
    }
    lastServerPingAtRef.current = now;
    const res = await pingServerSession();
    if (res.expired) {
      triggerExpire(res.message || INACTIVITY_LOGOUT_MESSAGE, true);
    }
  }, [triggerExpire]);

  const resetActivity = useCallback(() => {
    const now = Date.now();
    lastActivityAtRef.current = now;
    lastEventHandledAtRef.current = now;
    hasTimedOutRef.current = false;
    if (isWarningOpenRef.current) {
      isWarningOpenRef.current = false;
      setIsWarningOpen(false);
    }
    setRemainingSeconds(warningLeadSeconds);
  }, [warningLeadSeconds]);

  const stayConnected = useCallback(async () => {
    if (isRenewing) return;
    setIsRenewing(true);
    try {
      const res = await pingServerSession();
      if (res.expired) {
        triggerExpire(res.message || INACTIVITY_LOGOUT_MESSAGE, true);
        return;
      }

      const now = Date.now();
      lastActivityAtRef.current = now;
      lastEventHandledAtRef.current = now;
      lastServerPingAtRef.current = now;
      isWarningOpenRef.current = false;
      setIsWarningOpen(false);
      setRemainingSeconds(warningLeadSeconds);

      if (channelRef.current) {
        try {
          channelRef.current.postMessage({ type: 'activity', timestamp: now });
        } catch {
          // Ignore broadcast errors
        }
      }
    } finally {
      setIsRenewing(false);
    }
  }, [isRenewing, triggerExpire, warningLeadSeconds]);

  useEffect(() => {
    if (!enabled) {
      isWarningOpenRef.current = false;
      hasTimedOutRef.current = false;
      setIsWarningOpen(false);
      return;
    }

    const now = Date.now();
    lastActivityAtRef.current = now;
    lastEventHandledAtRef.current = now;
    lastServerPingAtRef.current = now;
    hasTimedOutRef.current = false;
    isWarningOpenRef.current = false;
    setIsWarningOpen(false);

    // Optional cross-tab activity & timeout synchronization
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        channelRef.current = channel;
        channel.onmessage = (event) => {
          const data = event.data;
          if (!data || typeof data !== 'object') return;
          if (data.type === 'activity' && typeof data.timestamp === 'number') {
            if (data.timestamp > lastActivityAtRef.current) {
              lastActivityAtRef.current = data.timestamp;
              if (isWarningOpenRef.current) {
                isWarningOpenRef.current = false;
                setIsWarningOpen(false);
              }
            }
          } else if (data.type === 'expired') {
            triggerExpire(
              typeof data.message === 'string' ? data.message : INACTIVITY_LOGOUT_MESSAGE,
              false
            );
          }
        };
      } catch {
        channelRef.current = null;
      }
    }

    const handleUserActivity = () => {
      // Once warning modal is open, require explicit "Rester connecté" action
      if (isWarningOpenRef.current || hasTimedOutRef.current) return;

      const current = Date.now();
      if (current - lastEventHandledAtRef.current < EVENT_THROTTLE_MS) {
        return;
      }

      lastEventHandledAtRef.current = current;
      lastActivityAtRef.current = current;

      if (channelRef.current) {
        try {
          channelRef.current.postMessage({ type: 'activity', timestamp: current });
        } catch {
          // Ignore broadcast errors
        }
      }

      void syncServerActivityIfNeeded(current);
    };

    const evaluateIdleState = () => {
      if (hasTimedOutRef.current) return;
      const current = Date.now();
      const elapsed = current - lastActivityAtRef.current;
      const remainingMs = effectiveIdleMs - elapsed;

      if (remainingMs <= 0) {
        triggerExpire(INACTIVITY_LOGOUT_MESSAGE, true);
        return;
      }

      if (remainingMs <= effectiveWarningMs) {
        const secs = Math.max(1, Math.ceil(remainingMs / 1000));
        if (!isWarningOpenRef.current) {
          isWarningOpenRef.current = true;
          setIsWarningOpen(true);
        }
        setRemainingSeconds(secs);
      } else if (isWarningOpenRef.current) {
        isWarningOpenRef.current = false;
        setIsWarningOpen(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        evaluateIdleState();
      }
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleUserActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intervalId = window.setInterval(evaluateIdleState, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleUserActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
      if (channelRef.current) {
        channelRef.current.close();
        channelRef.current = null;
      }
    };
  }, [
    enabled,
    effectiveIdleMs,
    effectiveWarningMs,
    syncServerActivityIfNeeded,
    triggerExpire,
  ]);

  return {
    isWarningOpen,
    remainingSeconds,
    warningLeadSeconds,
    isRenewing,
    stayConnected,
    resetActivity,
  };
}
