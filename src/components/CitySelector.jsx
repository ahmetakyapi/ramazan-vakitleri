import { useState, useEffect, useRef, useId } from 'react';
import { useCities, useDistricts } from '../hooks/usePrayerTimes';
import { isVirtualIstanbulDistrict } from '../utils/istanbulDistricts';
import { foldForSearch, formatPlaceName } from '../utils/text';
import useGeolocation, { isGeolocationSupported } from '../hooks/useGeolocation';

const DESKTOP_MEDIA_QUERY = '(min-width: 768px)';
const FOCUSABLE_SELECTOR = 'button:not([disabled]), input, [tabindex]:not([tabindex="-1"])';
const OPTION_SELECTOR = '[role="option"]';
const TOP_CITIES = ['İSTANBUL', 'ANKARA', 'İZMİR'];

const PinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);

const ChevronIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const LocateIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="7" />
    <circle cx="12" cy="12" r="2.5" />
    <line x1="12" y1="2" x2="12" y2="5" />
    <line x1="12" y1="19" x2="12" y2="22" />
    <line x1="2" y1="12" x2="5" y2="12" />
    <line x1="19" y1="12" x2="22" y2="12" />
  </svg>
);

const CheckIcon = () => (
  <svg className="city-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const getVirtualDistrictLabel = (cityName) =>
  cityName
    ? `İl Merkezi Vakti (${formatPlaceName(cityName)})`
    : 'İl Merkezi Vakti';

// İl merkezinin ilçesi: adı il adıyla aynı olan ya da "MERKEZ"
const findCenterDistrict = (districts, city) => {
  const cityName = city?.SehirAdi?.toLocaleUpperCase('tr-TR');
  return districts.find((district) => {
    const name = district.IlceAdi?.toLocaleUpperCase('tr-TR');
    return name === cityName || name === 'MERKEZ';
  });
};

// Aramada başa uyan önce gelir: "an" → Ankara, Antalya, sonra Adana
const filterByName = (items, query, getNames) => {
  const needle = foldForSearch(query);
  if (!needle) return items;

  return items
    .map((item, index) => {
      const names = getNames(item).map(foldForSearch);
      let rank = -1;
      if (names.some((name) => name.startsWith(needle))) rank = 0;
      else if (names.some((name) => name.split(' ').some((word) => word.startsWith(needle)))) rank = 1;
      else if (names.some((name) => name.includes(needle))) rank = 2;
      return { item, index, rank };
    })
    .filter((entry) => entry.rank !== -1)
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.item);
};

