import { useState, useEffect, useCallback, useRef } from 'react';
import { parseTimeToDate } from '../utils/timeUtils';

const NOTIFICATION_KEY = 'ramazan-vakitleri-notifications';
const REMINDER_MINUTES = 15;
const SENT_KEY = 'ramazan-vakitleri-notif-sent';

const isSupported = () => typeof window !== 'undefined' && 'Notification' in window;

const getPermissionState = () => {
  if (!isSupported()) return 'unsupported';
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

// Android Chrome'da `new Notification()` "Illegal constructor" atar; bildirim
// yalnızca service worker kaydı üzerinden gösterilebilir. Önce o denenir.
const showNotification = async (title, options) => {
  try {
    const registration = await navigator.serviceWorker?.getRegistration?.();
    if (registration?.showNotification) {
      await registration.showNotification(title, options);
      return;
    }
  } catch {
    // kayıt yoksa ya da reddedildiyse doğrudan dene
  }

  try {
    new Notification(title, options);
  } catch {
    // bu tarayıcı sayfa içinden bildirim gösteremiyor
  }
};

const REMINDERS = [
  { key: 'Imsak', name: 'İmsak', title: 'İmsaka' },
  { key: 'Aksam', name: 'İftar', title: 'İftara' },
];

/**
 * İmsak ve iftardan 15 dakika önce hatırlatır (sayfa açıkken).
 * `toggle` sonucu döner: 'enabled' | 'disabled' | 'denied' | 'unsupported';
 * arayüz bunu kullanıcıya anlatır.
 */
const useNotification = (times) => {
  const [enabled, setEnabled] = useState(() => {
    try {
      return localStorage.getItem(NOTIFICATION_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [permission, setPermission] = useState(getPermissionState);
  const intervalRef = useRef(null);

  const persist = (value) => {
    setEnabled(value);
    try {
      localStorage.setItem(NOTIFICATION_KEY, String(value));
    } catch {
      // ignore
    }
  };

  const toggle = useCallback(async () => {
    if (!isSupported()) return 'unsupported';

    if (enabled && permission === 'granted') {
      persist(false);
      return 'disabled';
    }

    let result = Notification.permission;
    if (result === 'default') {
      try {
        result = await Notification.requestPermission();
      } catch {
        result = 'denied';
      }
    }
    setPermission(result);

    if (result === 'granted') {
      persist(true);
      return 'enabled';
    }

    persist(false);
    return 'denied';
  }, [enabled, permission]);

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

      REMINDERS.forEach(({ key, name, title }) => {
        const timeStr = times[key];
        if (!timeStr) return;

        const minutesLeft = (parseTimeToDate(timeStr, now) - now) / (1000 * 60);
        const notifKey = `${today}-${name}-${timeStr}`;

        if (minutesLeft > 0 && minutesLeft <= REMINDER_MINUTES && !sent[notifKey]) {
          markNotificationSent(notifKey);
          showNotification(`${title} ${Math.ceil(minutesLeft)} dakika kaldı`, {
            body: `${name} vakti ${timeStr}`,
            icon: '/favicons/android-chrome-192x192.png',
            badge: '/favicons/favicon-48x48.png',
            tag: notifKey,
            lang: 'tr',
          });
        }
      });
    };

    checkAndNotify();
    intervalRef.current = setInterval(checkAndNotify, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, permission, times]);

  return {
    // İzin sonradan tarayıcıdan geri alındıysa açık görünmesin
    enabled: enabled && permission === 'granted',
    permission,
    supported: isSupported(),
    toggle,
  };
};

export default useNotification;
