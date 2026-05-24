import { useState } from 'react';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';

export default function Register() {
  // Stan (pamięć) dla pól formularza i komunikatów
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  // Funkcja uruchamiana po kliknięciu "Zarejestruj się"
  const handleRegister = async (e) => {
    e.preventDefault(); // Zapobiega przeładowaniu strony
    try {
      // Wywołanie funkcji z Firebase do tworzenia konta
      await createUserWithEmailAndPassword(auth, email, password);
      setMessage('Konto zostało pomyślnie utworzone!');
      setEmail('');
      setPassword('');
    } catch (error) {
      setMessage('Błąd: ' + error.message);
    }
  };

  return (
    <div style={{ maxWidth: '300px', margin: '20px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Rejestracja</h2>
      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
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
          placeholder="Hasło (min. 6 znaków)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{ padding: '8px' }}
        />
        <button type="submit" style={{ padding: '10px', cursor: 'pointer', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}>
          Zarejestruj się
        </button>
      </form>
      {message && <p style={{ marginTop: '15px', fontWeight: 'bold' }}>{message}</p>}
    </div>
  );
}