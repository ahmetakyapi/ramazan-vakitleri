import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { Analytics } from "@vercel/analytics/react";
import CitySelector from "./components/CitySelector";
import Countdown from "./components/Countdown";
import PrayerTimes from "./components/PrayerTimes";
import IftarCelebration from "./components/IftarCelebration";
import Toast from "./components/Toast";
import usePrayerTimes from "./hooks/usePrayerTimes";
import useNotification from "./hooks/useNotification";
import {
  getPrayerDistrictId,
  normalizeDistrictSelection,
} from "./utils/istanbulDistricts";
import { formatDayLabel, formatHijriLabel } from "./utils/prayerData";
import { getRamazanInfo } from "./utils/ramazan";

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

const readStored = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

const writeStored = (key, value) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  } catch {
    // gizli sekme ya da dolu depo: seçim yalnızca bu oturumda kalır
  }
};

const NOTIFICATION_MESSAGES = {
  enabled: {
    message: "Hatırlatıcı açık. Sayfa açıkken imsak ve iftardan 15 dakika önce bildirim gelir.",
    tone: "success",
  },
  disabled: { message: "Hatırlatıcı kapatıldı." },
  denied: {
    message: "Bildirim izni kapalı. Tarayıcı ayarlarından bu siteye izin verebilirsiniz.",
    tone: "warning",
  },
  unsupported: { message: "Bu tarayıcı bildirim göstermiyor.", tone: "warning" },
};

// Service Worker kaydı
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // SW kaydı başarısız, sessizce devam et
    });
  });
}

// Saat kendi bileşeninde: her saniye sadece bu küçük parça yeniden çizilir,
// uygulamanın geri kalanı (şehir listesi, vakitler) etkilenmez.
const LiveClock = memo(function LiveClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timeout;
    // Saniye sınırına hizalan: rakamlar tam saniyede, kaymadan değişir
    const tick = () => {
      setNow(new Date());
      timeout = setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    timeout = setTimeout(tick, 1000 - (Date.now() % 1000));
    return () => clearTimeout(timeout);
  }, []);

  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const seconds = now.getSeconds().toString().padStart(2, "0");

  return (
    <div className="current-time" role="timer" aria-label="Şu anki saat">
      <span className="time-hours">{hours}</span>
      <span className="time-separator">:</span>
      <span className="time-minutes">{minutes}</span>
      <span className="time-seconds">{seconds}</span>
    </div>
  );
});

// Bugünün miladi ve hicri tarihi, Diyanet'in satırından. Yer önceden ayrılır:
// vakitler gelince satır belirir, altındaki sayaç kaymaz.
const TodayDate = ({ times }) => {
  const day = times ? formatDayLabel(times) : "";
  const hijri = times ? formatHijriLabel(times) : "";

  return (
    <p className={`today-date ${day ? "is-ready" : ""}`}>
      {day && (
        <>
          <span>{day}</span>
          {hijri && (
            <>
              <span className="today-date-sep" aria-hidden="true">·</span>
              <span>{hijri}</span>
            </>
          )}
        </>
      )}
    </p>
  );
};

