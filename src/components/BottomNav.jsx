import { Link, useLocation } from 'react-router-dom';

export default function BottomNav() {
  const location = useLocation();

  // Zamieniliśmy emotikony na profesjonalne, minimalistyczne ikony SVG
  const navItems = [
    { 
      path: '/', 
      icon: (
        // Ikona: Dom / Główna
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      )
    },
    { 
      path: '/history', 
      icon: (
        // Ikona: Historia (Zegar)
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polyline points="12 6 12 12 16 14"></polyline>
        </svg>
      )
    },
    { 
      path: '/exercises', 
      icon: (
        // Ikona: Ćwiczenia (Lista)
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
      )
    },
    { 
      path: '/friends', 
      icon: (
        // Ikona: Społeczność (Grupa ludzi)
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      )
    },
    { 
      path: '/profile', 
      icon: (
        // Ikona: Profil (Użytkownik)
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      )
    }
  ];

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'var(--bg-surface)',
      borderTop: '1px solid var(--border-color)',
      display: 'flex',
      justifyContent: 'space-around',
      alignItems: 'center',
      padding: '12px 0',
      zIndex: 1000,
      paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' /* Wsparcie dla iPhone'ów */
    }}>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link 
            key={item.path} 
            to={item.path}
            style={{
              textDecoration: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              /* Dzięki temu SVG automatycznie zmienia kolor! */
              color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
              transition: 'color 0.2s ease, transform 0.2s ease',
              /* Lekkie powiększenie aktywnej ikony */
              transform: isActive ? 'scale(1.1)' : 'scale(1)',
              width: '28px',
              height: '28px'
            }}
          >
            {item.icon}
          </Link>
        );
      })}
    </nav>
  );
}