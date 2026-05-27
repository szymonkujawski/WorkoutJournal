import { Link, useLocation } from 'react-router-dom';
import { FaHome, FaHistory, FaDumbbell, FaUserFriends, FaUser } from 'react-icons/fa';

export default function BottomNav() {
  const location = useLocation();

  // Funkcja pomocnicza do sprawdzania, czy dany link jest aktywny (aby zmienić jego kolor)
  const isActive = (path) => location.pathname === path;

  // Style dla pojedynczego przycisku
  const linkStyle = (path) => ({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    color: isActive(path) ? '#2196F3' : '#777', // Niebieski jeśli aktywny, szary jeśli nie
    fontSize: '0.8em',
    padding: '10px 0',
    flex: 1,
  });

  const iconStyle = { fontSize: '1.5em', marginBottom: '4px' };

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      width: '100%',
      backgroundColor: '#fff',
      borderTop: '1px solid #ddd',
      display: 'flex',
      justifyContent: 'space-around',
      zIndex: 1000,
      boxShadow: '0 -2px 10px rgba(0,0,0,0.05)'
    }}>
      <Link to="/" style={linkStyle('/')}>
        <FaHome style={iconStyle} />
        <span>Główna</span>
      </Link>
      <Link to="/history" style={linkStyle('/history')}>
        <FaHistory style={iconStyle} />
        <span>Historia</span>
      </Link>
      <Link to="/exercises" style={linkStyle('/exercises')}>
        <FaDumbbell style={iconStyle} />
        <span>Ćwiczenia</span>
      </Link>
      <Link to="/friends" style={linkStyle('/friends')}>
        <FaUserFriends style={iconStyle} />
        <span>Znajomi</span>
      </Link>
      <Link to="/profile" style={linkStyle('/profile')}>
        <FaUser style={iconStyle} />
        <span>Profil</span>
      </Link>
    </nav>
  );
}