function App() {
  const [selectedCity, setSelectedCity] = useState(() =>
    readStored(CITY_KEY, DEFAULT_CITY)
  );

  // İl kayıtlı ama ilçe yoksa (eski sürüm ili tek başına kaydediyordu)
  // İstanbul'un ilçesi başka ile yapışmasın: boş kalır, seçici il merkezini seçer
  const [selectedDistrict, setSelectedDistrict] = useState(() => {
    const storedCity = readStored(CITY_KEY, null);
    const fallback =
      storedCity && storedCity.SehirID !== DEFAULT_CITY.SehirID ? null : DEFAULT_DISTRICT;
    return readStored(DISTRICT_KEY, fallback);
  });

  const [showAllTimes, setShowAllTimes] = useState(
    () => readStored(VIEW_MODE_KEY, false) === true
  );

  const [toast, setToast] = useState(null);
  const showToast = useCallback((next) => {
    setToast({ ...next, id: Date.now() });
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  const effectiveDistrict = normalizeDistrictSelection(
    selectedCity,
    selectedDistrict
  );

  const { times, nextTimes, allTimes, loading, error, stale, retry } =
    usePrayerTimes(getPrayerDistrictId(effectiveDistrict));

  const notification = useNotification(times);

  // Bugünün satırı değişince (gece yarısı) yeniden hesaplanır
  const ramazanInfo = useMemo(
    () => (times ? getRamazanInfo({ today: times, rows: allTimes }) : null),
    [times, allTimes]
  );

  // İl ve ilçe birlikte kaydedilir; seçici ilçe seçilmeden konumu değiştirmez
  const handleLocationChange = (city, district) => {
    setSelectedCity(city);
    setSelectedDistrict(district);
    writeStored(CITY_KEY, city);
    writeStored(DISTRICT_KEY, district);
  };

  const setViewMode = (all) => {
    if (all === showAllTimes) return;
    setShowAllTimes(all);
    writeStored(VIEW_MODE_KEY, String(all));
  };

  const handleNotificationToggle = async () => {
    const result = await notification.toggle();
    if (NOTIFICATION_MESSAGES[result]) showToast(NOTIFICATION_MESSAGES[result]);
  };

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
      writeStored(DISTRICT_KEY, effectiveDistrict);
    }
  }, [selectedDistrict, effectiveDistrict]);

  const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;

  return (
    <div className="app">
      <header className="header">
        <h1 className="sr-only">Ramazan Vakitleri - İftar ve Sahur Saatleri</h1>
        <CitySelector
          selectedCity={selectedCity}
          selectedDistrict={effectiveDistrict}
          onLocationChange={handleLocationChange}
        />
        <div className="clock-block">
          <LiveClock />
          <TodayDate times={!loading && !error ? times : null} />
        </div>
      </header>

      <main className="main">
        {loading && (
          <output className="skeleton" aria-label="Vakitler yükleniyor">
            <span className="skeleton-line skeleton-label" />
            <span className="skeleton-line skeleton-countdown" />
            <span className="skeleton-line skeleton-toggle" />
            <span className="skeleton-line skeleton-row" />
            <span className="skeleton-line skeleton-row" />
          </output>
        )}

        {!loading && error && (
          <div className="state-card" role="alert">
            <h2 className="state-title">Vakitler Alınamadı</h2>
            <p className="state-text">
              {isOffline
                ? "İnternet bağlantınız yok gibi görünüyor. Bağlantı gelince vakitler kendiliğinden yüklenir."
                : "Vakit servisine şu an ulaşılamıyor. Birazdan tekrar deneyin."}
            </p>
            <button type="button" className="state-action" onClick={retry}>
              Tekrar Dene
            </button>
          </div>
        )}

        {!loading && !error && times && (
          <>
            {stale && (
              <p className="offline-note" role="status">
                <span className="offline-dot" aria-hidden="true" />
                Bağlantı yok, kayıtlı vakitler gösteriliyor
              </p>
            )}
            <Countdown
              times={times}
              nextTimes={nextTimes}
              showAllTimes={showAllTimes}
            />
            <div
              className={`view-toggle ${showAllTimes ? "is-all" : ""}`}
              role="group"
              aria-label="Görünüm"
            >
              <span className="toggle-indicator" aria-hidden="true" />
              <button
                type="button"
                className={`toggle-btn ${!showAllTimes ? "active" : ""}`}
                onClick={() => setViewMode(false)}
                aria-pressed={!showAllTimes}
              >
                İmsak & İftar
              </button>
              <button
                type="button"
                className={`toggle-btn ${showAllTimes ? "active" : ""}`}
                onClick={() => setViewMode(true)}
                aria-pressed={showAllTimes}
              >
                Tüm Vakitler
              </button>
            </div>
            <PrayerTimes
              times={times}
              nextTimes={nextTimes}
              showAllTimes={showAllTimes}
              ramazanInfo={ramazanInfo}
            />
            <IftarCelebration
              times={times}
              active={ramazanInfo?.type === "current"}
            />
          </>
        )}

        {!loading && !error && !times && effectiveDistrict && (
          <div className="state-card" role="status">
            <h2 className="state-title">Bugünün Vakitleri Bulunamadı</h2>
            <p className="state-text">
              Bu ilçe için bugünün vakitleri henüz yayınlanmamış olabilir.
            </p>
            <button type="button" className="state-action" onClick={retry}>
              Tekrar Dene
            </button>
          </div>
        )}

        {!effectiveDistrict && (
          <div className="state-card" role="status">
            <h2 className="state-title">İlçe Seçilmedi</h2>
            <p className="state-text">
              Vakitleri görmek için yukarıdaki konum düğmesinden ilçenizi seçin.
            </p>
          </div>
        )}
      </main>
      <footer className="app-footer" aria-label="Site bilgileri">
        {notification.supported && (
          <button
            type="button"
            className={`footer-link notification-toggle ${notification.enabled ? 'active' : ''}`}
            onClick={handleNotificationToggle}
            aria-pressed={notification.enabled}
            title="İmsak ve iftardan 15 dakika önce hatırlatır"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
              {notification.enabled ? 'Hatırlatıcı Açık' : 'Hatırlatıcı Kapalı'}
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
          <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          ahmetakyapi
        </a>
      </footer>
      <Toast toast={toast} onDismiss={dismissToast} />
      <Analytics />
    </div>
  );
}

export default App;