const CitySelector = ({ selectedCity, selectedDistrict, onLocationChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [step, setStep] = useState('city'); // 'city' veya 'district'
  // Seçicide gezilen il. İlçe seçilene kadar uygulamadaki konum değişmez:
  // eskiden il seçilir seçilmez kaydediliyordu ve pencere ilçe seçmeden
  // kapanınca ekranda vakit yerine "Lütfen bir ilçe seçin" kalıyordu.
  const [browseCity, setBrowseCity] = useState(selectedCity);
  const searchRef = useRef(null);
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const listRef = useRef(null);
  const titleId = useId();

  const listCity = isOpen ? browseCity : selectedCity;
  const { cities, loading: citiesLoading } = useCities();
  const { districts, loading: districtsLoading } = useDistricts(listCity?.SehirID);
  const geo = useGeolocation(cities);
  const geoSupported = isGeolocationSupported();

  // Konum bulununca o ilin ilçe listesine geç; ilçeyi kullanıcı seçer
  // (konum yalnızca en yakın il merkezini söyleyebiliyor)
  const [locatedCityId, setLocatedCityId] = useState(null);
  const { city: locatedCity, reset: resetGeo } = geo;
  useEffect(() => {
    if (!locatedCity) return;
    setBrowseCity(locatedCity);
    setLocatedCityId(locatedCity.SehirID);
    setStep('district');
    setSearch('');
    resetGeo();
  }, [locatedCity, resetGeo]);

  // İli olup ilçesi olmayan eski kayıtlar için il merkezini seç
  const onLocationChangeRef = useRef(onLocationChange);
  onLocationChangeRef.current = onLocationChange;
  useEffect(() => {
    if (isOpen || !selectedCity || selectedDistrict || districtsLoading) return;
    const center = findCenterDistrict(districts, selectedCity);
    if (center) onLocationChangeRef.current(selectedCity, center);
  }, [isOpen, selectedCity, selectedDistrict, districts, districtsLoading]);

  useEffect(() => {
    if (!isOpen || !searchRef.current) return;

    const isDesktop =
      typeof window.matchMedia === 'function'
        ? window.matchMedia(DESKTOP_MEDIA_QUERY).matches
        : true;

    // Telefonda klavye listenin yarısını kapatmasın diye odak verilmez
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

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        setSearch('');
        triggerRef.current?.focus();
        return;
      }

      // Focus trap
      if (event.key === 'Tab' && dropdownRef.current) {
        const focusable = dropdownRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const sortedCities = search
    ? cities
    : [...cities].sort((a, b) => {
        const aTop = TOP_CITIES.indexOf(a.SehirAdi);
        const bTop = TOP_CITIES.indexOf(b.SehirAdi);
        if (aTop !== -1 && bTop !== -1) return aTop - bTop;
        if (aTop !== -1) return -1;
        if (bTop !== -1) return 1;
        return 0;
      });

  const filteredCities = filterByName(sortedCities, search, (city) => [
    city.SehirAdi,
    city.SehirAdiEn,
  ]);

  const filteredDistricts = filterByName(districts, search, (district) => [
    district.IlceAdi,
    district.IlceAdiEn,
  ]);

  const centerDistrict = findCenterDistrict(districts, browseCity);
  const showDistrictNote =
    step === 'district' && !districtsLoading && filteredDistricts.length === 0;

  const handleOpen = () => {
    setIsOpen(true);
    setSearch('');
    setBrowseCity(selectedCity);
    setLocatedCityId(null);
    resetGeo();
    setStep(selectedCity ? 'district' : 'city');
  };

  const handleCitySelect = (city) => {
    setBrowseCity(city);
    setLocatedCityId(null);
    setSearch('');
    setStep('district');
  };

  const handleClose = () => {
    setIsOpen(false);
    setSearch('');
    triggerRef.current?.focus();
  };

  const handleDistrictSelect = (district) => {
    onLocationChange(browseCity, district);
    handleClose();
  };

  const handleBack = () => {
    setStep('city');
    setSearch('');
  };

  const focusOption = (index) => {
    const options = listRef.current?.querySelectorAll(OPTION_SELECTOR);
    if (!options?.length) return;
    const clamped = Math.max(0, Math.min(options.length - 1, index));
    options[clamped].focus();
  };

  // Enter ilk sonucu seçer, aşağı ok listeye iner
  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (step === 'city' && filteredCities[0]) handleCitySelect(filteredCities[0]);
      if (step === 'district' && filteredDistricts[0]) handleDistrictSelect(filteredDistricts[0]);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusOption(0);
    }
  };

  const handleListKeyDown = (event) => {
    const options = [...(listRef.current?.querySelectorAll(OPTION_SELECTOR) || [])];
    const index = options.indexOf(document.activeElement);
    if (index === -1) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusOption(index + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (index === 0) searchRef.current?.focus();
      else focusOption(index - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusOption(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusOption(options.length - 1);
    }
  };

  const optionKeyDown = (onSelect) => (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  };

  const cityName = formatPlaceName(selectedCity?.SehirAdi);
  const districtName = formatPlaceName(selectedDistrict?.IlceAdi);
  const displayName = !selectedCity
    ? 'Konum Seç'
    : !selectedDistrict || districtName === cityName
      ? cityName
      : `${districtName}, ${cityName}`;

  // İlçe adedi yazılmaz: liste il merkezinin vakit bölgesini de bir satır
  // sayıyor, "40 ilçe" gerçek ilçe sayısını yanlış söylerdi
  const browseCityName = formatPlaceName(browseCity?.SehirAdi);
  const subtitle =
    step === 'city'
      ? citiesLoading ? 'İller yükleniyor' : `${cities.length} il`
      : locatedCityId === browseCity?.SehirID
        ? `${browseCityName}, konumunuza en yakın il`
        : browseCityName;

  return (
    <div className="city-selector">
      <button
        ref={triggerRef}
        type="button"
        className="city-selector-button"
        onClick={handleOpen}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`Konumu değiştir, şu an ${displayName}`}
      >
        <span className="city-icon">
          <PinIcon />
        </span>
        <span className="city-name">{displayName}</span>
        <span className="city-chevron">
          <ChevronIcon />
        </span>
      </button>

      {isOpen && (
        <div className="city-dropdown" ref={dropdownRef} role="dialog" aria-labelledby={titleId} aria-modal="true">
          <div className="city-sheet-handle" aria-hidden="true" />
          <div className="dropdown-header">
            <div className="dropdown-header-main">
              {step === 'district' && (
                <button type="button" className="back-btn" onClick={handleBack} aria-label="Şehir listesine dön">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden="true">
                    <polyline points="15 18 9 12 15 6"></polyline>
                  </svg>
                </button>
              )}
              <div className="dropdown-heading">
                <h2 className="dropdown-title" id={titleId}>
                  {step === 'city' ? 'Şehir Seçin' : 'İlçe Seçin'}
                </h2>
                <p className="dropdown-subtitle">{subtitle}</p>
              </div>
            </div>
            <button type="button" className="close-btn" onClick={handleClose} aria-label="Konum seçiciyi kapat">
              <CloseIcon />
            </button>
          </div>
          <div className="dropdown-search-wrap">
            <input
              ref={searchRef}
              type="search"
              className="city-search"
              placeholder={step === 'city' ? 'Şehir ara' : 'İlçe ara'}
              aria-label={step === 'city' ? 'Şehir ara' : 'İlçe ara'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              autoComplete="off"
              enterKeyHint="go"
            />
          </div>
          {step === 'city' && geoSupported && (
            <div className="locate-wrap">
              <button
                type="button"
                className="locate-btn"
                onClick={geo.locate}
                disabled={geo.status === 'locating' || citiesLoading}
                aria-busy={geo.status === 'locating'}
              >
                <LocateIcon />
                {geo.status === 'locating' ? 'Konum Bulunuyor' : 'Konumumu Kullan'}
              </button>
              {geo.status === 'error' && (
                <p className="locate-error" role="status">
                  Konumunuz alınamadı. Şehrinizi listeden seçebilirsiniz.
                </p>
              )}
            </div>
          )}
          {showDistrictNote && (
            // Bazı ilçeler ayrı vakit bölgesi değil: arayan boşa düşmesin,
            // il merkezinin vaktine tek dokunuşla geçebilsin
            <div className="selector-note" role="status">
              <strong>Aradığınız ilçe listede yok.</strong>
              <span>
                Bazı ilçeler ayrı vakit bölgesi olarak listelenmez.
                {centerDistrict
                  ? ` Bu durumda ${formatPlaceName(centerDistrict.IlceAdi)} vaktini kullanabilirsiniz.`
                  : ' Listeden size en yakın ilçeyi seçin.'}
              </span>
              {centerDistrict && (
                <button
                  type="button"
                  className="selector-note-action"
                  onClick={() => handleDistrictSelect(centerDistrict)}
                >
                  {formatPlaceName(centerDistrict.IlceAdi)} Vaktini Kullan
                </button>
              )}
            </div>
          )}
          <ul
            className="city-list"
            key={step}
            ref={listRef}
            role="listbox"
            aria-label={step === 'city' ? 'Şehirler' : 'İlçeler'}
            onKeyDown={handleListKeyDown}
          >
            {step === 'city' && (
              citiesLoading ? (
                <li className="city-item loading-item">Yükleniyor</li>
              ) : (
                filteredCities.length > 0 ? (
                  filteredCities.map((city) => (
                    <li
                      key={city.SehirID}
                      className={`city-item ${selectedCity?.SehirID === city.SehirID ? 'active' : ''}`}
                      onClick={() => handleCitySelect(city)}
                      onKeyDown={optionKeyDown(() => handleCitySelect(city))}
                      role="option"
                      aria-selected={selectedCity?.SehirID === city.SehirID}
                      tabIndex={0}
                    >
                      <span className="city-item-content">
                        <span className="city-item-label">{formatPlaceName(city.SehirAdi)}</span>
                      </span>
                      <CheckIcon />
                    </li>
                  ))
                ) : (
                  <li className="city-item empty-item">Bu adla bir il bulunamadı</li>
                )
              )
            )}
            {step === 'district' && (
              districtsLoading ? (
                <li className="city-item loading-item">Yükleniyor</li>
              ) : (
                filteredDistricts.length > 0 ? (
                  filteredDistricts.map((district) => (
                    <li
                      key={district.IlceID}
                      className={`city-item ${selectedDistrict?.IlceID === district.IlceID ? 'active' : ''}`}
                      onClick={() => handleDistrictSelect(district)}
                      onKeyDown={optionKeyDown(() => handleDistrictSelect(district))}
                      role="option"
                      aria-selected={selectedDistrict?.IlceID === district.IlceID}
                      tabIndex={0}
                    >
                      <span className="city-item-content">
                        <span className="city-item-label">{formatPlaceName(district.IlceAdi)}</span>
                        {isVirtualIstanbulDistrict(district) && (
                          <span className="city-item-meta">
                            {getVirtualDistrictLabel(browseCity?.SehirAdi)}
                          </span>
                        )}
                      </span>
                      <CheckIcon />
                    </li>
                  ))
                ) : null
              )
            )}
          </ul>
        </div>
      )}

      {isOpen && (
        <div className="city-overlay" onClick={handleClose} aria-hidden="true" />
      )}
    </div>
  );
};

export default CitySelector;
