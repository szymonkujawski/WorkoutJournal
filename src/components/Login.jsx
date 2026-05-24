import { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Jeśli się uda, Firebase sam zapamięta sesję, nie musimy tu nic wyświetlać
    } catch (err) {
      setError('Nieprawidłowy e-mail lub hasło.');
    }
  };

  return (
    <div style={{ maxWidth: '300px', margin: '20px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Logowanie</h2>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input
          type="email"
          placeholder="Adres e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{ padding: '8px' }}
        />
        <input
          type="password"
          placeholder="Hasło"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '8px' }}
        />
        <button type="submit" style={{ padding: '10px', cursor: 'pointer', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px' }}>
          Zaloguj się
        </button>
      </form>
      {error && <p style={{ color: 'red', marginTop: '15px' }}>{error}</p>}
    </div>
  );
}