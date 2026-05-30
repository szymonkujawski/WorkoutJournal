import { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username.trim()) {
      setError('Nazwa użytkownika jest wymagana.');
      setLoading(false);
      return;
    }

    try {
      // 1. Tworzenie konta w Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Aktualizacja profilu w Firebase Auth o podaną nazwę
      await updateProfile(user, {
        displayName: username.trim()
      });

      // 3. Od razu tworzymy profil użytkownika w bazie danych (dla zakładki Profil i Znajomi)
      await setDoc(doc(db, 'users_profiles', user.uid), {
        username: username.trim(),
        email: email,
        bio: 'Zaczynam przygodę ze sportem 🚀',
        photoURL: '',
        createdAt: new Date()
      });

    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Konto z tym adresem e-mail już istnieje.');
      } else if (err.code === 'auth/weak-password') {
        setError('Hasło musi mieć co najmniej 6 znaków.');
      } else {
        setError('Błąd rejestracji: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
      <h2 style={{ color: 'var(--text-primary)', marginBottom: '20px' }}>Zarejestruj się</h2>
      
      {error && (
        <div style={{ backgroundColor: 'rgba(244, 67, 54, 0.1)', border: '1px solid #f44336', color: '#f44336', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.9em' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        {/* NOWE POLE: Nazwa użytkownika */}
        <div>
          <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)', fontSize: '0.9em', textAlign: 'left' }}>
            Nazwa użytkownika
          </label>
          <input 
            type="text" 
            placeholder="np. JanKowalski" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            required
            style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '1em', outline: 'none' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)', fontSize: '0.9em', textAlign: 'left' }}>
            Adres e-mail
          </label>
          <input 
            type="email" 
            placeholder="twoj@email.com" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required
            style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '1em', outline: 'none' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', color: 'var(--text-secondary)', fontSize: '0.9em', textAlign: 'left' }}>
            Hasło
          </label>
          <input 
            type="password" 
            placeholder="Min. 6 znaków" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required
            minLength={6}
            style={{ width: '100%', padding: '12px 15px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: '1em', outline: 'none' }}
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          style={{ width: '100%', padding: '14px', backgroundColor: 'var(--accent-blue)', color: '#121212', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1em', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '10px', transition: 'opacity 0.2s' }}
        >
          {loading ? 'Tworzenie konta...' : 'Zarejestruj się'}
        </button>
      </form>
    </div>
  );
}