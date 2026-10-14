// Ramazan takvimi
//
// Bugünün hicri tarihi Diyanet'ten, API satırının HicriTarihKisa alanından
// okunur. Intl'in Umm al-Qura takvimi Diyanet'ten bir gün ayrılabiliyor:
// 2026'da Ramazan Diyanet'te 19 Şubat'ta, Umm al-Qura'da 18 Şubat'ta başladı ve
// uygulama ilk oruç gününü "2. Gün" gösteriyordu. Intl yalnızca API'nin
// kapsamadığı uzak tarihleri (Ramazan'a kalan gün, ayın uzunluğu) tahmin eder;
// aradaki gün farkı bugünün iki tarihinden ölçülüp düzeltilir.

import { parseApiDate } from './prayerData.js';
import { parseTimeToDate } from './timeUtils.js';

const RAMADAN = 9;
const SHAWWAL = 10;
const DAY_IN_MS = 1000 * 60 * 60 * 24;
const MAX_LOOKAHEAD_DAYS = 370;

// Intl de yoksa son çare. 2025 ve 2026 Diyanet'in ilan ettiği tarihler,
// sonrası tahmin.
const FALLBACK_RAMAZAN_DATES = {
  2025: { start: new Date(2025, 2, 1), end: new Date(2025, 2, 29) },
  2026: { start: new Date(2026, 1, 19), end: new Date(2026, 2, 19) },
  2027: { start: new Date(2027, 1, 8), end: new Date(2027, 2, 8) },
  2028: { start: new Date(2028, 0, 28), end: new Date(2028, 1, 25) },
  2029: { start: new Date(2029, 0, 16), end: new Date(2029, 1, 13) },
  2030: { start: new Date(2030, 0, 6), end: new Date(2030, 1, 3) },
};

const startOfDay = (date) => {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
};

const addDays = (date, amount) => {
  const value = new Date(date);
  value.setDate(value.getDate() + amount);
  return value;
};

const daysBetween = (from, to) =>
  Math.round((startOfDay(to) - startOfDay(from)) / DAY_IN_MS);

/**
 * Diyanet'in "G.A.YYYY" hicri tarihini çözer ("3.5.1448" → 3 Cemaziyelevvel)
 * @param {string} value
 * @returns {{ day: number, month: number, year: number }|null}
 */
export const parseHijri = (value) => {
  if (typeof value !== 'string') return null;
  const [day, month, year] = value.split('.').map(Number);
  if (!day || !month || !year) return null;
  return { day, month, year };
};

const intlFormatter = (() => {
  try {
    const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
    // Takvimi tanımayan motor sessizce miladiye düşer; o zaman hiç kullanma
    return formatter.resolvedOptions().calendar === 'islamic-umalqura'
      ? formatter
      : null;
  } catch {
    return null;
  }
})();

const getIntlHijri = (date) => {
  if (!intlFormatter) return null;

  try {
    const parts = intlFormatter.formatToParts(date);
    const read = (type) => Number(parts.find((part) => part.type === type)?.value);
    const value = { day: read('day'), month: read('month'), year: read('year') };
    return value.day && value.month ? value : null;
  } catch {
    return null;
  }
};

// Intl, Diyanet'ten kaç gün ileride: Intl'in (bugün − fark) için verdiği tarih
// Diyanet'in bugününe eşitse fark odur. Diyanet tarihi = Intl tarihi + fark.
const getIntlShift = (today, diyanetHijri) => {
  if (!diyanetHijri) return 0;

  for (const shift of [0, 1, -1, 2, -2]) {
    const probe = getIntlHijri(addDays(today, -shift));
    if (probe?.day === diyanetHijri.day && probe?.month === diyanetHijri.month) {
      return shift;
    }
  }

  return 0;
};

const toDatedRows = (rows) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      date: parseApiDate(row?.MiladiTarihKisa),
      hijri: parseHijri(row?.HicriTarihKisa),
    }))
    .filter((row) => row.date && row.hijri);

// Ramazan'ın kaçıncı günde biteceği: önce API'de Şevval'in ilk günü, sonra
// Ramazan'ın 30'u aranır; ikisi de yoksa Umm al-Qura'daki ay uzunluğu.
const getRamadanLength = (hijri, datedRows, today) => {
  const shawwal = datedRows.find(
    (row) => row.hijri.month === SHAWWAL && row.hijri.day === 1 && row.date > today
  );
  if (shawwal) return hijri.day + daysBetween(today, shawwal.date) - 1;

  if (datedRows.some((row) => row.hijri.month === RAMADAN && row.hijri.day === 30)) {
    return 30;
  }

  let longest = 0;
  for (let offset = -3; offset <= 35; offset += 1) {
    const intl = getIntlHijri(addDays(today, offset));
    if (intl?.month === RAMADAN) longest = Math.max(longest, intl.day);
  }

  return Math.max(hijri.day, longest || 30);
};

