import { useState, useEffect, useCallback, useRef } from 'react';
import { augmentDistricts } from '../utils/istanbulDistricts';
import { getCache, setCache } from '../utils/apiCache';
import { getVisiblePrayerTimes } from '../utils/prayerData';

const API_BASE = 'https://ezanvakti.emushaf.net';
const TURKEY_CODE = '2';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 5000, 10000];
// Servis yarım saniyede yanıt veriyor. Çekmeyen bağlantıda (sahurda zayıf
// şebeke) fetch dakikalarca asılı kalabiliyordu; deneme başına üst sınır.
const ATTEMPT_TIMEOUT = 12000;

// Çevrimdışıyken 17 sn'lik yeniden deneme zinciri boşa bekletir
const isOffline = () =>
  typeof navigator !== 'undefined' && navigator.onLine === false;

const fetchJson = async (url, signal) => {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, ATTEMPT_TIMEOUT);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
};

export const fetchWithRetry = async (url, signal, retries = MAX_RETRIES) => {
  if (isOffline()) retries = 0;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetchJson(url, signal);
    } catch (err) {
      // Yalnız çağıranın iptali sessiz geçer; zaman aşımı sıradan hatadır
      if (signal?.aborted) throw err;
      const failure = err.name === 'AbortError' ? new Error('Zaman aşımı') : err;
      if (attempt === retries) throw failure;
      await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
    }
  }
};

/**
 * Türkiye şehirlerini çeken hook (cache destekli)
 */
