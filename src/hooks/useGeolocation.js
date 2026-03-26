import { useState, useCallback } from 'react';

// Türkiye il merkezleri koordinatları (şehir adıyla eşleştirme)
const CITY_COORDS = {
  'ADANA': { lat: 37.00, lng: 35.32 },
  'ADIYAMAN': { lat: 37.76, lng: 38.28 },
  'AFYONKARAHİSAR': { lat: 38.74, lng: 30.54 },
  'AĞRI': { lat: 39.72, lng: 43.05 },
  'AKSARAY': { lat: 38.37, lng: 34.03 },
  'AMASYA': { lat: 40.65, lng: 35.83 },
  'ANKARA': { lat: 39.93, lng: 32.86 },
  'ANTALYA': { lat: 36.90, lng: 30.69 },
  'ARDAHAN': { lat: 41.11, lng: 42.70 },
  'ARTVİN': { lat: 41.18, lng: 41.82 },
  'AYDIN': { lat: 37.85, lng: 27.85 },
  'BALIKESİR': { lat: 39.65, lng: 27.88 },
  'BARTIN': { lat: 41.64, lng: 32.34 },
  'BATMAN': { lat: 37.89, lng: 41.13 },
  'BAYBURT': { lat: 40.26, lng: 40.22 },
  'BİLECİK': { lat: 40.05, lng: 30.00 },
  'BİNGÖL': { lat: 38.88, lng: 40.49 },
  'BİTLİS': { lat: 38.40, lng: 42.11 },
  'BOLU': { lat: 40.73, lng: 31.61 },
  'BURDUR': { lat: 37.72, lng: 30.29 },
  'BURSA': { lat: 40.19, lng: 29.06 },
  'ÇANAKKALE': { lat: 40.15, lng: 26.41 },
  'ÇANKIRI': { lat: 40.60, lng: 33.62 },
  'ÇORUM': { lat: 40.55, lng: 34.96 },
  'DENİZLİ': { lat: 37.77, lng: 29.09 },
  'DİYARBAKIR': { lat: 37.91, lng: 40.24 },
  'DÜZCE': { lat: 40.84, lng: 31.16 },
  'EDİRNE': { lat: 41.68, lng: 26.56 },
  'ELAZIĞ': { lat: 38.67, lng: 39.22 },
  'ERZİNCAN': { lat: 39.75, lng: 39.49 },
  'ERZURUM': { lat: 39.90, lng: 41.27 },
  'ESKİŞEHİR': { lat: 39.78, lng: 30.52 },
  'GAZİANTEP': { lat: 37.07, lng: 37.38 },
  'GİRESUN': { lat: 40.91, lng: 38.39 },
  'GÜMÜŞHANE': { lat: 40.46, lng: 39.48 },
  'HAKKARİ': { lat: 37.58, lng: 43.74 },
  'HATAY': { lat: 36.40, lng: 36.35 },
  'IĞDIR': { lat: 39.92, lng: 44.05 },
  'ISPARTA': { lat: 37.76, lng: 30.55 },
  'İSTANBUL': { lat: 41.01, lng: 28.98 },
  'İZMİR': { lat: 38.42, lng: 27.13 },
  'KAHRAMANMARAŞ': { lat: 37.58, lng: 36.93 },
  'KARABÜK': { lat: 41.20, lng: 32.63 },
  'KARAMAN': { lat: 37.18, lng: 33.23 },
  'KARS': { lat: 40.60, lng: 43.10 },
  'KASTAMONU': { lat: 41.39, lng: 33.78 },
  'KAYSERİ': { lat: 38.73, lng: 35.48 },
  'KIRIKKALE': { lat: 39.85, lng: 33.51 },
  'KIRKLARELİ': { lat: 41.74, lng: 27.23 },
  'KIRŞEHİR': { lat: 39.15, lng: 34.16 },
  'KİLİS': { lat: 36.72, lng: 37.12 },
  'KOCAELİ': { lat: 40.77, lng: 29.92 },
  'KONYA': { lat: 37.87, lng: 32.48 },
  'KÜTAHYA': { lat: 39.42, lng: 29.98 },
  'MALATYA': { lat: 38.35, lng: 38.31 },
  'MANİSA': { lat: 38.61, lng: 27.43 },
  'MARDİN': { lat: 37.31, lng: 40.74 },
  'MERSİN': { lat: 36.80, lng: 34.64 },
  'MUĞLA': { lat: 37.22, lng: 28.36 },
  'MUŞ': { lat: 38.75, lng: 41.51 },
  'NEVŞEHİR': { lat: 38.62, lng: 34.71 },
  'NİĞDE': { lat: 37.97, lng: 34.68 },
  'ORDU': { lat: 40.98, lng: 37.88 },
  'OSMANİYE': { lat: 37.07, lng: 36.25 },
  'RİZE': { lat: 41.02, lng: 40.52 },
  'SAKARYA': { lat: 40.69, lng: 30.40 },
  'SAMSUN': { lat: 41.29, lng: 36.33 },
  'SİİRT': { lat: 37.93, lng: 41.94 },
  'SİNOP': { lat: 42.03, lng: 35.15 },
  'SİVAS': { lat: 39.75, lng: 37.02 },
  'ŞANLIURFA': { lat: 37.17, lng: 38.79 },
  'ŞIRNAK': { lat: 37.42, lng: 42.46 },
  'TEKİRDAĞ': { lat: 41.00, lng: 27.52 },
  'TOKAT': { lat: 40.31, lng: 36.55 },
  'TRABZON': { lat: 41.00, lng: 39.72 },
  'TUNCELİ': { lat: 39.11, lng: 39.55 },
  'UŞAK': { lat: 38.68, lng: 29.41 },
  'VAN': { lat: 38.49, lng: 43.38 },
  'YALOVA': { lat: 40.66, lng: 29.27 },
  'YOZGAT': { lat: 39.82, lng: 34.80 },
  'ZONGULDAK': { lat: 41.46, lng: 31.80 },
};

const haversine = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const findNearestCity = (lat, lng, cities) => {
  let nearest = null;
  let minDist = Infinity;

  for (const city of cities) {
    const cityName = city.SehirAdi?.toLocaleUpperCase('tr-TR');
    const coords = CITY_COORDS[cityName];
    if (!coords) continue;

    const dist = haversine(lat, lng, coords.lat, coords.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = city;
    }
  }

  return nearest;
};

const GEOLOCATED_KEY = 'ramazan-vakitleri-geolocated';

const useGeolocation = (cities) => {
  const [suggesting, setSuggesting] = useState(false);

  const suggest = useCallback(
    (onCityFound) => {
      if (!('geolocation' in navigator) || !cities.length) return;

      // Daha önce geolocate edildiyse tekrar sorma
      if (localStorage.getItem(GEOLOCATED_KEY)) return;

      setSuggesting(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const city = findNearestCity(latitude, longitude, cities);
          setSuggesting(false);

          if (city) {
            localStorage.setItem(GEOLOCATED_KEY, 'true');
            onCityFound(city);
          }
        },
        () => {
          setSuggesting(false);
          localStorage.setItem(GEOLOCATED_KEY, 'true');
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
      );
    },
    [cities]
  );

  return { suggest, suggesting };
};

export default useGeolocation;