const getInfoFromDiyanet = (hijri, rows, today) => {
  const datedRows = toDatedRows(rows);

  if (hijri.month === RAMADAN) {
    const length = getRamadanLength(hijri, datedRows, today);
    return {
      type: 'current',
      day: hijri.day,
      length,
      remaining: Math.max(0, length - hijri.day),
    };
  }

  const firstDay = datedRows.find(
    (row) => row.hijri.month === RAMADAN && row.hijri.day === 1 && row.date > today
  );
  if (firstDay) {
    return { type: 'countdown', days: daysBetween(today, firstDay.date) };
  }

  if (!intlFormatter) return null;

  const shift = getIntlShift(today, hijri);
  for (let offset = -3; offset <= MAX_LOOKAHEAD_DAYS; offset += 1) {
    const days = offset + shift;
    if (days < 1) continue;

    const intl = getIntlHijri(addDays(today, offset));
    if (intl?.month === RAMADAN && intl?.day === 1) {
      return { type: 'countdown', days };
    }
  }

  return null;
};

// API'de hicri tarih yoksa: yalnız Umm al-Qura
const getInfoFromIntl = (today) => {
  const hijriToday = getIntlHijri(today);
  if (!hijriToday) return null;

  if (hijriToday.month === RAMADAN) {
    let lastDay = hijriToday.day;
    for (let offset = 1; offset <= 30; offset += 1) {
      const candidate = getIntlHijri(addDays(today, offset));
      if (candidate?.month !== RAMADAN) break;
      lastDay = candidate.day;
    }

    return {
      type: 'current',
      day: hijriToday.day,
      length: lastDay,
      remaining: lastDay - hijriToday.day,
    };
  }

  for (let offset = 1; offset <= MAX_LOOKAHEAD_DAYS; offset += 1) {
    const candidate = getIntlHijri(addDays(today, offset));
    if (candidate?.month === RAMADAN && candidate?.day === 1) {
      return { type: 'countdown', days: offset };
    }
  }

  return null;
};

const getInfoFromFallback = (today) => {
  const year = today.getFullYear();
  let ramazan = FALLBACK_RAMAZAN_DATES[year];

  if (ramazan && today > startOfDay(ramazan.end)) {
    ramazan = FALLBACK_RAMAZAN_DATES[year + 1];
  }

  if (!ramazan) return null;

  const start = startOfDay(ramazan.start);
  const end = startOfDay(ramazan.end);

  if (today < start) {
    return { type: 'countdown', days: daysBetween(today, start) };
  }

  const length = daysBetween(start, end) + 1;
  const day = daysBetween(start, today) + 1;
  return { type: 'current', day, length, remaining: length - day };
};

/**
 * Ramazan durumu: içindeysek kaçıncı gün ve kalan gün, değilsek kaç gün kaldı.
 *
 * @param {Object} params
 * @param {Object|null} params.today - bugünün API satırı (HicriTarihKisa)
 * @param {Array} params.rows - API'nin tüm satırları (ileriye bakmak için)
 * @param {Date} params.now
 * @returns {{ type: 'current', day: number, length: number, remaining: number }
 *   | { type: 'countdown', days: number } | null}
 */
export const getRamazanInfo = ({ today = null, rows = [], now = new Date() } = {}) => {
  const day = startOfDay(now);
  const hijri = parseHijri(today?.HicriTarihKisa);

  return (
    (hijri && getInfoFromDiyanet(hijri, rows, day)) ||
    getInfoFromIntl(day) ||
    getInfoFromFallback(day)
  );
};

/**
 * Kadir Gecesi, Ramazan'ın 26'sını 27'sine bağlayan gecedir. Diyanet de onu
 * 26 Ramazan'ın miladi tarihiyle ilan eder (2025: 1 Mart başlangıç, Kadir
 * Gecesi 26 Mart). Eskiden 27. gün gösteriliyordu; o gün gece çoktan bitmişti.
 *
 * @returns {'tonight'|'now'|null} - akşamdan önce 'tonight', gece boyunca 'now'
 */
export const getKadirGecesiState = (info, times, now = new Date()) => {
  if (info?.type !== 'current' || !times) return null;

  if (info.day === 26 && times.Aksam) {
    return now >= parseTimeToDate(times.Aksam, now) ? 'now' : 'tonight';
  }

  if (info.day === 27 && times.Imsak && now < parseTimeToDate(times.Imsak, now)) {
    return 'now';
  }

  return null;
};
