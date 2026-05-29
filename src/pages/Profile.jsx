import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { signOut, updateProfile } from 'firebase/auth';

export default function Profile() {
  const [bio, setBio] = useState('Zapalony sportowiec 🚀');
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [tempBio, setTempBio] = useState('');
  const [tempUsername, setTempUsername] = useState('');
  const [tempPhotoUrl, setTempPhotoUrl] = useState('');

  const [stats, setStats] = useState({ total: 0, last30Days: 0 });
  const [prs, setPrs] = useState({ bench: 0, squat: 0, deadlift: 0 });
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const user = auth.currentUser;

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;

      // Ładujemy dane z autoryzacji Firebase
      setDisplayName(user.displayName || '');
      setPhotoURL(user.photoURL || '');

      try {
        const bioDocRef = doc(db, 'users_profiles', user.uid);
        const bioSnap = await getDoc(bioDocRef);
        if (bioSnap.exists()) {
          const data = bioSnap.data();
          if (data.bio) setBio(data.bio);
        }

        const q = query(
          collection(db, 'workouts'),
          where('userId', '==', user.uid)
        );
        const querySnapshot = await getDocs(q);
        
        const workouts = [];
        querySnapshot.forEach((doc) => workouts.push({ id: doc.id, ...doc.data() }));

        workouts.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        let last30DaysCount = 0;
        workouts.forEach(w => {
          if (w.createdAt && w.createdAt.toDate() >= thirtyDaysAgo) {
            last30DaysCount++;
          }
        });

        setStats({ total: workouts.length, last30Days: last30DaysCount });

        let maxBench = 0, maxSquat = 0, maxDeadlift = 0;
        workouts.forEach(w => {
          const checkSets = (exerciseName, sets) => {
            sets?.forEach(set => {
              if (exerciseName === 'Wyciskanie sztangi poziomo' && set.weight > maxBench) maxBench = set.weight;
              if (exerciseName === 'Przysiad ze sztangą' && set.weight > maxSquat) maxSquat = set.weight;
              if (exerciseName === 'Martwy ciąg' && set.weight > maxDeadlift) maxDeadlift = set.weight;
            });
          };

          if (w.exercises) {
            w.exercises.forEach(ex => checkSets(ex.name, ex.sets));
          } else if (w.exerciseName) {
            checkSets(w.exerciseName, w.sets);
          }
        });

        setPrs({ bench: maxBench, squat: maxSquat, deadlift: maxDeadlift });
        setRecentWorkouts(workouts.slice(0, 3));
        setLoading(false);
      } catch (error) {
        console.error("Błąd pobierania danych profilu:", error);
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [user]);

  const handleEditClick = () => {
    setTempBio(bio);
    setTempUsername(displayName);
    setTempPhotoUrl(photoURL);
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      // 1. Aktualizacja profilu wbudowanego w Firebase Auth
      await updateProfile(user, {
        displayName: tempUsername,
        photoURL: tempPhotoUrl
      });

      // 2. Aktualizacja w bazie Firestore (dla innych użytkowników wyszukujących Cię w aplikacji)
      const bioDocRef = doc(db, 'users_profiles', user.uid);
      await setDoc(bioDocRef, { 
        bio: tempBio,
        username: tempUsername,
        photoURL: tempPhotoUrl
      }, { merge: true });

      // 3. Aktualizacja lokalnego stanu
      setBio(tempBio);
      setDisplayName(tempUsername);
      setPhotoURL(tempPhotoUrl);
      setIsEditing(false);
    } catch (error) {
      alert("Błąd podczas zapisu profilu: " + error.message);
    }
  };

  const confirmLogout = async () => {
    await signOut(auth);
  };

  if (loading) return <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)' }}>Ładowanie profilu...</p>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '20px' }}>
      
      {/* SEKCJA GŁÓWNA PROFILU */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        
        {/* Awatar */}
        <div style={{ 
          width: '90px', height: '90px', borderRadius: '50%', backgroundColor: 'var(--accent-blue)', 
          color: '#121212', display: 'flex', alignItems: 'center', justifyContent: 'center', 
          fontSize: '2.5em', margin: '0 auto 15px auto', fontWeight: 'bold', overflow: 'hidden',
          border: '3px solid var(--bg-surface)'
        }}>
          {photoURL ? (
            <img src={photoURL} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            (displayName || user?.email || 'U')[0].toUpperCase()
          )}
        </div>
        
        {isEditing ? (
          <div style={{ marginTop: '10px', backgroundColor: 'var(--bg-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ margin: '0 0 15px 0', color: 'var(--accent-blue)' }}>Edycja profilu</h4>
            
            <input 
              type="text" 
              placeholder="Nazwa użytkownika"
              value={tempUsername} 
              onChange={(e) => setTempUsername(e.target.value)} 
              style={{ marginBottom: '10px' }}
            />
            
            <input 
              type="text" 
              placeholder="Link do zdjęcia profilowego (URL)"
              value={tempPhotoUrl} 
              onChange={(e) => setTempPhotoUrl(e.target.value)} 
              style={{ marginBottom: '10px' }}
            />

            <input 
              type="text" 
              placeholder="Krótki opis bio"
              value={tempBio} 
              onChange={(e) => setTempBio(e.target.value)} 
              maxLength={60}
              style={{ marginBottom: '20px' }}
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setIsEditing(false)} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '8px', cursor: 'pointer' }}>Anuluj</button>
              <button onClick={handleSaveProfile} style={{ flex: 1, padding: '10px', backgroundColor: 'var(--accent-green)', color: '#121212', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Zapisz</button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '5px' }}>
            {/* Nazwa użytkownika lub "Nieznany" */}
            <h2 style={{ margin: '0 0 5px 0', color: 'var(--text-primary)', fontSize: '1.6em' }}>
              {displayName || 'Użytkownik bez nazwy'}
            </h2>
            
            {/* Adres email dyskretnie pod spodem */}
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85em', margin: '0 0 10px 0' }}>
              {user?.email}
            </p>

            <p style={{ color: 'var(--text-primary)', fontSize: '0.95em', margin: '0 0 10px 0', fontStyle: 'italic' }}>
              {bio}
            </p>
            
            <button 
              onClick={handleEditClick} 
              style={{ padding: '8px 16px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '20px', fontSize: '0.85em', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Edytuj profil
            </button>
          </div>
        )}
      </div>

      {/* STATYSTYKI */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        <div style={{ flex: 1, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: 'var(--accent-blue)' }}>{stats.total}</div>
          <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>Wszystkie treningi</div>
        </div>
        <div style={{ flex: 1, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: 'var(--accent-green)' }}>{stats.last30Days}</div>
          <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>Ostatnie 30 dni</div>
        </div>
      </div>

      {/* REKORDY */}
      <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '5px', marginBottom: '15px', color: 'var(--text-primary)' }}>Rekordy (Trójbój)</h4>
      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '15px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: 'var(--text-primary)' }}>
          <span style={{ fontWeight: 'bold' }}>Wyciskanie (Bench)</span>
          <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>{prs.bench} kg</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: 'var(--text-primary)' }}>
          <span style={{ fontWeight: 'bold' }}>Przysiad (Squat)</span>
          <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>{prs.squat} kg</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)' }}>
          <span style={{ fontWeight: 'bold' }}>Martwy ciąg (Deadlift)</span>
          <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>{prs.deadlift} kg</span>
        </div>
      </div>

      {/* HISTORIA */}
      <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '5px', marginBottom: '15px', color: 'var(--text-primary)' }}>Ostatnie sesje</h4>
      {recentWorkouts.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Brak historii treningowej.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
          {recentWorkouts.map((workout) => (
            <div key={workout.id} style={{ padding: '10px 15px', backgroundColor: 'var(--bg-surface)', borderLeft: '4px solid var(--accent-blue)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <strong style={{ fontSize: '1em', color: 'var(--text-primary)' }}>{workout.workoutName || 'Trening'}</strong>
                <span style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }}>
                  {workout.createdAt?.toDate() ? workout.createdAt.toDate().toLocaleDateString('pl-PL') : ''}
                </span>
              </div>
              <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>
                {workout.exercises ? (
                  workout.exercises.map(ex => ex.name).join(', ')
                ) : (
                  workout.exerciseName
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Przycisk aktywujący modal zamiast systemowego alertu */}
      <button 
        onClick={() => setShowLogoutModal(true)}
        style={{ width: '100%', padding: '15px', backgroundColor: 'transparent', color: '#ff5252', border: '1px solid #ff5252', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1em' }}
      >
        Wyloguj się
      </button>

      {/* Nowy, spójny Modal Wylogowania */}
      {showLogoutModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '25px', borderRadius: '12px', border: '1px solid var(--border-color)', maxWidth: '350px', width: '90%', textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>Wylogowanie</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95em', marginBottom: '20px' }}>Czy na pewno chcesz wylogować się ze swojego konta?</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setShowLogoutModal(false)} style={{ padding: '10px 15px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>Anuluj</button>
              <button onClick={confirmLogout} style={{ padding: '10px 15px', border: 'none', borderRadius: '8px', backgroundColor: '#ff5252', color: '#121212', fontWeight: 'bold', cursor: 'pointer' }}>Wyloguj</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}