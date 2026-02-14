import { useState, useEffect } from 'react';
import { getNextPrayer, getTimeDifference, parseTimeToDate } from '../utils/timeUtils';

const Countdown = ({ times, showAllTimes }) => {
  const [countdown, setCountdown] = useState(null);
  const [nextPrayer, setNextPrayer] = useState(null);

  useEffect(() => {
    if (!times) return;

    const updateCountdown = () => {
      let next;

      if (showAllTimes) {
        // Tüm Vakitler: Sıradaki herhangi bir vakti göster
        next = getNextPrayer(times);
      } else {
        // Sahur & İftar: Sadece bu ikisi arasında geçiş yap
        next = getNextSahurOrIftar(times);
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
  }, [times, showAllTimes]);

  // Sahur veya İftar'a kalan süreyi hesapla
  const getNextSahurOrIftar = (times) => {
    const now = new Date();

    // Sahur (Fajr) ve İftar (Maghrib) vakitlerini al
    const sahurTime = parseTimeToDate(times.Fajr);
    const iftarTime = parseTimeToDate(times.Maghrib);

    // Şuanki zamana göre sıradaki vakti belirle
    if (now < sahurTime) {
      // Sahur henüz olmadı
      return {
        key: 'Fajr',
        name: 'Sahur',
        time: times.Fajr,
        date: sahurTime,
        isIftar: false,
        isSahur: true
      };
    } else if (now < iftarTime) {
      // Sahur geçti, İftar'a kadar bekle
      return {
        key: 'Maghrib',
        name: 'İftar',
        time: times.Maghrib,
        date: iftarTime,
        isIftar: true,
        isSahur: false
      };
    } else {
      // İftar da geçti, yarının Sahur'una kadar bekle
      const tomorrowSahur = parseTimeToDate(times.Fajr);
      tomorrowSahur.setDate(tomorrowSahur.getDate() + 1);
      return {
        key: 'Fajr',
        name: 'Sahur',
        time: times.Fajr,
        date: tomorrowSahur,
        isIftar: false,
        isSahur: true,
        isTomorrow: true
      };
    }
  };

  if (!nextPrayer || !countdown) {
    return (
      <div className="countdown">
        <div className="countdown-loading">Yükleniyor...</div>
      </div>
    );
  }

  const getTitle = () => {
    if (showAllTimes) {
      // Tüm vakitler modunda geleneksel isimler
      const nameMap = {
        'Fajr': 'İmsak',
        'Sunrise': 'Güneş',
        'Dhuhr': 'Öğle',
        'Asr': 'İkindi',
        'Maghrib': 'Akşam',
        'Isha': 'Yatsı'
      };
      const displayName = nameMap[nextPrayer.key] || nextPrayer.name;
      return `${displayName} Vaktine`;
    } else {
      // Sahur & İftar modunda
      if (nextPrayer.isIftar) {
        return 'İftar Vaktine';
      }
      return 'Sahur Vaktine';
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
          <span className="time-unit">dk</span>
        </>
      );
    }

    if (minutes > 0) {
      return (
        <>
          <span className="time-number">{minutes}</span>
          <span className="time-unit">dk </span>
          <span className="time-number">{seconds.toString().padStart(2, '0')}</span>
          <span className="time-unit">sn</span>
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
