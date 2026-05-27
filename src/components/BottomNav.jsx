import { Link, useLocation } from 'react-router-dom';

export default function BottomNav() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Trening', icon: '🏋️‍♂️' },
    { path: '/history', label: 'Historia', icon: '📅' },
    { path: '/exercises', label: 'Ćwiczenia', icon: '📖' },
    { path: '/friends', label: 'Społeczność', icon: '👥' },
    { path: '/profile', label: 'Profil', icon: '👤' }
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
      padding: '10px 0',
      zIndex: 1000,
      paddingBottom: 'env(safe-area-inset-bottom)' /* Bezpieczny margines dla iPhone'ów */
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
              color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
              fontSize: '0.85em',
              fontWeight: isActive ? 'bold' : 'normal',
              transition: 'color 0.2s ease'
            }}
          >
            <span style={{ 
              fontSize: '1.5em', 
              marginBottom: '4px',
              /* Jeśli ikona jest nieaktywna, wyszarzamy ją lekko */
              filter: isActive ? 'none' : 'grayscale(100%) opacity(0.6)'
            }}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}