export const useCities = () => {
  const [cities, setCities] = useState(() => getCache('cities') || []);
  const [loading, setLoading] = useState(() => !getCache('cities'));

  useEffect(() => {
    const cached = getCache('cities');
    if (cached && cached.length > 0) {
      setCities(cached);
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchCities = async () => {
      try {
        const data = await fetchWithRetry(
          `${API_BASE}/sehirler/${TURKEY_CODE}`,
          controller.signal
        );
        if (controller.signal.aborted) return;
        setCities(data);
        setCache('cities', null, data);
      } catch (error) {
        if (error.name === 'AbortError') return;
        setCities([]);
      } finally {
        if (controller.signal.aborted) return;
        setLoading(false);
      }
    };

    fetchCities();

    return () => controller.abort();
  }, []);

  return { cities, loading };
};

/**
 * Seçilen şehrin ilçelerini çeken hook (cache destekli)
 */
export const useDistricts = (cityId) => {
  // Liste hangi ile ait: il değişince bir an eski ilin ilçeleri görünmesin
  const [state, setState] = useState({ cityId: null, districts: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cityId) {
      setState({ cityId: null, districts: [] });
      setLoading(false);
      return;
    }

    const cached = getCache('districts', cityId);
    if (cached && cached.length > 0) {
      setState({ cityId, districts: cached });
      setLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchDistricts = async () => {
      setLoading(true);
      try {
        const data = await fetchWithRetry(
          `${API_BASE}/ilceler/${cityId}`,
          controller.signal
        );
        if (controller.signal.aborted) return;
        const augmented = augmentDistricts(cityId, data);
        setState({ cityId, districts: augmented });
        setCache('districts', cityId, augmented);
      } catch (error) {
        if (error.name === 'AbortError') return;
        setState({ cityId, districts: [] });
      } finally {
        if (controller.signal.aborted) return;
        setLoading(false);
      }
    };

    fetchDistricts();

    return () => controller.abort();
  }, [cityId]);

  const isCurrent = state.cityId === cityId;

  return {
    districts: isCurrent ? state.districts : [],
    loading: loading || (Boolean(cityId) && !isCurrent),
  };
};

const hasRows = (data) => Array.isArray(data) && data.length > 0;

/**
 * Seçilen ilçenin namaz vakitlerini çeken hook
 * - Cache destekli; süresi geçmiş kayıt bugünü içeriyorsa hemen gösterilir,
 *   tazeleme arkada yapılır, bağlantı yoksa kayıt notla ekranda kalır
 * - Retry mekanizmalı
 * - Gece yarısı geçişinde otomatik yeniden fetch
 */
const usePrayerTimes = (districtId) => {
  const [times, setTimes] = useState(null);
  const [nextTimes, setNextTimes] = useState(null);
  const [allTimes, setAllTimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Vakitler kayıtlı listeden geliyor ve tazelenemedi (çevrimdışı)
  const [stale, setStale] = useState(false);
  const lastFetchDateRef = useRef(null);

  const applyRows = useCallback((rows) => {
    const { current, next } = getVisiblePrayerTimes(rows);
    setAllTimes(rows);
    setTimes(current);
    setNextTimes(next);
    return current;
  }, []);

  const fetchTimesData = useCallback(
    async (signal, { silent = false } = {}) => {
      if (!districtId) return;

      setError(null);

      // Önce cache'e bak
      const cached = getCache('times', districtId);
      if (hasRows(cached) && getVisiblePrayerTimes(cached).current) {
        applyRows(cached);
        setStale(false);
        setLoading(false);
        lastFetchDateRef.current = new Date().toDateString();
        return;
      }

      // Süresi geçmiş ama bugünü içeren kayıt hemen gösterilir: bir günün
      // vakitleri sonradan değişmez. Zayıf bağlantıda iskelette yeniden deneme
      // zincirini beklemek yerine tazeleme arkada yapılır.
      const stored = getCache('times', districtId, { allowStale: true });
      const hasStoredToday =
        hasRows(stored) && Boolean(getVisiblePrayerTimes(stored).current);

      if (hasStoredToday) {
        applyRows(stored);
        setLoading(false);
      } else if (!silent) {
        // Sessiz tazelemede ekrandaki vakitler iskelete dönmez
        setLoading(true);
      }

      try {
        const data = await fetchWithRetry(
          `${API_BASE}/vakitler/${districtId}`,
          signal
        );
        if (signal.aborted) return;

        const rows = Array.isArray(data) ? data : [];
        // Yanıt bugünü içermiyorsa ekrandaki kayıtlı vakitler silinmez
        if (hasStoredToday && !getVisiblePrayerTimes(rows).current) return;

        applyRows(rows);
        setStale(false);
        setCache('times', districtId, data);
        lastFetchDateRef.current = new Date().toDateString();
      } catch (err) {
        if (signal.aborted) return;
        // Bağlantı yoksa: kayıtlı vakitler ekranda kalır, notla birlikte
        if (hasStoredToday) {
          setStale(true);
        } else {
          setError(err.message);
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    },
    [districtId, applyRows]
  );

  useEffect(() => {
    if (!districtId) {
      setTimes(null);
      setNextTimes(null);
      setAllTimes([]);
      setLoading(false);
      setError(null);
      setStale(false);
      return;
    }

    const controller = new AbortController();
    fetchTimesData(controller.signal);
    return () => controller.abort();
  }, [districtId, fetchTimesData]);

  // Gün değiştiğinde bugünün vakitlerini güncelle + gece yarısı yeni fetch
  useEffect(() => {
    if (allTimes.length === 0) return;

    const checkDate = () => {
      const today = new Date().toDateString();

      // Gün değişti — mevcut datada bugün var mı kontrol et
      const { current, next } = getVisiblePrayerTimes(allTimes);

      if (current) {
        setTimes(current);
        setNextTimes(next);
      }

      // Gün değiştiyse ve bugünkü veri yoksa, yeniden fetch et
      if (today !== lastFetchDateRef.current && !current) {
        const controller = new AbortController();
        fetchTimesData(controller.signal);
      }
    };

    // Arka plandaki sekmede zamanlayıcılar seyrekleşir; sekmeye dönünce
    // (ör. telefon sahurda açıldığında) beklemeden bugüne geç
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkDate();
    };

    const interval = setInterval(checkDate, 30000);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [allTimes, fetchTimesData]);

  const retryControllerRef = useRef(null);

  const retry = useCallback(() => {
    retryControllerRef.current?.abort();
    retryControllerRef.current = new AbortController();
    fetchTimesData(retryControllerRef.current.signal);
  }, [fetchTimesData]);

  // Bağlantı geri gelince hata ya da kayıtlı veri ekranında kendiliğinden tazele
  useEffect(() => {
    if (!error && !stale) return undefined;

    const handleOnline = () => {
      retryControllerRef.current?.abort();
      retryControllerRef.current = new AbortController();
      fetchTimesData(retryControllerRef.current.signal, { silent: stale });
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [error, stale, fetchTimesData]);

  return { times, nextTimes, allTimes, loading, error, stale, retry };
};

export default usePrayerTimes;
