const CACHE_PREFIX = 'ramazan-cache-';
const CACHE_DURATION = {
  cities: 24 * 60 * 60 * 1000,    // 24 saat
  districts: 24 * 60 * 60 * 1000, // 24 saat
  times: 6 * 60 * 60 * 1000,      // 6 saat
};

const getCacheKey = (type, id) => `${CACHE_PREFIX}${type}-${id || 'all'}`;

export const getCache = (type, id) => {
  try {
    const raw = localStorage.getItem(getCacheKey(type, id));
    if (!raw) return null;

    const { data, timestamp } = JSON.parse(raw);
    const maxAge = CACHE_DURATION[type];

    if (Date.now() - timestamp > maxAge) {
      localStorage.removeItem(getCacheKey(type, id));
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
