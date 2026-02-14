import { useState } from 'react';
import { cities } from '../data/cities';

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

const CitySelector = ({ selectedCity, onCityChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredCities = cities.filter(city =>
    city.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (city) => {
    onCityChange(city);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="city-selector">
      <button
        className="city-selector-button"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="city-icon">
          <SettingsIcon />
        </span>
        <span className="city-name">{selectedCity?.name || 'Şehir Seç'}</span>
      </button>

      {isOpen && (
        <div className="city-dropdown">
          <input
            type="text"
            className="city-search"
            placeholder="Şehir ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <ul className="city-list">
            {filteredCities.map((city) => (
              <li
                key={city.name}
                className={`city-item ${selectedCity?.name === city.name ? 'active' : ''}`}
                onClick={() => handleSelect(city)}
              >
                {city.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isOpen && (
        <div className="city-overlay" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
};

export default CitySelector;
