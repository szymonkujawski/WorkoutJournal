import { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Register from './components/Register';
import Login from './components/Login';
import WorkoutSession from './components/WorkoutSession';
import WorkoutHistory from './components/WorkoutHistory';

function App() {
  // Stan przechowujący aktualnie zalogowanego użytkownika
  const [user, setUser] = useState(null);
  // Stan do przełączania widoku między logowaniem a rejestracją
  const [showLogin, setShowLogin] = useState(true);

  // Nasłuchiwanie na zmiany stanu autoryzacji z Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Funkcja wylogowywania
  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>WorkoutJournal</h1>
      
      {/* Jeśli użytkownik jest ZALOGOWANY */}
      {user ? (
        <div>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #eee' }}>
            <p style={{ margin: 0 }}>Konto: <strong>{user.email}</strong></p>
            <button onClick={handleLogout} style={{ padding: '5px 15px', backgroundColor: '#f44336', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Wyloguj się
            </button>
          </header>
          
          {/* Wyświetlamy nasz nowy panel treningowy */}
          <WorkoutSession />

          {/* Wyświetlamy historię pod panelem */}
         <WorkoutHistory />
          
        </div>
      ) : (
        /* Jeśli użytkownik NIE JEST ZALOGOWANY */
        <div>
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