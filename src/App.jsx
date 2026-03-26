import { useState, useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import CitySelector from "./components/CitySelector";
import Countdown from "./components/Countdown";
import PrayerTimes from "./components/PrayerTimes";
import IftarCelebration from "./components/IftarCelebration";
import usePrayerTimes from "./hooks/usePrayerTimes";
import useNotification from "./hooks/useNotification";
import {
  getPrayerDistrictId,
  normalizeDistrictSelection,
} from "./utils/istanbulDistricts";

const CITY_KEY = "ramazan-vakitleri-city";
const DISTRICT_KEY = "ramazan-vakitleri-district";
const VIEW_MODE_KEY = "ramazan-vakitleri-view";

// İstanbul default değerleri
const DEFAULT_CITY = {
  SehirID: "539",
  SehirAdi: "İSTANBUL",
  SehirAdiEn: "ISTANBUL",
};
const DEFAULT_DISTRICT = {
  IlceID: "9541",
  IlceAdi: "İSTANBUL",
  IlceAdiEn: "ISTANBUL",
};

// Service Worker kaydı
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW kaydı başarısız, sessizce devam et
    });
  });
}

function App() {
  const [selectedCity, setSelectedCity] = useState(() => {
    const saved = localStorage.getItem(CITY_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        /* ignore */
      }
    }
    return DEFAULT_CITY;
  });

  const [selectedDistrict, setSelectedDistrict] = useState(() => {
    const saved = localStorage.getItem(DISTRICT_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        /* ignore */
      }
    }
    return DEFAULT_DISTRICT;
  });

  const [showAllTimes, setShowAllTimes] = useState(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    return saved === "true";
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  const effectiveDistrict = normalizeDistrictSelection(
    selectedCity,
    selectedDistrict
  );

  const { times, nextTimes, loading, error, retry } = usePrayerTimes(
    getPrayerDistrictId(effectiveDistrict)
  );

  const notification = useNotification(times, nextTimes);

  const handleCityChange = (city) => {
    setSelectedCity(city);
    setSelectedDistrict(null);
    localStorage.setItem(CITY_KEY, JSON.stringify(city));
    localStorage.removeItem(DISTRICT_KEY);
  };

  const handleDistrictChange = (district) => {
    setSelectedDistrict(district);
    localStorage.setItem(DISTRICT_KEY, JSON.stringify(district));
  };

  const toggleViewMode = () => {
    const newValue = !showAllTimes;
    setShowAllTimes(newValue);
    localStorage.setItem(VIEW_MODE_KEY, String(newValue));
  };

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedDistrict || !effectiveDistrict) {
      return;
    }

    const hasChanged =
      selectedDistrict.IlceID !== effectiveDistrict.IlceID ||
      selectedDistrict.IlceAdi !== effectiveDistrict.IlceAdi ||
      selectedDistrict.sourceIlceID !== effectiveDistrict.sourceIlceID;

    if (hasChanged) {
      setSelectedDistrict(effectiveDistrict);
      localStorage.setItem(DISTRICT_KEY, JSON.stringify(effectiveDistrict));
    }
  }, [selectedDistrict, effectiveDistrict]);

  const formatCurrentTime = () => {
    const hours = currentTime.getHours().toString().padStart(2, "0");
    const minutes = currentTime.getMinutes().toString().padStart(2, "0");
    const seconds = currentTime.getSeconds().toString().padStart(2, "0");

    return (
      <>
        <span className="time-hours">{hours}</span>
        <span className="time-separator">:</span>
        <span className="time-minutes">{minutes}</span>
        <span className="time-seconds">{seconds}</span>
      </>
    );
  };

  return (
    <div className="app">
      <header className="header">
        <h1 className="sr-only">Ramazan Vakitleri - İftar ve Sahur Saatleri</h1>
        <CitySelector
          selectedCity={selectedCity}
          selectedDistrict={effectiveDistrict}
          onCityChange={handleCityChange}
          onDistrictChange={handleDistrictChange}
        />
        <div className="current-time" role="timer" aria-label="Şu anki saat">
          {formatCurrentTime()}
        </div>
      </header>

      <main className="main">
        {loading && (
          <output className="loading-state" aria-label="Yükleniyor">
            <div className="spinner"></div>
          </output>
        )}

        {error && (
          <div className="error-state" role="alert">
            <p>Bağlantı hatası</p>
            <button onClick={retry}>Tekrar Dene</button>
          </div>
        )}

        {!loading && !error && times && (
          <>
            <Countdown
              times={times}
              nextTimes={nextTimes}
              showAllTimes={showAllTimes}
            />
            <div className="view-toggle" role="tablist" aria-label="Görünüm seçimi">
              <button
                className={`toggle-btn ${!showAllTimes ? "active" : ""}`}
                onClick={() => !showAllTimes || toggleViewMode()}
                role="tab"
                aria-selected={!showAllTimes}
              >
                İmsak & İftar
              </button>
              <button
                className={`toggle-btn ${showAllTimes ? "active" : ""}`}
                onClick={() => showAllTimes || toggleViewMode()}
                role="tab"
                aria-selected={showAllTimes}
              >
                Tüm Vakitler
              </button>
            </div>
            <PrayerTimes
              times={times}
              nextTimes={nextTimes}
              showAllTimes={showAllTimes}
            />
            <IftarCelebration times={times} />
          </>
        )}

        {!loading && !error && !times && effectiveDistrict && (
          <div className="error-state" role="alert">
            <p>Bugün için vakit bilgisi bulunamadı</p>
          </div>
        )}

        {!effectiveDistrict && (
          <div className="error-state" role="alert">
            <p>Lütfen bir ilçe seçin</p>
          </div>
        )}
      </main>
      <footer className="app-footer" aria-label="Site bilgileri">
        {notification.supported && (
          <button
            className={`footer-link notification-toggle ${notification.enabled ? 'active' : ''}`}
            onClick={notification.toggle}
            aria-label={notification.enabled ? 'Bildirimleri kapat' : 'Bildirimleri aç'}
            title={notification.enabled ? 'Bildirimler açık' : 'Bildirim hatırlatıcı'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" strokeLinecap="round" strokeLinejoin="round">
              {notification.enabled ? (
                <>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </>
              ) : (
                <>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </>
              )}
            </svg>
            <span className="notification-label">
              {notification.enabled ? 'Bildirim Açık' : 'Hatırlatıcı'}
            </span>
          </button>
        )}
        <a
          href="https://ezanvakti.emushaf.net"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >
          Veriler: Diyanet
        </a>
        <a
          href="https://github.com/ahmetakyapi"
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link github-link"
        >
          <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          ahmetakyapi
        </a>
      </footer>
      <Analytics />
    </div>
  );
}

export default App;
