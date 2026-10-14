const CACHE_PREFIX = 'ramazan-cache-';
const CACHE_DURATION = {
  cities: 24 * 60 * 60 * 1000,    // 24 saat
  districts: 24 * 60 * 60 * 1000, // 24 saat
  times: 6 * 60 * 60 * 1000,      // 6 saat
};

const getCacheKey = (type, id) => `${CACHE_PREFIX}${type}-${id || 'all'}`;

/**
 * Önbellekten okur. Süresi geçen kayıt silinmez: bağlantı yokken
 * `allowStale` ile yine okunabilsin diye (vakit listesi 30 günü kapsıyor,
 * birkaç günlük kayıt bugünü hâlâ içerir). Bir sonraki başarılı istek üzerine
 * yazar.
 */
export const getCache = (type, id, { allowStale = false } = {}) => {
  try {
    const raw = localStorage.getItem(getCacheKey(type, id));
    if (!raw) return null;

    const { data, timestamp } = JSON.parse(raw);
    const maxAge = CACHE_DURATION[type];

    if (!allowStale && Date.now() - timestamp > maxAge) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
};

export const setCache = (type, id, data) => {
  try {
    localStorage.setItem(
      getCacheKey(type, id),
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // localStorage dolu olabilir, sessizce devam et
  }
};
