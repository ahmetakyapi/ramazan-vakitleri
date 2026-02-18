import { useState, useEffect, useRef } from 'react';
import { useCities, useDistricts } from '../hooks/usePrayerTimes';

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

const formatName = (name) => {
  if (!name) return '';
  return name
    .split(' ')
    .map(word => word.charAt(0) + word.slice(1).toLocaleLowerCase('tr-TR'))
    .join(' ');
};

const CitySelector = ({ selectedCity, selectedDistrict, onCityChange, onDistrictChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [step, setStep] = useState('city'); // 'city' veya 'district'
  const searchRef = useRef(null);

  const { cities, loading: citiesLoading } = useCities();
  const { districts, loading: districtsLoading } = useDistricts(selectedCity?.SehirID);

  useEffect(() => {
    if (isOpen && searchRef.current) {
      searchRef.current.focus();
    }
  }, [isOpen, step]);

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
          <div className="dropdown-header">
            {step === 'district' && (
              <button className="back-btn" onClick={handleBack}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
            )}
            <span className="dropdown-title">
              {step === 'city' ? 'Şehir Seçin' : formatName(selectedCity?.SehirAdi) + ' - İlçe Seçin'}
            </span>
          </div>
          <input
            ref={searchRef}
            type="text"
            className="city-search"
            placeholder={step === 'city' ? 'Şehir ara...' : 'İlçe ara...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <ul className="city-list">
            {step === 'city' && (
              citiesLoading ? (
                <li className="city-item loading-item">Yükleniyor...</li>
              ) : (
                filteredCities.map((city) => (
                  <li
                    key={city.SehirID}
                    className={`city-item ${selectedCity?.SehirID === city.SehirID ? 'active' : ''}`}
                    onClick={() => handleCitySelect(city)}
                  >
                    {formatName(city.SehirAdi)}
                  </li>
                ))
              )
            )}
            {step === 'district' && (
              districtsLoading ? (
                <li className="city-item loading-item">Yükleniyor...</li>
              ) : (
                filteredDistricts.map((district) => (
                  <li
                    key={district.IlceID}
                    className={`city-item ${selectedDistrict?.IlceID === district.IlceID ? 'active' : ''}`}
                    onClick={() => handleDistrictSelect(district)}
                  >
                    {formatName(district.IlceAdi)}
                  </li>
                ))
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
