import { useState, useEffect, useCallback, useRef } from 'react';
import { parseTimeToDate } from '../utils/timeUtils';

const NOTIFICATION_KEY = 'ramazan-vakitleri-notifications';
const REMINDER_MINUTES = 15;
const SENT_KEY = 'ramazan-vakitleri-notif-sent';

const getPermissionState = () => {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
};

const getSentNotifications = () => {
  try {
    const raw = localStorage.getItem(SENT_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    // Eski kayıtları temizle (1 günden eski)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const cleaned = {};
    for (const [key, ts] of Object.entries(data)) {
      if (ts > cutoff) cleaned[key] = ts;
    }
    return cleaned;
  } catch {
    return {};
  }
};

const markNotificationSent = (key) => {
  const sent = getSentNotifications();
  sent[key] = Date.now();
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify(sent));
  } catch {
    // ignore
  }
};

const useNotification = (times, nextTimes) => {
  const [enabled, setEnabled] = useState(() => {
    return localStorage.getItem(NOTIFICATION_KEY) === 'true';
  });
  const [permission, setPermission] = useState(getPermissionState);
  const intervalRef = useRef(null);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return false;

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      setEnabled(true);
      localStorage.setItem(NOTIFICATION_KEY, 'true');
      return true;
    }
    return false;
  }, []);

  const toggle = useCallback(async () => {
    if (enabled) {
      setEnabled(false);
      localStorage.setItem(NOTIFICATION_KEY, 'false');
      return;
    }

    if (permission === 'granted') {
      setEnabled(true);
      localStorage.setItem(NOTIFICATION_KEY, 'true');
      return;
    }

    await requestPermission();
  }, [enabled, permission, requestPermission]);

  useEffect(() => {
    if (!enabled || permission !== 'granted' || !times) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const checkAndNotify = () => {
      const now = new Date();
      const today = now.toDateString();
      const sent = getSentNotifications();

      const checkPrayer = (name, timeStr, source) => {
        if (!timeStr) return;
        const prayerDate = parseTimeToDate(timeStr, now);
        // Yarınki vakitler için tarihi düzelt
        if (source === 'next') {
          prayerDate.setDate(prayerDate.getDate() + 1);
        }
        const diff = prayerDate.getTime() - now.getTime();
        const minutesLeft = diff / (1000 * 60);
        const notifKey = `${today}-${name}-${timeStr}`;

        if (minutesLeft > 0 && minutesLeft <= REMINDER_MINUTES && !sent[notifKey]) {
          const mins = Math.ceil(minutesLeft);
          new Notification(`${name} Vaktine ${mins} dakika`, {
            body: `${name} vakti: ${timeStr}`,
            icon: '/favicons/android-chrome-192x192.png',
            tag: notifKey,
            silent: false,
          });
          markNotificationSent(notifKey);
        }
      };

      checkPrayer('İmsak', times.Imsak, 'today');
      checkPrayer('İftar', times.Aksam, 'today');
    };

    checkAndNotify();
    intervalRef.current = setInterval(checkAndNotify, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, permission, times, nextTimes]);

  return {
    enabled,
    permission,
    supported: 'Notification' in window,
    toggle,
  };
};

export default useNotification;
