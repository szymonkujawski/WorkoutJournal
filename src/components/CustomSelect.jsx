import { useState, useRef, useEffect } from 'react';

export default function CustomSelect({ value, onChange, options, placeholder, disabled }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Zamykanie listy po kliknięciu gdziekolwiek indziej na stronie
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div 
      className="custom-select-container" 
      ref={containerRef} 
      style={{ 
        opacity: disabled ? 0.5 : 1, 
        pointerEvents: disabled ? 'none' : 'auto' 
      }}
    >
      <div 
        className={`custom-select-trigger ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ color: value ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          {value || placeholder}
        </span>
        
        {/* Obracająca się strzałka SVG */}
        <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease', display: 'flex' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </span>
      </div>

      {isOpen && (
        <ul className="custom-select-dropdown">
          <li 
            className="custom-select-option"
            onClick={() => handleSelect('')}
            style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}
          >
            {placeholder}
          </li>
          
          {options.map((opt, idx) => (
            <li 
              key={idx}
              className={`custom-select-option ${value === opt ? 'selected' : ''}`}
              onClick={() => handleSelect(opt)}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}