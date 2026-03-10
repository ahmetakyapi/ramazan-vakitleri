import { useState, useEffect } from 'react';
import { augmentDistricts } from '../utils/istanbulDistricts';

const API_BASE = 'https://ezanvakti.emushaf.net';
const TURKEY_CODE = '2';

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

/**
 * Türkiye şehirlerini çeken hook
 */
export const useCities = () => {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const fetchCities = async () => {
      try {
        const res = await fetch(`${API_BASE}/sehirler/${TURKEY_CODE}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('Şehirler yüklenemedi');
        const data = await res.json();
        if (controller.signal.aborted) return;
        setCities(data);
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
 * Seçilen şehrin ilçelerini çeken hook
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

    const controller = new AbortController();

    const fetchDistricts = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/ilceler/${cityId}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('İlçeler yüklenemedi');
        const data = await res.json();
        if (controller.signal.aborted) return;
        setDistricts(augmentDistricts(cityId, data));
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
 */
const usePrayerTimes = (districtId) => {
  const [times, setTimes] = useState(null);
  const [nextTimes, setNextTimes] = useState(null);
  const [allTimes, setAllTimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

    const fetchTimes = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE}/vakitler/${districtId}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('Vakitler yüklenemedi');
        const data = await res.json();
        if (controller.signal.aborted) return;

        const { current, next } = getVisiblePrayerTimes(data);
        setAllTimes(data);
        setTimes(current);
        setNextTimes(next);
      } catch (err) {
        if (err.name === 'AbortError') return;
        setError(err.message);
      } finally {
        if (controller.signal.aborted) return;
        setLoading(false);
      }
    };

    fetchTimes();

    return () => controller.abort();
  }, [districtId]);

  // Gün değiştiğinde bugünün vakitlerini güncelle
  useEffect(() => {
    if (allTimes.length === 0) return;

    const checkDate = () => {
      const { current, next } = getVisiblePrayerTimes(allTimes);
      setTimes(current);
      setNextTimes(next);
    };

    const interval = setInterval(checkDate, 60000);
    return () => clearInterval(interval);
  }, [allTimes]);

  return { times, nextTimes, loading, error };
};

export default usePrayerTimes;
