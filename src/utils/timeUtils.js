// Zaman yardimci fonksiyonlari

/**
 * Saat string'ini Date objesine cevirir (bugunun tarihiyle)
 * @param {string} timeStr - "HH:MM" formatinda saat
 * @returns {Date}
 */
export const parseTimeToDate = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
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
 * @returns {Object} { key, name, time, date, isIftar, isSahur }
 */
export const getNextPrayer = (times) => {
  if (!times) return null;

  const now = new Date();
  const prayerOrder = [
    { key: 'Imsak', name: 'İmsak', isIftar: false, isSahur: true },
    { key: 'Gunes', name: 'Güneş', isIftar: false, isSahur: false },
    { key: 'Ogle', name: 'Öğle', isIftar: false, isSahur: false },
    { key: 'Ikindi', name: 'İkindi', isIftar: false, isSahur: false },
    { key: 'Aksam', name: 'Akşam', isIftar: true, isSahur: false },
    { key: 'Yatsi', name: 'Yatsı', isIftar: false, isSahur: false }
  ];

  for (const prayer of prayerOrder) {
    const prayerTime = parseTimeToDate(times[prayer.key]);
    if (prayerTime > now) {
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
  const tomorrowImsak = parseTimeToDate(times.Imsak);
  tomorrowImsak.setDate(tomorrowImsak.getDate() + 1);

  return {
    key: 'Imsak',
    name: 'İmsak',
    time: times.Imsak,
    date: tomorrowImsak,
    isIftar: false,
    isSahur: true,
    isTomorrow: true
  };
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
  formatCountdown,
  formatDate
};
