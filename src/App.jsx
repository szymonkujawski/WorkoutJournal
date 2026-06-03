import UserProfile from './pages/UserProfile';
import { useState, useEffect, createContext, useContext } from 'react';
import { db, auth } from './firebase'; 
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'; 
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion'; 

import WorkoutDetails from './pages/WorkoutDetails';
import Register from './components/Register';
import Login from './components/Login';
import BottomNav from './components/BottomNav';
import Home from './pages/Home';
import History from './pages/History';
import Exercises from './pages/Exercises';
import Friends from './pages/Friends';
import Profile from './pages/Profile';

export const TimerContext = createContext();

function GlobalRestTimer() {
  const { restTime, isTimerActive, stopTimer, addTime } = useContext(TimerContext);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const location = useLocation();

  if (location.pathname === '/' || (!isTimerActive && restTime <= 0)) return null;

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '75px', 
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: 'var(--bg-surface)',
      border: '2px solid var(--accent-blue)',
      borderRadius: '16px',
      padding: isMinimized ? '8px 16px' : '15px',
      boxShadow: '0 8px 20px rgba(0,0,0,0.5)',
      zIndex: 1000,
      width: isMinimized ? 'auto' : '90%',
      maxWidth: '350px',
      transition: 'all 0.3s ease',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '10px'
    }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '15px' }}>
        
        <div 
          onClick={() => setIsMinimized(!isMinimized)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
        >
          <span style={{ fontSize: '1.2em' }}>⏱</span>
          <strong style={{ fontSize: '1.3em', color: restTime === 0 ? 'var(--accent-green)' : 'var(--text-primary)' }}>
            {restTime > 0 ? formatTime(restTime) : 'Gotowe!'}
          </strong>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {isMinimized && restTime > 0 && (
            <button onClick={() => setIsMinimized(false)} style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontWeight: 'bold', cursor: 'pointer' }}>
              Rozwiń
            </button>
          )}
          <button onClick={stopTimer} style={{ background: 'none', border: 'none', color: '#f44336', fontWeight: 'bold', fontSize: '1.2em', cursor: 'pointer', padding: '0 5px' }}>
            ✕
          </button>
        </div>
      </div>

      {!isMinimized && restTime > 0 && (
        <div style={{ display: 'flex', gap: '10px', width: '100%', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
          <button onClick={() => addTime(-30)} style={{ flex: 1, padding: '8px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer' }}>-30s</button>
          <button onClick={() => addTime(30)} style={{ flex: 1, padding: '8px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer' }}>+30s</button>
          <button onClick={() => addTime(60)} style={{ flex: 1, padding: '8px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer' }}>+1m</button>
        </div>
      )}
    </div>
  );
}

function AnimatedMain() {
  const location = useLocation();

  return (
    <>
      <header style={{ 
        textAlign: 'center', 
        padding: '15px 20px', 
        borderBottom: '1px solid var(--border-color)', 
        backgroundColor: 'var(--bg-surface)' 
      }}>
        <h1 style={{ fontSize: '1.4em', margin: 0, color: 'var(--accent-blue)' }}>WorkoutJournal</h1>
      </header>
      
      <main style={{ padding: '20px', paddingBottom: '80px', overflowX: 'hidden' }}>
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

      <GlobalRestTimer />

      <BottomNav />
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [showLogin, setShowLogin] = useState(true);

  const [restTime, setRestTime] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  
  // ZMIANA: Przechowujemy lokalizację inline timera globalnie
  const [activeTimerLocation, setActiveTimerLocation] = useState(null);

  useEffect(() => {
    let interval;
    if (isTimerActive && restTime > 0) {
      interval = setInterval(() => {
        setRestTime((prev) => prev - 1);
      }, 1000);
    } else if (isTimerActive && restTime === 0) {
      if ("vibrate" in navigator) {
        navigator.vibrate([300, 100, 300, 100, 300]);
      }
      setIsTimerActive(false);
      // ZMIANA: Kiedy timer dojdzie do zera, czyścimy jego lokalizację
      setActiveTimerLocation(null); 
    }
    return () => clearInterval(interval);
  }, [isTimerActive, restTime]);

  const startTimer = (seconds = 90) => {
    setRestTime(seconds);
    setIsTimerActive(true);
  };

  const stopTimer = () => {
    setIsTimerActive(false);
    setRestTime(0);
    // ZMIANA: Ręczne wyłączenie timera też ukrywa go w treningu
    setActiveTimerLocation(null);
  };

  const addTime = (seconds) => {
    setRestTime((prev) => {
      const newTime = prev + seconds;
      return newTime > 0 ? newTime : 0;
    });
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          getDocs(collection(db, 'exercises_dict')).catch(e => console.warn('Cache dict:', e));
          getDocs(query(collection(db, 'custom_exercises'), where('userId', '==', currentUser.uid))).catch(e => console.warn('Cache custom ex:', e));
          getDocs(query(collection(db, 'workouts'), where('userId', '==', currentUser.uid))).catch(e => console.warn('Cache workouts:', e));
          getDoc(doc(db, 'users_profiles', currentUser.uid)).catch(e => console.warn('Cache profile:', e));
        } catch (error) {
          console.warn("Wystąpił problem podczas pre-fetchingu danych:", error);
        }
      }
    });
    
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    // ZMIANA: Eksportujemy activeTimerLocation i setActiveTimerLocation do wszystkich widoków
    <TimerContext.Provider value={{ restTime, isTimerActive, startTimer, stopTimer, addTime, activeTimerLocation, setActiveTimerLocation }}>
      <div>
        {user ? (
          <BrowserRouter>
            <AnimatedMain />
          </BrowserRouter>
        ) : (
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
    </TimerContext.Provider>
  );
}

export default App;