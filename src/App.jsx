import { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

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
    <div style={{ fontFamily: 'sans-serif' }}>
      {user ? (
        /* Włączamy BrowserRouter dla ZALOGOWANEGO użytkownika */
        <BrowserRouter>
          
          <header style={{ textAlign: 'center', padding: '15px 20px', borderBottom: '2px solid #eee', backgroundColor: '#fff' }}>
            <h1 style={{ fontSize: '1.4em', margin: 0, color: '#2196F3' }}>WorkoutJournal</h1>
          </header>
          
          {/* Główny kontener na treść strony - dodajemy dolny margines, żeby menu nie zasłaniało tekstu */}
          <main style={{ padding: '20px', paddingBottom: '80px' }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/history" element={<History />} />
              <Route path="/exercises" element={<Exercises />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </main>

          {/* Renderujemy nasze menu dolne */}
          <BottomNav />

        </BrowserRouter>
      ) : (
        /* Widok DLA NIEZALOGOWANYCH */
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h1>WorkoutJournal</h1>
          <p>Aplikacja do monitorowania postępów treningowych</p>
          
          {showLogin ? <Login /> : <Register />}
          
          <button 
            onClick={() => setShowLogin(!showLogin)} 
            style={{ marginTop: '20px', background: 'none', border: 'none', color: '#555', textDecoration: 'underline', cursor: 'pointer' }}
          >
            {showLogin ? "Nie masz konta? Zarejestruj się" : "Masz już konto? Zaloguj się"}
          </button>
        </div>
      )}
    </div>
  );
}

export default App;