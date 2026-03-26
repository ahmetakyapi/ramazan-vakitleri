import { useState, useEffect, useCallback, useRef } from 'react';
import { augmentDistricts } from '../utils/istanbulDistricts';
import { getCache, setCache } from '../utils/apiCache';

const API_BASE = 'https://ezanvakti.emushaf.net';
const TURKEY_CODE = '2';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 5000, 10000];

const formatApiDate = (date) =>
  `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}.${date.getFullYear()}`;

const getVisiblePrayerTimes = (data, currentDate = new Date()) => {
  if (!Array.isArray(data) || data.length === 0) {
    return { current: null, next: null };
  }

  const currentIndex = data.findIndex(
    (item) => item.MiladiTarihKisa === formatApiDate(currentDate)
  );

  const safeIndex = currentIndex >= 0 ? currentIndex : 0;

  return {
    current: data[safeIndex] || null,
    next: data[safeIndex + 1] || null,
  };
};

const fetchWithRetry = async (url, signal, retries = MAX_RETRIES) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      if (attempt === retries) throw err;
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
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cityId) {
      setDistricts([]);
      setLoading(false);
      return;
    }

    const cached = getCache('districts', cityId);
    if (cached && cached.length > 0) {
      setDistricts(cached);
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
        setDistricts(augmented);
        setCache('districts', cityId, augmented);
      } catch (error) {
        if (error.name === 'AbortError') return;
        setDistricts([]);
      } finally {
        if (controller.signal.aborted) return;
        setLoading(false);
      }
    };

    fetchDistricts();

    return () => controller.abort();
  }, [cityId]);

  return { districts, loading };
};

/**
 * Seçilen ilçenin namaz vakitlerini çeken hook
 * - Cache destekli
 * - Retry mekanizmalı
 * - Gece yarısı geçişinde otomatik yeniden fetch
 */
const usePrayerTimes = (districtId) => {
  const [times, setTimes] = useState(null);
  const [nextTimes, setNextTimes] = useState(null);
  const [allTimes, setAllTimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const lastFetchDateRef = useRef(null);

  const fetchTimesData = useCallback(
    async (signal) => {
      if (!districtId) return;

      setLoading(true);
      setError(null);

      // Önce cache'e bak
      const cached = getCache('times', districtId);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        const { current, next } = getVisiblePrayerTimes(cached);
        if (current) {
          setAllTimes(cached);
          setTimes(current);
          setNextTimes(next);
          setLoading(false);
          lastFetchDateRef.current = new Date().toDateString();
          return;
        }
      }

      try {
        const data = await fetchWithRetry(
          `${API_BASE}/vakitler/${districtId}`,
          signal
        );
        if (signal.aborted) return;

        const { current, next } = getVisiblePrayerTimes(data);
        setAllTimes(data);
        setTimes(current);
        setNextTimes(next);
        setCache('times', districtId, data);
        lastFetchDateRef.current = new Date().toDateString();
      } catch (err) {
        if (err.name === 'AbortError') return;
        // Hata durumunda cache'den göstermeye çalış
        if (cached && Array.isArray(cached) && cached.length > 0) {
          const { current, next } = getVisiblePrayerTimes(cached);
          setAllTimes(cached);
          setTimes(current);
          setNextTimes(next);
        } else {
          setError(err.message);
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    },
    [districtId]
  );

  useEffect(() => {
    if (!districtId) {
      setTimes(null);
      setNextTimes(null);
      setAllTimes([]);
      setLoading(false);
      setError(null);
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

    const interval = setInterval(checkDate, 30000);
    return () => clearInterval(interval);
  }, [allTimes, fetchTimesData]);

  const retryControllerRef = useRef(null);

  const retry = useCallback(() => {
    retryControllerRef.current?.abort();
    retryControllerRef.current = new AbortController();
    fetchTimesData(retryControllerRef.current.signal);
  }, [fetchTimesData]);

  return { times, nextTimes, loading, error, retry };
};

export default usePrayerTimes;
