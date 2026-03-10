import { useState, useEffect, useRef } from 'react';
import { useCities, useDistricts } from '../hooks/usePrayerTimes';
import { isVirtualIstanbulDistrict } from '../utils/istanbulDistricts';

const DESKTOP_MEDIA_QUERY = '(min-width: 768px)';

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="21" x2="4" y2="14"></line>
    <line x1="4" y1="10" x2="4" y2="3"></line>
    <line x1="12" y1="21" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12" y2="3"></line>
    <line x1="20" y1="21" x2="20" y2="16"></line>
    <line x1="20" y1="12" x2="20" y2="3"></line>
    <line x1="1" y1="14" x2="7" y2="14"></line>
    <line x1="9" y1="8" x2="15" y2="8"></line>
    <line x1="17" y1="16" x2="23" y2="16"></line>
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const formatName = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word.charAt(0) + word.slice(1).toLocaleLowerCase('tr-TR'))
    .join(' ');
};

const getVirtualDistrictLabel = (cityName) =>
  cityName
    ? `İl Merkezi Vakti (${formatName(cityName)})`
    : 'İl Merkezi Vakti';

const CitySelector = ({ selectedCity, selectedDistrict, onCityChange, onDistrictChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [step, setStep] = useState('city'); // 'city' veya 'district'
  const searchRef = useRef(null);

  const { cities, loading: citiesLoading } = useCities();
  const { districts, loading: districtsLoading } = useDistricts(selectedCity?.SehirID);

  useEffect(() => {
    if (!isOpen || !searchRef.current) return;

    const isDesktop =
      typeof window.matchMedia === 'function'
        ? window.matchMedia(DESKTOP_MEDIA_QUERY).matches
        : true;

    if (isDesktop) {
      searchRef.current.focus();
    }
  }, [isOpen, step]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const { body, documentElement } = document;
    const previousBodyOverflow = body.style.overflow;
    const previousHtmlOverflow = documentElement.style.overflow;

    body.style.overflow = 'hidden';
    documentElement.style.overflow = 'hidden';

    return () => {
      body.style.overflow = previousBodyOverflow;
      documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const TOP_CITIES = ['İSTANBUL', 'ANKARA', 'İZMİR'];

  const filteredCities = cities
    .filter(city =>
      city.SehirAdi.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR')) ||
      city.SehirAdiEn.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const aTop = TOP_CITIES.indexOf(a.SehirAdi);
      const bTop = TOP_CITIES.indexOf(b.SehirAdi);
      if (aTop !== -1 && bTop !== -1) return aTop - bTop;
      if (aTop !== -1) return -1;
      if (bTop !== -1) return 1;
      return 0;
    });

  const filteredDistricts = districts.filter(district =>
    district.IlceAdi.toLocaleLowerCase('tr-TR').includes(search.toLocaleLowerCase('tr-TR')) ||
    district.IlceAdiEn.toLowerCase().includes(search.toLowerCase())
  );

  const sharedDistrictOption = districts.find((district) => {
    const districtName = district.IlceAdi?.toLocaleUpperCase('tr-TR');
    const cityName = selectedCity?.SehirAdi?.toLocaleUpperCase('tr-TR');

    return districtName === cityName || districtName === 'MERKEZ';
  });

  const shouldShowDistrictNote = step === 'district' && Boolean(sharedDistrictOption);

  const handleOpen = () => {
    setIsOpen(true);
    setSearch('');
    setStep(selectedCity ? 'district' : 'city');
  };

  const handleCitySelect = (city) => {
    onCityChange(city);
    setSearch('');
    setStep('district');
  };

  const handleDistrictSelect = (district) => {
    onDistrictChange(district);
    setIsOpen(false);
    setSearch('');
  };

  const handleBack = () => {
    setStep('city');
    setSearch('');
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearch('');
  };

  const displayName = selectedDistrict
    ? `${formatName(selectedCity?.SehirAdi)} / ${formatName(selectedDistrict?.IlceAdi)}`
    : selectedCity
      ? formatName(selectedCity.SehirAdi)
      : 'Konum Seç';

  return (
    <div className="city-selector">
      <button
        type="button"
        className="city-selector-button"
        onClick={handleOpen}
      >
        <span className="city-icon">
          <SettingsIcon />
        </span>
        <span className="city-name">{displayName}</span>
      </button>

      {isOpen && (
        <div className="city-dropdown">
          <div className="city-sheet-handle" aria-hidden="true" />
          <div className="dropdown-header">
            <div className="dropdown-header-main">
              {step === 'district' && (
                <button type="button" className="back-btn" onClick={handleBack} aria-label="Şehir listesine dön">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
              )}
              <div className="dropdown-heading">
                <span className="dropdown-title">
                  {step === 'city' ? 'Şehir Seçin' : formatName(selectedCity?.SehirAdi) + ' - İlçe Seçin'}
                </span>
                <span className="dropdown-subtitle">
                  {step === 'city'
                    ? 'Şehir arayın ve tek dokunuşla seçin'
                    : 'Daha rahat arama için listede aşağı kaydırabilirsiniz'}
                </span>
              </div>
            </div>
            <button type="button" className="close-btn" onClick={handleClose} aria-label="Konum seçiciyi kapat">
              <CloseIcon />
            </button>
          </div>
          <div className="dropdown-search-wrap">
            <input
              ref={searchRef}
              type="text"
              className="city-search"
              placeholder={step === 'city' ? 'Şehir ara...' : 'İlçe ara...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {shouldShowDistrictNote && (
            <div className="selector-note">
              <strong>Bazı ilçeler ayrı vakit bölgesi olarak listelenmez.</strong>
              <span>
                Aradığınız ilçe yoksa {formatName(sharedDistrictOption?.IlceAdi)} seçimini kullanın.
              </span>
            </div>
          )}
          <ul className="city-list">
            {step === 'city' && (
              citiesLoading ? (
                <li className="city-item loading-item">Yükleniyor...</li>
              ) : (
                filteredCities.length > 0 ? (
                  filteredCities.map((city) => (
                    <li
                      key={city.SehirID}
                      className={`city-item ${selectedCity?.SehirID === city.SehirID ? 'active' : ''}`}
                      onClick={() => handleCitySelect(city)}
                    >
                      <span className="city-item-content">
                        <span className="city-item-label">{formatName(city.SehirAdi)}</span>
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="city-item empty-item">Sonuc bulunamadı</li>
                )
              )
            )}
            {step === 'district' && (
              districtsLoading ? (
                <li className="city-item loading-item">Yükleniyor...</li>
              ) : (
                filteredDistricts.length > 0 ? (
                  filteredDistricts.map((district) => (
                    <li
                      key={district.IlceID}
                      className={`city-item ${selectedDistrict?.IlceID === district.IlceID ? 'active' : ''}`}
                      onClick={() => handleDistrictSelect(district)}
                    >
                      <span className="city-item-content">
                        <span className="city-item-label">{formatName(district.IlceAdi)}</span>
                        {isVirtualIstanbulDistrict(district) && (
                          <span className="city-item-meta">
                            {getVirtualDistrictLabel(selectedCity?.SehirAdi)}
                          </span>
                        )}
                      </span>
                    </li>
                  ))
                ) : (
                  <li className="city-item empty-item">Sonuc bulunamadı</li>
                )
              )
            )}
          </ul>
        </div>
      )}

      {isOpen && (
        <div className="city-overlay" onClick={handleClose} />
      )}
    </div>
  );
};

export default CitySelector;
