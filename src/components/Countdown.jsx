import { useState, useEffect } from 'react';
import {
  getNextMainPrayer,
  getNextPrayer,
  getPreviousPrayerDate,
  getProgress,
  getTimeDifference,
} from '../utils/timeUtils';

const NAME_MAP = {
  Imsak: 'İmsak',
  Gunes: 'Güneş',
  Ogle: 'Öğle',
  Ikindi: 'İkindi',
  Aksam: 'Akşam',
  Yatsi: 'Yatsı',
};

// Değeri değişen sayı yeniden mount edilir ve yumuşakça yerine oturur
const Num = ({ value, className = '' }) => (
  <span key={value} className={`time-number ${className}`}>
    {value}
  </span>
);

const Countdown = ({ times, nextTimes, showAllTimes }) => {
  // Değerler her saniye `now` üstünden hesaplanır; ilk çizimde de hazırdır
  // (eskiden ilk karede "Yükleniyor" yazıp sonra sayaca zıplıyordu)
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!times) return undefined;

    let timeout;

    // Saniye sınırına hizalı güncelleme: sayaç saatle aynı anda değişir
    const tick = () => {
      setNow(new Date());
      timeout = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };

    tick();

    return () => clearTimeout(timeout);
  }, [times, nextTimes, showAllTimes]);

  const nextPrayer = times
    ? showAllTimes
      ? getNextPrayer(times, nextTimes, now)
      : getNextMainPrayer(times, nextTimes, now)
    : null;

  if (!nextPrayer) {
    return (
      <div className="countdown">
        <div className="countdown-loading">Yükleniyor</div>
      </div>
    );
  }

  const countdown = getTimeDifference(nextPrayer.date, now);
  const progress = getProgress(
    getPreviousPrayerDate(nextPrayer, times, showAllTimes),
    nextPrayer.date,
    now
  );

  const getTitle = () => {
    if (showAllTimes) {
      return `${NAME_MAP[nextPrayer.key] || nextPrayer.name} Vaktine`;
    }
    return nextPrayer.isIftar ? 'İftar Vaktine' : 'İmsak Vaktine';
  };

  const formatTime = () => {
    const { hours, minutes, seconds } = countdown;
    const mm = minutes.toString().padStart(2, '0');
    const ss = seconds.toString().padStart(2, '0');

    if (hours > 0) {
      return (
        <>
          <Num value={hours} />
          <span className="time-unit">sa </span>
          <Num value={mm} />
          <span className="time-unit">dk </span>
          <Num value={ss} className="time-seconds" />
          <span className="time-unit time-seconds">sn</span>
        </>
      );
    }

    if (minutes > 0) {
      return (
        <>
          <Num value={minutes} />
          <span className="time-unit">dk </span>
          <Num value={ss} className="time-seconds" />
          <span className="time-unit time-seconds">sn</span>
        </>
      );
    }

    return (
      <>
        <Num value={seconds} />
        <span className="time-unit">sn</span>
      </>
    );
  };

  // Ekran okuyucu için tek cümle: "İftar vaktine 2 saat 6 dakika"
  const spokenTime = () => {
    const { hours, minutes, seconds } = countdown;
    const parts = [];
    if (hours > 0) parts.push(`${hours} saat`);
    if (minutes > 0) parts.push(`${minutes} dakika`);
    if (hours === 0 && minutes === 0) parts.push(`${seconds} saniye`);
    return parts.join(' ');
  };

  const title = getTitle();
  const isFinalMinute = countdown.hours === 0 && countdown.minutes === 0;

  return (
    <div
      className={`countdown ${isFinalMinute ? 'is-final' : ''}`}
      role="timer"
      aria-label={`${title} ${spokenTime()}`}
    >
      <div className="countdown-label" key={title} aria-hidden="true">{title}</div>
      <div className="countdown-time" aria-hidden="true">
        {formatTime()}
      </div>
      <div
        className="countdown-progress"
        role="progressbar"
        aria-label={`${title} geçen sürenin oranı`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <span
          className="countdown-progress-fill"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </div>
  );
};

export default Countdown;
