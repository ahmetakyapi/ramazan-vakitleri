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
        // İmsak & İftar: Sadece bu ikisi arasında geçiş yap
        next = getNextImsakOrIftar(times);
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

  // İmsak veya İftar'a kalan süreyi hesapla
  const getNextImsakOrIftar = (times) => {
    const now = new Date();

    // İmsak (Fajr) ve İftar (Maghrib) vakitlerini al
    const imsakTime = parseTimeToDate(times.Fajr);
    const iftarTime = parseTimeToDate(times.Maghrib);

    // Şuanki zamana göre sıradaki vakti belirle
    if (now < imsakTime) {
      // İmsak henüz olmadı
      return {
        key: 'Fajr',
        name: 'İmsak',
        time: times.Fajr,
        date: imsakTime,
        isIftar: false,
        isImsak: true
      };
    } else if (now < iftarTime) {
      // İmsak geçti, İftar'a kadar bekle
      return {
        key: 'Maghrib',
        name: 'İftar',
        time: times.Maghrib,
        date: iftarTime,
        isIftar: true,
        isImsak: false
      };
    } else {
      // İftar da geçti, yarının İmsak'ına kadar bekle
      const tomorrowImsak = parseTimeToDate(times.Fajr);
      tomorrowImsak.setDate(tomorrowImsak.getDate() + 1);
      return {
        key: 'Fajr',
        name: 'İmsak',
        time: times.Fajr,
        date: tomorrowImsak,
        isIftar: false,
        isImsak: true,
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
      // İmsak & İftar modunda
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
