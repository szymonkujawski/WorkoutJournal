import { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users_profiles', user.uid), {
        email: user.email,
        displayName: user.email.split('@')[0], 
        bio: 'Zaczynam przygodę ze sportem 🚀',
        createdAt: serverTimestamp()
      });
      
    } catch (err) {
      setError('Błąd rejestracji: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: '300px', margin: '0 auto', padding: '20px', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'var(--bg-surface)' }}>
      <h3 style={{ textAlign: 'center', margin: '0 0 20px 0', color: 'var(--text-primary)' }}>Rejestracja</h3>
      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          type="email" 
          placeholder="E-mail" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />
        <input 
          type="password" 
          placeholder="Hasło (min. 6 znaków)" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
        />
        <button type="submit" style={{ padding: '12px', backgroundColor: 'var(--accent-green)', color: '#121212', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
          Zarejestruj się
        </button>
      </form>
      {error && <p style={{ color: '#ff5252', fontSize: '0.9em', marginTop: '15px', textAlign: 'center' }}>{error}</p>}
    </div>
  );
}