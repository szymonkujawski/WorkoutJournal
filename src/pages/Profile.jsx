import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

export default function Profile() {
  const [bio, setBio] = useState('Zapalony sportowiec 🚀');
  const [isEditing, setIsEditing] = useState(false);
  const [tempBio, setTempBio] = useState('');

  const [stats, setStats] = useState({ total: 0, last30Days: 0 });
  const [prs, setPrs] = useState({ bench: 0, squat: 0, deadlift: 0 });
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  const user = auth.currentUser;

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;

      try {
        // 1. Pobieranie BIO z dedykowanej kolekcji 'users_profiles'
        const bioDocRef = doc(db, 'users_profiles', user.uid);
        const bioSnap = await getDoc(bioDocRef);
        if (bioSnap.exists() && bioSnap.data().bio) {
          setBio(bioSnap.data().bio);
        }

        // 2. Pobieranie treningów do statystyk i rekordów
        const q = query(
          collection(db, 'workouts'),
          where('userId', '==', user.uid)
        );
        const querySnapshot = await getDocs(q);
        
        const workouts = [];
        querySnapshot.forEach((doc) => workouts.push({ id: doc.id, ...doc.data() }));

        workouts.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        // Obliczanie treningów z ostatnich 30 dni
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
        let last30DaysCount = 0;
        workouts.forEach(w => {
          if (w.createdAt && w.createdAt.toDate() >= thirtyDaysAgo) {
            last30DaysCount++;
          }
        });

        setStats({ total: workouts.length, last30Days: last30DaysCount });

        // Obliczanie Maksymalnych Ciężarów (PR)
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

  // Funkcja zapisująca zaktualizowane BIO do Firestore
  const handleSaveBio = async () => {
    if (!user) return;
    try {
      const bioDocRef = doc(db, 'users_profiles', user.uid);
      // Używamy setDoc z { merge: true }, aby stworzyć dokument lub zaktualizować istniejący
      await setDoc(bioDocRef, { bio: tempBio }, { merge: true });
      setBio(tempBio);
      setIsEditing(false);
    } catch (error) {
      alert("Błąd podczas zapisu opisu: " + error.message);
    }
  };

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Czy na pewno chcesz się wylogować?");
    if (confirmLogout) {
      await signOut(auth);
    }
  };

  if (loading) return <p style={{ textAlign: 'center', marginTop: '20px' }}>Ładowanie profilu...</p>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '20px' }}>
      
      {/* Sekcja Nagłówka (Awatar i BIO) */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{ 
          width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#2196F3', 
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
          fontSize: '2em', margin: '0 auto 10px auto', fontWeight: 'bold' 
        }}>
          {user?.email ? user.email[0].toUpperCase() : 'U'}
        </div>
        <h3 style={{ margin: '5px 0' }}>{user?.displayName || user?.email}</h3>
        
        {/* Dynamiczny formularz BIO */}
        {isEditing ? (
          <div style={{ marginTop: '10px' }}>
            <input 
              type="text" 
              value={tempBio} 
              onChange={(e) => setTempBio(e.target.value)} 
              maxLength={60}
              style={{ padding: '6px', width: '80%', maxWidth: '300px', borderRadius: '4px', border: '1px solid #ccc' }}
            />
            <div style={{ marginTop: '5px', display: 'flex', gap: '5px', justifyContent: 'center' }}>
              <button onClick={() => setIsEditing(false)} style={{ padding: '3px 10px', fontSize: '0.85em', cursor: 'pointer' }}>Anuluj</button>
              <button onClick={handleSaveBio} style={{ padding: '3px 10px', fontSize: '0.85em', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Zapisz</button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '5px' }}>
            <p style={{ color: '#777', fontSize: '0.9em', margin: '0 0 5px 0', italic: 'true' }}>{bio}</p>
            <button 
              onClick={() => { setIsEditing(true); setTempBio(bio); }} 
              style={{ background: 'none', border: 'none', color: '#2196F3', fontSize: '0.85em', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Edytuj opis
            </button>
          </div>
        )}
      </div>

      {/* Sekcja Statystyk ilościowych */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        <div style={{ flex: 1, backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#2196F3' }}>{stats.total}</div>
          <div style={{ fontSize: '0.85em', color: '#666' }}>Wszystkie treningi</div>
        </div>
        <div style={{ flex: 1, backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#4CAF50' }}>{stats.last30Days}</div>
          <div style={{ fontSize: '0.85em', color: '#666' }}>Ostatnie 30 dni</div>
        </div>
      </div>

      {/* Rekordy w Trójboju */}
      <h4 style={{ borderBottom: '2px solid #eee', paddingBottom: '5px', marginBottom: '15px' }}>Rekordy (Trójbój)</h4>
      <div style={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '15px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontWeight: 'bold' }}>Wyciskanie (Bench)</span>
          <span style={{ color: '#2196F3', fontWeight: 'bold' }}>{prs.bench} kg</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontWeight: 'bold' }}>Przysiad (Squat)</span>
          <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>{prs.squat} kg</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold' }}>Martwy ciąg (Deadlift)</span>
          <span style={{ color: '#9C27B0', fontWeight: 'bold' }}>{prs.deadlift} kg</span>
        </div>
      </div>

      {/* 3 Ostatnie Treningi */}
      <h4 style={{ borderBottom: '2px solid #eee', paddingBottom: '5px', marginBottom: '15px' }}>Ostatnie sesje</h4>
      {recentWorkouts.length === 0 ? (
        <p style={{ color: '#777', textAlign: 'center' }}>Brak historii treningowej.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
          {recentWorkouts.map((workout) => (
            <div key={workout.id} style={{ padding: '10px 15px', backgroundColor: '#fafafa', borderLeft: '4px solid #ffa726', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <strong style={{ fontSize: '1em' }}>{workout.workoutName || 'Trening'}</strong>
                <span style={{ fontSize: '0.8em', color: '#888' }}>
                  {workout.createdAt?.toDate() ? workout.createdAt.toDate().toLocaleDateString('pl-PL') : ''}
                </span>
              </div>
              <div style={{ fontSize: '0.85em', color: '#555' }}>
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

      {/* Przycisk Wylogowania */}
      <button 
        onClick={handleLogout}
        style={{ width: '100%', padding: '15px', backgroundColor: '#fff', color: '#f44336', border: '1px solid #f44336', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1em' }}
      >
        Wyloguj się
      </button>

    </div>
  );
}