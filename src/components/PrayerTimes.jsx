import { useState, useEffect } from 'react';
import { getNextMainPrayer, getNextPrayer } from '../utils/timeUtils';

const DAY_IN_MS = 1000 * 60 * 60 * 24;
const RAMADAN_MONTH = 9;
const MAX_LOOKAHEAD_DAYS = 370;

// Intl desteklemezse eski tablo fallback olarak kullanılır.
const FALLBACK_RAMAZAN_DATES = {
  2025: { start: new Date(2025, 2, 1),  end: new Date(2025, 2, 29) },
  2026: { start: new Date(2026, 1, 19), end: new Date(2026, 2, 19) },
  2027: { start: new Date(2027, 1, 8),  end: new Date(2027, 2, 8) },
  2028: { start: new Date(2028, 0, 28), end: new Date(2028, 1, 25) },
  2029: { start: new Date(2029, 0, 16), end: new Date(2029, 1, 13) },
  2030: { start: new Date(2030, 0, 6),  end: new Date(2030, 1, 3) },
};

const hijriFormatter = (() => {
  try {
    return new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
  } catch {
    return null;
  }
})();

const getStartOfDay = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const getHijriDateParts = (date) => {
  if (!hijriFormatter) return null;

  try {
    const parts = hijriFormatter.formatToParts(new Date(date));
    return {
      day: Number(parts.find((part) => part.type === 'day')?.value),
      month: Number(parts.find((part) => part.type === 'month')?.value),
      year: Number(parts.find((part) => part.type === 'year')?.value),
    };
  } catch {
    return null;
  }
};

const addDays = (date, amount) => {
  const value = new Date(date);
  value.setDate(value.getDate() + amount);
  return value;
};

const getRamazanInfoFromIntl = () => {
  const today = getStartOfDay(new Date());
  const hijriToday = getHijriDateParts(today);

  if (!hijriToday) return null;

  if (hijriToday.month === RAMADAN_MONTH) {
    let ramazanEnd = today;

    for (let offset = 1; offset <= 35; offset += 1) {
      const candidate = addDays(today, offset);
      const hijriCandidate = getHijriDateParts(candidate);

      if (!hijriCandidate || hijriCandidate.month !== RAMADAN_MONTH) {
        ramazanEnd = addDays(candidate, -1);
        break;
      }

      ramazanEnd = candidate;
    }

    return {
      type: 'current',
      day: hijriToday.day,
      remaining: Math.max(0, Math.floor((ramazanEnd - today) / DAY_IN_MS)),
      isKadirGecesi: hijriToday.day === 27,
    };
  }

  for (let offset = 1; offset <= MAX_LOOKAHEAD_DAYS; offset += 1) {
    const candidate = addDays(today, offset);
    const hijriCandidate = getHijriDateParts(candidate);

    if (
      hijriCandidate?.month === RAMADAN_MONTH &&
      hijriCandidate?.day === 1
    ) {
      return { type: 'countdown', days: offset };
    }
  }

  return null;
};

const getRamazanInfoFromFallback = () => {
  const today = getStartOfDay(new Date());
  const year = today.getFullYear();

  let ramazan = FALLBACK_RAMAZAN_DATES[year];

  if (ramazan && today > getStartOfDay(ramazan.end)) {
    ramazan = FALLBACK_RAMAZAN_DATES[year + 1];
  }

  if (!ramazan) return null;

  const ramazanStart = getStartOfDay(ramazan.start);
  const ramazanEnd = getStartOfDay(ramazan.end);

  if (today < ramazanStart) {
    return {
      type: 'countdown',
      days: Math.ceil((ramazanStart - today) / DAY_IN_MS),
    };
  }

  if (today <= ramazanEnd) {
    const currentDay = Math.floor((today - ramazanStart) / DAY_IN_MS) + 1;
    return {
      type: 'current',
      day: currentDay,
      remaining: Math.floor((ramazanEnd - today) / DAY_IN_MS),
      isKadirGecesi: currentDay === 27,
    };
  }

  return null;
};

const getRamazanInfo = () =>
  getRamazanInfoFromIntl() || getRamazanInfoFromFallback();

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

const PrayerTimes = ({ times, nextTimes, showAllTimes }) => {
  const [nextPrayer, setNextPrayer] = useState(null);
  const [ramazanInfo, setRamazanInfo] = useState(null);

  useEffect(() => {
    if (!times) return;

    const updateNext = () => {
      const next = showAllTimes
        ? getNextPrayer(times, nextTimes)
        : getNextMainPrayer(times, nextTimes);

      setNextPrayer(next);
    };

    updateNext();
    const interval = setInterval(updateNext, 60000);

    return () => clearInterval(interval);
  }, [times, nextTimes, showAllTimes]);

  useEffect(() => {
    const updateRamazanInfo = () => {
      setRamazanInfo(getRamazanInfo());
    };

    updateRamazanInfo();

    const interval = setInterval(updateRamazanInfo, 60000);
    return () => clearInterval(interval);
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
  const getPrayerTime = (key) => {
    if (nextPrayer?.isTomorrow && nextPrayer.key === key) {
      return nextPrayer.time;
    }

    return times[key];
  };

  const renderRamazanBadge = () => {
    if (!ramazanInfo || showAllTimes) return null;

    if (ramazanInfo.type === 'countdown') {
      return (
        <div className="ramazan-badge">
          <span className="ramazan-text">Ramazan&apos;a kalan süre</span>
          <span className="ramazan-highlight">{ramazanInfo.days}</span>
          <span className="ramazan-text">gün</span>
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
      <ul className="prayer-list" key={showAllTimes ? 'all' : 'main'} aria-label="Namaz vakitleri">
        {prayerOrder.map((key) => (
          <li
            key={key}
            className={`prayer-item ${nextPrayer?.key === key ? 'active' : ''}`}
            aria-current={nextPrayer?.key === key ? 'true' : undefined}
          >
            <span className="prayer-name">{prayerNames[key]}</span>
            <span className="prayer-time">{getPrayerTime(key)}</span>
          </li>
        ))}
      </ul>
      {renderRamazanBadge()}
    </div>
  );
};

export default PrayerTimes;
