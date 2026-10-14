// API satırlarıyla çalışan saf yardımcılar (React'tan bağımsız, testli)

/**
 * Tarihi API'nin "GG.AA.YYYY" biçimine çevirir
 * @param {Date} date
 * @returns {string}
 */
export const formatApiDate = (date) =>
  `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1)
    .toString()
    .padStart(2, '0')}.${date.getFullYear()}`;

/**
 * "GG.AA.YYYY" biçimindeki API tarihini yerel gece yarısına çevirir
 * @param {string} value
 * @returns {Date|null}
 */
export const parseApiDate = (value) => {
  if (typeof value !== 'string') return null;
  const [day, month, year] = value.split('.').map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
};

/**
 * Bugünün ve yarının vakit satırlarını bulur.
 *
 * Bugün listede yoksa `current` null döner: eskiden ilk satıra düşülüyordu ve
 * eski bir önbellek (ya da 32 günlük verinin sonu) geçmiş bir günün vakitlerini
 * bugünkü gibi gösteriyordu. null, çağıranı yeniden veri çekmeye yönlendirir.
 *
 * @param {Array} data - API'nin vakit listesi
 * @param {Date} currentDate
 * @returns {{ current: Object|null, next: Object|null }}
 */
export const getVisiblePrayerTimes = (data, currentDate = new Date()) => {
  if (!Array.isArray(data) || data.length === 0) {
    return { current: null, next: null };
  }

  const currentIndex = data.findIndex(
    (item) => item?.MiladiTarihKisa === formatApiDate(currentDate)
  );

  if (currentIndex === -1) {
    return { current: null, next: null };
  }

  return {
    current: data[currentIndex],
    next: data[currentIndex + 1] || null,
  };
};

// API günü iki haneli yazar ("09 Ekim"); Türkçe tarihte baştaki sıfır yok
const trimLeadingZero = (value) => value.trim().replace(/^0(\d)/, '$1');

/**
 * "09 Ekim 2026 Cuma" → "9 Ekim Cuma" (yıl tarih satırında kalabalık)
 * @param {Object} row - API vakit satırı
 * @returns {string}
 */
export const formatDayLabel = (row) => {
  const long = row?.MiladiTarihUzun;
  if (typeof long === 'string' && long.trim()) {
    return trimLeadingZero(long.replace(/\s\d{4}\b/, ''));
  }

  const date = parseApiDate(row?.MiladiTarihKisa);
  if (!date) return '';

  return date.toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    weekday: 'long',
  });
};

/**
 * "03 Cemaziyelevvel 1448" → "3 Cemaziyelevvel 1448"
 * @param {Object} row - API vakit satırı
 * @returns {string}
 */
export const formatHijriLabel = (row) => {
  const long = row?.HicriTarihUzun;
  return typeof long === 'string' ? trimLeadingZero(long) : '';
};
