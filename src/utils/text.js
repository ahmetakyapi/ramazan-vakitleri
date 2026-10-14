// Türkçe metin yardımcıları

const FOLD_MAP = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
  â: 'a',
  î: 'i',
  û: 'u',
};

/**
 * Aramada harf farkını yok sayar: "kadikoy", "Kadıköy" ve "KADIKÖY" aynı
 * anahtara düşer. Önce Türkçe küçültülür (İ → i, I → ı), sonra işaretler
 * atılır; böylece "Istanbul" yazan da "İSTANBUL"u bulur.
 * @param {string} value
 * @returns {string}
 */
export const foldForSearch = (value = '') =>
  String(value)
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[çğıöşüâîû]/g, (char) => FOLD_MAP[char] || char)
    .replace(/\s+/g, ' ')
    .trim();

/**
 * API'nin büyük harfli adlarını Türkçe başlık düzenine çevirir
 * ("KÜÇÜKÇEKMECE" → "Küçükçekmece", "BÜYÜK ORHAN" → "Büyük Orhan").
 * @param {string} name
 * @returns {string}
 */
export const formatPlaceName = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map((word) => word.charAt(0) + word.slice(1).toLocaleLowerCase('tr-TR'))
    .join(' ');
};
