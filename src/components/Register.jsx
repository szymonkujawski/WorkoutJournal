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
      // 1. Rejestracja w głównym systemie autoryzacji (Zakładka Authentication)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. NATYCHMIASTOWE utworzenie publicznego profilu w Firestore (Zakładka Database)
      await setDoc(doc(db, 'users_profiles', user.uid), {
        email: user.email,
        displayName: user.email.split('@')[0], // Ustawia nazwę na to, co jest przed @
        bio: 'Zaczynam przygodę ze sportem 🚀', // Od razu dajemy domyślne bio!
        createdAt: serverTimestamp()
      });

      console.log("Konto i profil publiczny zostały utworzone!");
      
    } catch (err) {
      setError('Błąd rejestracji: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: '300px', margin: '0 auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#f9f9f9' }}>
      <h3 style={{ textAlign: 'center', margin: '0 0 20px 0' }}>Rejestracja</h3>
      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input 
          type="email" 
          placeholder="E-mail" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <input 
          type="password" 
          placeholder="Hasło (min. 6 znaków)" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
          style={{ padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button type="submit" style={{ padding: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>
          Zarejestruj się
        </button>
      </form>
      {error && <p style={{ color: 'red', fontSize: '0.9em', marginTop: '15px', textAlign: 'center' }}>{error}</p>}
    </div>
  );
}