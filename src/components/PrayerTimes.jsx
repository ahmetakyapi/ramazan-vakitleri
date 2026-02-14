import { useState, useEffect } from 'react';
import { getNextPrayer } from '../utils/timeUtils';

const prayerNamesSimple = {
  Fajr: 'Sahur',
  Maghrib: 'İftar'
};

const prayerNamesAll = {
  Fajr: 'İmsak',
  Sunrise: 'Güneş',
  Dhuhr: 'Öğle',
  Asr: 'İkindi',
  Maghrib: 'Akşam',
  Isha: 'Yatsı'
};

const allPrayers = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const mainPrayers = ['Fajr', 'Maghrib'];

const PrayerTimes = ({ times, showAllTimes }) => {
  const [nextPrayerKey, setNextPrayerKey] = useState(null);

  useEffect(() => {
    if (!times) return;

    const updateNext = () => {
      const next = getNextPrayer(times);
      setNextPrayerKey(next?.key || null);
    };

    updateNext();
    const interval = setInterval(updateNext, 60000);

    return () => clearInterval(interval);
  }, [times]);

  if (!times) {
    return (
      <div className="prayer-times">
        <div className="prayer-loading">Vakitler yükleniyor...</div>
      </div>
    );
  }

  const prayerOrder = showAllTimes ? allPrayers : mainPrayers;
  const prayerNames = showAllTimes ? prayerNamesAll : prayerNamesSimple;

  return (
    <div className="prayer-times">
      <ul className="prayer-list">
        {prayerOrder.map((key) => (
          <li
            key={key}
            className={`prayer-item ${nextPrayerKey === key ? 'active' : ''}`}
          >
            <span className="prayer-name">{prayerNames[key]}</span>
            <span className="prayer-time">{times[key]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PrayerTimes;
