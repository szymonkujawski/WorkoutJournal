import { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError('Błąd logowania. Sprawdź e-mail i hasło.');
    }
  };

  return (
    <div style={{ maxWidth: '300px', margin: '0 auto', padding: '20px', border: '1px solid var(--border-color)', borderRadius: '12px', backgroundColor: 'var(--bg-surface)' }}>
      <h3 style={{ textAlign: 'center', margin: '0 0 20px 0', color: 'var(--text-primary)' }}>Logowanie</h3>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          type="email" 
          placeholder="E-mail" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />
        <input 
          type="password" 
          placeholder="Hasło" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
        />
        <button type="submit" style={{ padding: '12px', backgroundColor: 'var(--accent-blue)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>
          Zaloguj się
        </button>
      </form>
      {error && <p style={{ color: '#ff5252', fontSize: '0.9em', marginTop: '15px', textAlign: 'center' }}>{error}</p>}
    </div>
  );
}