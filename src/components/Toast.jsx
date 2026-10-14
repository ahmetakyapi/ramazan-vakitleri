import { useEffect, useRef } from 'react';

const TOAST_DURATION = 4500;

/**
 * Kısa durum mesajı (hatırlatıcı açıldı, izin kapalı…). Canlı bölge hep
 * sayfada durur ki ekran okuyucu yeni mesajı okusun; görünen kart yalnızca
 * mesaj varken çizilir.
 */
const Toast = ({ toast, onDismiss }) => {
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = setTimeout(() => onDismissRef.current(), TOAST_DURATION);
    return () => clearTimeout(timeout);
  }, [toast]);

  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && (
        <div className={`toast ${toast.tone ? `toast-${toast.tone}` : ''}`} key={toast.id}>
          <span className="toast-text">{toast.message}</span>
          <button type="button" className="toast-close" onClick={onDismiss} aria-label="Mesajı kapat">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="14" height="14" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default Toast;
