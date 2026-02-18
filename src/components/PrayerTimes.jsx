import { useState, useEffect } from 'react';
import { getNextPrayer } from '../utils/timeUtils';

// Ramazan tarihleri (Diyanet İşleri Başkanlığı verileri)
const RAMAZAN_DATES = {
  2025: { start: new Date(2025, 2, 1),  end: new Date(2025, 2, 29) },
  2026: { start: new Date(2026, 1, 19), end: new Date(2026, 2, 19) },
  2027: { start: new Date(2027, 1, 8),  end: new Date(2027, 2, 8) },
  2028: { start: new Date(2028, 0, 28), end: new Date(2028, 1, 25) },
  2029: { start: new Date(2029, 0, 16), end: new Date(2029, 1, 13) },
  2030: { start: new Date(2030, 0, 6),  end: new Date(2030, 1, 3) },
};

const getRamazanInfo = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = today.getFullYear();

  let ramazan = RAMAZAN_DATES[year];

  if (ramazan && today > ramazan.end) {
    ramazan = RAMAZAN_DATES[year + 1];
  }

  if (!ramazan) return null;

  if (today < ramazan.start) {
    const diffTime = ramazan.start - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return { type: 'countdown', days: diffDays };
  } else if (today >= ramazan.start && today <= ramazan.end) {
    const diffTime = today - ramazan.start;
    const currentDay = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
    const remainingTime = ramazan.end - today;
    const remainingDays = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
    const isKadirGecesi = currentDay === 27;
    return { type: 'current', day: currentDay, remaining: remainingDays, isKadirGecesi };
  }

  return null;
};

const prayerNamesSimple = {
  Imsak: 'İmsak',
  Aksam: 'İftar'
};

const prayerNamesAll = {
  Imsak: 'İmsak',
  Gunes: 'Güneş',
  Ogle: 'Öğle',
  Ikindi: 'İkindi',
  Aksam: 'Akşam',
  Yatsi: 'Yatsı'
};

const allPrayers = ['Imsak', 'Gunes', 'Ogle', 'Ikindi', 'Aksam', 'Yatsi'];
const mainPrayers = ['Imsak', 'Aksam'];

const PrayerTimes = ({ times, showAllTimes }) => {
  const [nextPrayerKey, setNextPrayerKey] = useState(null);
  const [ramazanInfo, setRamazanInfo] = useState(null);

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

  useEffect(() => {
    setRamazanInfo(getRamazanInfo());
  }, []);

  if (!times) {
    return (
      <div className="prayer-times">
        <div className="prayer-loading">Vakitler yükleniyor...</div>
      </div>
    );
  }

  const prayerOrder = showAllTimes ? allPrayers : mainPrayers;
  const prayerNames = showAllTimes ? prayerNamesAll : prayerNamesSimple;

  const renderRamazanBadge = () => {
    if (!ramazanInfo || showAllTimes) return null;

    if (ramazanInfo.type === 'countdown') {
      return (
        <div className="ramazan-badge">
          <span className="ramazan-text">Ramazan'a</span>
          <span className="ramazan-highlight">{ramazanInfo.days}</span>
          <span className="ramazan-text">gün kaldı</span>
        </div>
      );
    }

    if (ramazanInfo.type === 'current') {
      return (
        <>
          {ramazanInfo.isKadirGecesi && (
            <div className="kadir-gecesi">
              <div className="kadir-gecesi-icon">✨</div>
              <div className="kadir-gecesi-content">
                <span className="kadir-gecesi-title">Kadir Gecesi</span>
                <span className="kadir-gecesi-subtitle">Bin aydan hayırlı gece</span>
              </div>
            </div>
          )}
          <div className="ramazan-badge ramazan-active">
            <span className="ramazan-day">{ramazanInfo.day}. Gün</span>
            {ramazanInfo.remaining > 0 && (
              <span className="ramazan-remaining">{ramazanInfo.remaining} gün kaldı</span>
            )}
          </div>
        </>
      );
    }

    return null;
  };

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
      {renderRamazanBadge()}
    </div>
  );
};

export default PrayerTimes;
