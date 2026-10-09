// Zaman yardimci fonksiyonlari

/**
 * Saat string'ini Date objesine cevirir (bugunun tarihiyle)
 * @param {string} timeStr - "HH:MM" formatinda saat
 * @param {Date} referenceDate
 * @returns {Date}
 */
export const parseTimeToDate = (timeStr, referenceDate = new Date()) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date(referenceDate);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

/**
 * Iki tarih arasindaki farki hesaplar
 * @param {Date} targetDate
 * @param {Date} currentDate
 * @returns {Object} { hours, minutes, seconds, total }
 */
export const getTimeDifference = (targetDate, currentDate) => {
  const diff = targetDate.getTime() - currentDate.getTime();

  if (diff <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { hours, minutes, seconds, total: diff };
};

/**
 * Siradaki namaz vaktini bulur
 * @param {Object} times - Namaz vakitleri objesi (ezanvakti API formatı)
 * @param {Object|null} nextDayTimes - Ertesi gunun namaz vakitleri
 * @param {Date} currentDate
 * @returns {Object} { key, name, time, date, isIftar, isSahur }
 */
export const getNextPrayer = (
  times,
  nextDayTimes = null,
  currentDate = new Date()
) => {
  if (!times) return null;

  const prayerOrder = [
    { key: 'Imsak', name: 'İmsak', isIftar: false, isSahur: true },
    { key: 'Gunes', name: 'Güneş', isIftar: false, isSahur: false },
    { key: 'Ogle', name: 'Öğle', isIftar: false, isSahur: false },
    { key: 'Ikindi', name: 'İkindi', isIftar: false, isSahur: false },
    { key: 'Aksam', name: 'Akşam', isIftar: true, isSahur: false },
    { key: 'Yatsi', name: 'Yatsı', isIftar: false, isSahur: false }
  ];

  for (const prayer of prayerOrder) {
    const prayerTime = parseTimeToDate(times[prayer.key], currentDate);
    if (prayerTime > currentDate) {
      return {
        key: prayer.key,
        name: prayer.name,
        time: times[prayer.key],
        date: prayerTime,
        isIftar: prayer.isIftar,
        isSahur: prayer.isSahur
      };
    }
  }

  // Tüm vakitler geçmişse, yarın imsak vakti
  const tomorrowDate = new Date(currentDate);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowImsakValue = nextDayTimes?.Imsak || times.Imsak;
  const tomorrowImsak = parseTimeToDate(tomorrowImsakValue, tomorrowDate);

  return {
    key: 'Imsak',
    name: 'İmsak',
    time: tomorrowImsakValue,
    date: tomorrowImsak,
    isIftar: false,
    isSahur: true,
    isTomorrow: true
  };
};

/**
 * Imsak/Iftar gorunumunde bir sonraki vakti bulur
 * @param {Object} times
 * @param {Object|null} nextDayTimes
 * @param {Date} currentDate
 * @returns {Object|null}
 */
export const getNextMainPrayer = (
  times,
  nextDayTimes = null,
  currentDate = new Date()
) => {
  if (!times) return null;

  const imsakTime = parseTimeToDate(times.Imsak, currentDate);
  const iftarTime = parseTimeToDate(times.Aksam, currentDate);

  if (currentDate < imsakTime) {
    return {
      key: 'Imsak',
      name: 'İmsak',
      time: times.Imsak,
      date: imsakTime,
      isIftar: false,
      isImsak: true,
    };
  }

  if (currentDate < iftarTime) {
    return {
      key: 'Aksam',
      name: 'İftar',
      time: times.Aksam,
      date: iftarTime,
      isIftar: true,
      isImsak: false,
    };
  }

  const tomorrowDate = new Date(currentDate);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowImsakValue = nextDayTimes?.Imsak || times.Imsak;
  const tomorrowImsak = parseTimeToDate(tomorrowImsakValue, tomorrowDate);

  return {
    key: 'Imsak',
    name: 'İmsak',
    time: tomorrowImsakValue,
    date: tomorrowImsak,
    isIftar: false,
    isImsak: true,
    isTomorrow: true,
  };
};

const PRAYER_ORDER = ['Imsak', 'Gunes', 'Ogle', 'Ikindi', 'Aksam', 'Yatsi'];

/**
 * Siradaki vakitten bir onceki vaktin tarihini bulur (ilerleme cubugu icin)
 * @param {Object} next - getNextPrayer / getNextMainPrayer sonucu
 * @param {Object} times
 * @param {boolean} showAllTimes
 * @returns {Date|null}
 */
export const getPreviousPrayerDate = (next, times, showAllTimes) => {
  if (!next || !times) return null;

  const order = showAllTimes ? PRAYER_ORDER : ['Imsak', 'Aksam'];
  const index = order.indexOf(next.key);
  if (index === -1) return null;

  const dayBefore = new Date(next.date);
  dayBefore.setDate(dayBefore.getDate() - 1);

  if (index === 0) {
    return parseTimeToDate(times[order[order.length - 1]], dayBefore);
  }

  return parseTimeToDate(times[order[index - 1]], next.date);
};

/**
 * Iki vakit arasindaki ilerleme orani (0..1)
 */
export const getProgress = (start, end, now = new Date()) => {
  if (!start || !end) return 0;
  const span = end.getTime() - start.getTime();
  if (span <= 0) return 0;
  return Math.min(1, Math.max(0, (now.getTime() - start.getTime()) / span));
};

/**
 * Geri sayim string'i olusturur
 * @param {Object} diff - { hours, minutes, seconds }
 * @returns {string}
 */
export const formatCountdown = (diff) => {
  const { hours, minutes, seconds } = diff;

  if (hours > 0) {
    return `${hours}sa ${minutes}dk`;
  }

  if (minutes > 0) {
    return `${minutes}dk ${seconds}sn`;
  }

  return `${seconds}sn`;
};

/**
 * Tarihi formatlar
 * @param {Date} date
 * @returns {string}
 */
export const formatDate = (date) => {
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  return date.toLocaleDateString('tr-TR', options);
};

export default {
  parseTimeToDate,
  getTimeDifference,
  getNextPrayer,
  getNextMainPrayer,
  formatCountdown,
  formatDate
};
