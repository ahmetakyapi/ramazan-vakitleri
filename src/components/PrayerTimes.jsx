import { useState, useEffect } from 'react';
import { getNextMainPrayer, getNextPrayer } from '../utils/timeUtils';
import { formatDayLabel } from '../utils/prayerData';
import { getKadirGecesiState } from '../utils/ramazan';

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

const PrayerTimes = ({ times, nextTimes, showAllTimes, ramazanInfo }) => {
  const [now, setNow] = useState(() => new Date());

  // Dakika sınırına hizalı: vakitler tam dakikada girer, liste de sayaçla
  // aynı anda sıradaki vakte geçer (eskiden 60 sn'ye kadar geride kalıyordu)
  useEffect(() => {
    if (!times) return undefined;

    let timeout;
    const tick = () => {
      setNow(new Date());
      timeout = setTimeout(tick, 60000 - (Date.now() % 60000) + 20);
    };

    tick();
    return () => clearTimeout(timeout);
  }, [times, nextTimes, showAllTimes]);

  if (!times) {
    return (
      <div className="prayer-times">
        <div className="prayer-loading">Vakitler yükleniyor</div>
      </div>
    );
  }

  const nextPrayer = showAllTimes
    ? getNextPrayer(times, nextTimes, now)
    : getNextMainPrayer(times, nextTimes, now);

  // Günün son vakti geçince liste yarına döner. Eskiden sıradaki imsak yarının,
  // iftar ise bugünün (geçmiş) saatini gösteriyordu; iki gün tek listede
  // karışıyordu.
  const showsTomorrow = Boolean(nextPrayer?.isTomorrow && nextTimes);
  const listTimes = showsTomorrow ? nextTimes : times;

  const prayerOrder = showAllTimes ? allPrayers : mainPrayers;
  const prayerNames = showAllTimes ? prayerNamesAll : prayerNamesSimple;
  const nextIndex = prayerOrder.indexOf(nextPrayer?.key);

  const getPrayerTime = (key) => {
    if (nextPrayer?.isTomorrow && !showsTomorrow && nextPrayer.key === key) {
      return nextPrayer.time;
    }

    return listTimes[key];
  };

  const renderKadirGecesi = () => {
    const state = getKadirGecesiState(ramazanInfo, times, now);
    if (!state) return null;

    return (
      <div className="kadir-gecesi" role="note">
        <div className="kadir-gecesi-icon" aria-hidden="true">✨</div>
        <div className="kadir-gecesi-content">
          <span className="kadir-gecesi-title">
            {state === 'tonight' ? 'Bu Gece Kadir Gecesi' : 'Kadir Gecesi'}
          </span>
          <span className="kadir-gecesi-subtitle">Bin aydan hayırlı gece</span>
        </div>
      </div>
    );
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
          {renderKadirGecesi()}
          <div className="ramazan-badge ramazan-active">
            <div className="ramazan-active-row">
              <span className="ramazan-day">Ramazan&apos;ın {ramazanInfo.day}. Günü</span>
              <span className="ramazan-remaining">
                {ramazanInfo.remaining > 0 ? `${ramazanInfo.remaining} gün kaldı` : 'Son gün'}
              </span>
            </div>
            <span
              className="ramazan-progress"
              role="progressbar"
              aria-label="Ramazan ilerlemesi"
              aria-valuemin={1}
              aria-valuemax={ramazanInfo.length}
              aria-valuenow={ramazanInfo.day}
            >
              <span
                className="ramazan-progress-fill"
                style={{
                  transform: `scaleX(${ramazanInfo.day / ramazanInfo.length})`,
                }}
              />
            </span>
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <div className="prayer-times">
      {showsTomorrow && (
        <p className="list-day">
          Yarın, {formatDayLabel(nextTimes)}
        </p>
      )}
      <ul
        className="prayer-list"
        key={`${showAllTimes ? 'all' : 'main'}-${showsTomorrow ? 'tomorrow' : 'today'}`}
        aria-label={showsTomorrow ? 'Yarının namaz vakitleri' : 'Bugünün namaz vakitleri'}
      >
        {prayerOrder.map((key, index) => {
          const isActive = nextPrayer?.key === key;
          // Bugün geçmiş vakitler sönükleşir; liste yarındaysa hepsi önümüzde
          const isPast =
            Boolean(nextPrayer) &&
            !isActive &&
            !showsTomorrow &&
            (nextPrayer.isTomorrow || index < nextIndex);

          return (
            <li
              key={key}
              className={`prayer-item ${isActive ? 'active' : ''} ${isPast ? 'past' : ''}`}
              aria-current={isActive ? 'true' : undefined}
            >
              <span className="prayer-name">
                {isActive && <span className="prayer-dot" aria-hidden="true" />}
                {prayerNames[key]}
              </span>
              <span className="prayer-time">{getPrayerTime(key)}</span>
            </li>
          );
        })}
      </ul>
      {renderRamazanBadge()}
    </div>
  );
};

export default PrayerTimes;
