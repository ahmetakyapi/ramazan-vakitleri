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
  const [countdown, setCountdown] = useState(null);
  const [nextPrayer, setNextPrayer] = useState(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!times) return undefined;

    let timeout;

    const updateCountdown = () => {
      const now = new Date();
      const next = showAllTimes
        ? getNextPrayer(times, nextTimes, now)
        : getNextMainPrayer(times, nextTimes, now);

      setNextPrayer(next);

      if (next) {
        setCountdown(getTimeDifference(next.date, now));
        setProgress(
          getProgress(getPreviousPrayerDate(next, times, showAllTimes), next.date, now)
        );
      }
    };

    // Saniye sınırına hizalı güncelleme: sayaç saatle aynı anda değişir
    const tick = () => {
      updateCountdown();
      timeout = setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };

    tick();

    return () => clearTimeout(timeout);
  }, [times, nextTimes, showAllTimes]);

  if (!nextPrayer || !countdown) {
    return (
      <div className="countdown">
        <div className="countdown-loading">Yükleniyor...</div>
      </div>
    );
  }

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

  const title = getTitle();
  const isFinalMinute = countdown.hours === 0 && countdown.minutes === 0;

  return (
    <div
      className={`countdown ${isFinalMinute ? 'is-final' : ''}`}
      role="timer"
      aria-label={`${title} geri sayım`}
    >
      <div className="countdown-label" key={title}>{title}</div>
      <div className="countdown-time" aria-live="off">
        {formatTime()}
      </div>
      <div
        className="countdown-progress"
        role="progressbar"
        aria-label={`${title} kalan sürenin ilerlemesi`}
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
