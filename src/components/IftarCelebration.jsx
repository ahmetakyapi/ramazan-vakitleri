import { useState, useEffect, useRef } from 'react';
import { parseTimeToDate } from '../utils/timeUtils';

const CELEBRATION_DURATION = 8000;

// Yalnızca Ramazan'da: yıl boyu her akşam ekranı kaplayan "Hayırlı İftarlar"
// oruç tutmayan ziyaretçiye anlamsız kalıyordu
const IftarCelebration = ({ times, active = false }) => {
  const [show, setShow] = useState(false);
  const triggeredRef = useRef(false);
  const hideTimeoutRef = useRef(null);

  useEffect(() => () => clearTimeout(hideTimeoutRef.current), []);

  useEffect(() => {
    if (!active || !times?.Aksam) return;

    // Vakit değiştiğinde triggered'ı sıfırla
    triggeredRef.current = false;

    const checkIftar = () => {
      if (triggeredRef.current) return;

      const now = new Date();
      const iftarTime = parseTimeToDate(times.Aksam, now);
      const diff = now.getTime() - iftarTime.getTime();

      // İftar vaktinden 0-5 saniye sonra tetikle (tek seferlik)
      if (diff >= 0 && diff < 5000) {
        triggeredRef.current = true;
        setShow(true);
        hideTimeoutRef.current = setTimeout(() => setShow(false), CELEBRATION_DURATION);
      }
    };

    checkIftar();
    const interval = setInterval(checkIftar, 1000);
    return () => clearInterval(interval);
  }, [times, active]);

  if (!show) return null;

  return (
    <div className="iftar-celebration" aria-live="assertive" role="alert">
      <div className="iftar-celebration-content">
        <div className="iftar-particles" aria-hidden="true">
          {Array.from({ length: 20 }, (_, i) => (
            <span
              key={i}
              className="iftar-particle"
              style={{
                '--x': `${Math.random() * 100}%`,
                '--delay': `${Math.random() * 0.5}s`,
                '--duration': `${1.5 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
        <div className="iftar-message">
          <span className="iftar-emoji" aria-hidden="true">&#127769;</span>
          <span className="iftar-text">Hayırlı İftarlar</span>
        </div>
      </div>
    </div>
  );
};

export default IftarCelebration;
