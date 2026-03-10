import { useState, useEffect } from 'react';
import {
  getNextMainPrayer,
  getNextPrayer,
  getTimeDifference,
} from '../utils/timeUtils';

const Countdown = ({ times, nextTimes, showAllTimes }) => {
  const [countdown, setCountdown] = useState(null);
  const [nextPrayer, setNextPrayer] = useState(null);

  useEffect(() => {
    if (!times) return;

    const updateCountdown = () => {
      let next;

      if (showAllTimes) {
        next = getNextPrayer(times, nextTimes);
      } else {
        next = getNextMainPrayer(times, nextTimes);
      }

      setNextPrayer(next);

      if (next) {
        const diff = getTimeDifference(next.date, new Date());
        setCountdown(diff);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
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
      const nameMap = {
        'Imsak': 'İmsak',
        'Gunes': 'Güneş',
        'Ogle': 'Öğle',
        'Ikindi': 'İkindi',
        'Aksam': 'Akşam',
        'Yatsi': 'Yatsı'
      };
      const displayName = nameMap[nextPrayer.key] || nextPrayer.name;
      return `${displayName} Vaktine`;
    } else {
      if (nextPrayer.isIftar) {
        return 'İftar Vaktine';
      }
      return 'İmsak Vaktine';
    }
  };

  const formatTime = () => {
    const { hours, minutes, seconds } = countdown;

    if (hours > 0) {
      return (
        <>
          <span className="time-number">{hours}</span>
          <span className="time-unit">sa </span>
          <span className="time-number">{minutes.toString().padStart(2, '0')}</span>
          <span className="time-unit">dk </span>
          <span className="time-number time-seconds">{seconds.toString().padStart(2, '0')}</span>
          <span className="time-unit time-seconds">sn</span>
        </>
      );
    }

    if (minutes > 0) {
      return (
        <>
          <span className="time-number">{minutes}</span>
          <span className="time-unit">dk </span>
          <span className="time-number time-seconds">{seconds.toString().padStart(2, '0')}</span>
          <span className="time-unit time-seconds">sn</span>
        </>
      );
    }

    return (
      <>
        <span className="time-number">{seconds}</span>
        <span className="time-unit">sn</span>
      </>
    );
  };

  return (
    <div className="countdown">
      <div className="countdown-label">{getTitle()}</div>
      <div className="countdown-time">
        {formatTime()}
      </div>
    </div>
  );
};

export default Countdown;
