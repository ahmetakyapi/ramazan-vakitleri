import { useState, useEffect } from 'react';

/**
 * Aladhan API'den namaz vakitlerini ceken hook
 * @param {number} lat - Enlem
 * @param {number} lng - Boylam
 * @param {Date} date - Tarih (opsiyonel)
 */
const usePrayerTimes = (lat, lng, date = new Date()) => {
  const [times, setTimes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTimes = async () => {
      if (!lat || !lng) return;

      setLoading(true);
      setError(null);

      try {
        // Unix timestamp (saniye cinsinden)
        const timestamp = Math.floor(date.getTime() / 1000);

        const url = `https://api.aladhan.com/v1/timings/${timestamp}?latitude=${lat}&longitude=${lng}&method=13`;

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error('API yanit vermedi');
        }

        const data = await response.json();

        if (data.code !== 200 || !data.data) {
          throw new Error('Gecersiz API yaniti');
        }

        setTimes(data.data.timings);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTimes();
  }, [lat, lng, date.toDateString()]);

  return { times, loading, error };
};

export default usePrayerTimes;
