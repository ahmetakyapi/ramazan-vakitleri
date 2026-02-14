import { useState, useEffect } from 'react';
import CitySelector from './components/CitySelector';
import Countdown from './components/Countdown';
import PrayerTimes from './components/PrayerTimes';
import usePrayerTimes from './hooks/usePrayerTimes';
import { cities } from './data/cities';

const STORAGE_KEY = 'ramazan-vakitleri-city';
const VIEW_MODE_KEY = 'ramazan-vakitleri-view';

function App() {
  const [selectedCity, setSelectedCity] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const city = cities.find(c => c.name === saved);
      if (city) return city;
    }
    return cities.find(c => c.name === 'İstanbul');
  });

  const [showAllTimes, setShowAllTimes] = useState(() => {
    const saved = localStorage.getItem(VIEW_MODE_KEY);
    return saved === 'true';
  });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());

  const { times, loading, error } = usePrayerTimes(
    selectedCity?.lat,
    selectedCity?.lng,
    currentDate
  );

  const handleCityChange = (city) => {
    setSelectedCity(city);
    localStorage.setItem(STORAGE_KEY, city.name);
  };

  const toggleViewMode = () => {
    const newValue = !showAllTimes;
    setShowAllTimes(newValue);
    localStorage.setItem(VIEW_MODE_KEY, String(newValue));
  };

  useEffect(() => {
    const checkDate = () => {
      const now = new Date();
      if (now.toDateString() !== currentDate.toDateString()) {
        setCurrentDate(now);
      }
    };

    const interval = setInterval(checkDate, 60000);
    return () => clearInterval(interval);
  }, [currentDate]);

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date());
    };

    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatCurrentTime = () => {
    const hours = currentTime.getHours().toString().padStart(2, '0');
    const minutes = currentTime.getMinutes().toString().padStart(2, '0');
    const seconds = currentTime.getSeconds().toString().padStart(2, '0');

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
        <CitySelector
          selectedCity={selectedCity}
          onCityChange={handleCityChange}
        />
        <div className="current-time">{formatCurrentTime()}</div>
      </header>

      <main className="main">
        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
          </div>
        )}

        {error && (
          <div className="error-state">
            <p>Bağlantı hatası</p>
            <button onClick={() => window.location.reload()}>
              Tekrar Dene
            </button>
          </div>
        )}

        {!loading && !error && times && (
          <>
            <Countdown times={times} showAllTimes={showAllTimes} />
            <div className="view-toggle">
              <button
                className={`toggle-btn ${!showAllTimes ? 'active' : ''}`}
                onClick={() => !showAllTimes || toggleViewMode()}
              >
                İmsak & İftar
              </button>
              <button
                className={`toggle-btn ${showAllTimes ? 'active' : ''}`}
                onClick={() => showAllTimes || toggleViewMode()}
              >
                Tüm Vakitler
              </button>
            </div>
            <PrayerTimes times={times} showAllTimes={showAllTimes} />
          </>
        )}
      </main>
      <footer className="api-credit">
        <a href="https://aladhan.com" target="_blank" rel="noopener noreferrer">
          Veriler: Aladhan API
        </a>
      </footer>
    </div>
  );
}

export default App;
