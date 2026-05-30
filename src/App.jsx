import UserProfile from './pages/UserProfile';
import { useState, useEffect } from 'react';
import { auth } from './firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion'; // Import Framer Motion

import WorkoutDetails from './pages/WorkoutDetails';
// Komponenty logowania
import Register from './components/Register';
import Login from './components/Login';

// Nasze nowe widoki (Strony) i Nawigacja
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import History from './pages/History';
import Exercises from './pages/Exercises';
import Friends from './pages/Friends';
import Profile from './pages/Profile';

// NOWOŚĆ: Wewnętrzny komponent nawigacji, pozwalający na użycie useLocation()
function AnimatedMain() {
  const location = useLocation();

  return (
    <>
      {/* Ciemny nagłówek ze zmiennymi CSS */}
      <header style={{ 
        textAlign: 'center', 
        padding: '15px 20px', 
        borderBottom: '1px solid var(--border-color)', 
        backgroundColor: 'var(--bg-surface)' 
      }}>
        <h1 style={{ fontSize: '1.4em', margin: 0, color: 'var(--accent-blue)' }}>WorkoutJournal</h1>
      </header>
      
      {/* Dodano overflowX: 'hidden', aby ukryć pasek przewijania podczas animacji wyjazdu ekranu */}
      <main style={{ padding: '20px', paddingBottom: '80px', overflowX: 'hidden' }}>
        
        {/* AnimatePresence owija nasze trasy, czekając aż stara zniknie (mode="wait") */}
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/history" element={<History />} />
            <Route path="/exercises" element={<Exercises />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/user/:id" element={<UserProfile />} />
            <Route path="/workout/:id" element={<WorkoutDetails />} />
          </Routes>
        </AnimatePresence>
        
      </main>

      <BottomNav />
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div>
      {user ? (
        <BrowserRouter>
          <AnimatedMain />
        </BrowserRouter>
      ) : (
        /* Widok DLA NIEZALOGOWANYCH dopasowany do ciemnego motywu */
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-primary)' }}>
          <h1 style={{ color: 'var(--accent-blue)' }}>WorkoutJournal</h1>
          
          {showLogin ? <Login /> : <Register />}
          
          <button 
            onClick={() => setShowLogin(!showLogin)} 
            style={{ 
              marginTop: '20px', 
              background: 'none', 
              border: 'none', 
              color: 'var(--accent-blue)', 
              textDecoration: 'underline', 
              cursor: 'pointer',
              fontSize: '1em'
            }}
          >
            {showLogin ? "Nie masz konta? Zarejestruj się" : "Masz już konto? Zaloguj się"}
          </button>
        </div>
      )}
    </div>
  );
}

export default App;