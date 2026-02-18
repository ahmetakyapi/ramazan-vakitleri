import { useState, useEffect } from 'react';

const API_BASE = 'https://ezanvakti.emushaf.net';
const TURKEY_CODE = '2';

/**
 * Türkiye şehirlerini çeken hook
 */
export const useCities = () => {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCities = async () => {
      try {
        const res = await fetch(`${API_BASE}/sehirler/${TURKEY_CODE}`);
        if (!res.ok) throw new Error('Şehirler yüklenemedi');
        const data = await res.json();
        setCities(data);
      } catch {
        setCities([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCities();
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
      return;
    }

    const fetchDistricts = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/ilceler/${cityId}`);
        if (!res.ok) throw new Error('İlçeler yüklenemedi');
        const data = await res.json();
        setDistricts(data);
      } catch {
        setDistricts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchDistricts();
  }, [cityId]);

  return { districts, loading };
};

/**
 * Seçilen ilçenin namaz vakitlerini çeken hook
 */
const usePrayerTimes = (districtId) => {
  const [times, setTimes] = useState(null);
  const [allTimes, setAllTimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!districtId) return;

    const fetchTimes = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_BASE}/vakitler/${districtId}`);
        if (!res.ok) throw new Error('Vakitler yüklenemedi');
        const data = await res.json();

        setAllTimes(data);

        // Bugünün vakitlerini bul
        const today = new Date();
        const todayStr = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;

        const todayTimes = data.find(d => d.MiladiTarihKisa === todayStr);

        if (todayTimes) {
          setTimes(todayTimes);
        } else if (data.length > 0) {
          // Bugünün verisi yoksa en yakın tarihi bul
          setTimes(data[0]);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTimes();
  }, [districtId]);

  // Gün değiştiğinde bugünün vakitlerini güncelle
  useEffect(() => {
    if (allTimes.length === 0) return;

    const checkDate = () => {
      const today = new Date();
      const todayStr = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
      const todayTimes = allTimes.find(d => d.MiladiTarihKisa === todayStr);
      if (todayTimes) {
        setTimes(todayTimes);
      }
    };

    const interval = setInterval(checkDate, 60000);
    return () => clearInterval(interval);
  }, [allTimes]);

  return { times, loading, error };
};

export default usePrayerTimes;
