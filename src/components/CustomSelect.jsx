import { useState, useRef, useEffect } from 'react';

export default function CustomSelect({ value, onChange, options, placeholder, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  // Funkcja zamykająca listę, gdy klikniemy gdziekolwiek indziej na ekranie
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="custom-select-container" ref={selectRef}>
      
      {/* Przycisk główny z Placeholderem */}
      <div 
        className={`custom-select-trigger ${isOpen ? 'open' : ''}`} 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{ 
          opacity: disabled ? 0.5 : 1, 
          cursor: disabled ? 'not-allowed' : 'pointer' 
        }}
      >
        <span style={{ color: value ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          {value || placeholder}
        </span>
        
        {/* Strzałka, która płynnie obraca się przy otwieraniu */}
        <svg 
          width="16" height="16" viewBox="0 0 24 24" fill="none" 
          stroke="var(--accent-blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" 
          style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </div>

      {/* Rozwijana lista (tylko konkretne opcje, brak placeholdera!) */}
      {isOpen && !disabled && (
        <ul className="custom-select-dropdown">
          {options.map((opt, index) => (
            <li 
              key={index} 
              className={`custom-select-option ${value === opt ? 'selected' : ''}`}
              onClick={() => {
                onChange(opt);
                setIsOpen(false); // Zamyka listę po wyborze
              }}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
      
    </div>
  );
}