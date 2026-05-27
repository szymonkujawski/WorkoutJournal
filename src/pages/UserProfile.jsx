import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [userWorkouts, setUserWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // 1. Pobieramy profil znajomego
        const userRef = doc(db, 'users_profiles', id);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          setProfile(userSnap.data());
        }

        // 2. Pobieramy historię jego treningów
        const q = query(
          collection(db, 'workouts'), 
          where('userId', '==', id)
        );
        const workoutSnap = await getDocs(q);
        const list = [];
        workoutSnap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        
        // Sortujemy lokalnie od najświeższych
        list.sort((a, b) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateB - dateA;
        });

        setUserWorkouts(list);
        
      } catch (err) {
        console.error("Błąd pobierania profilu w UserProfile.jsx:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [id]);

  if (loading) return <p style={{ textAlign: 'center', marginTop: '20px' }}>Ładowanie profilu...</p>;
  if (!profile) return <p style={{ textAlign: 'center', marginTop: '20px' }}>Użytkownik nie istnieje.</p>;

  // ==========================================
  // --- OBLICZANIE STATYSTYK (IDENTYCZNE JAK W PROFILE.JSX) ---
  // ==========================================

  const totalWorkouts = userWorkouts.length;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const workoutsLast30Days = userWorkouts.filter(w => {
    if (!w.createdAt) return false;
    return w.createdAt.toDate() >= thirtyDaysAgo;
  }).length;

  // Przeniesiona i zabezpieczona logika wyciągania PR z Profile.jsx
  let maxBench = 0, maxSquat = 0, maxDeadlift = 0;
  
  userWorkouts.forEach(w => {
    const checkSets = (exerciseName, sets) => {
      sets?.forEach(set => {
        const weight = Number(set.weight) || 0;
        if (exerciseName === 'Wyciskanie sztangi poziomo' && weight > maxBench) maxBench = weight;
        if (exerciseName === 'Przysiad ze sztangą' && weight > maxSquat) maxSquat = weight;
        if (exerciseName === 'Martwy ciąg' && weight > maxDeadlift) maxDeadlift = weight;
      });
    };

    if (w.exercises) {
      w.exercises.forEach(ex => checkSets(ex.name, ex.sets));
    } else if (w.exerciseName) {
      checkSets(w.exerciseName, w.sets);
    }
  });

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', paddingBottom: '40px' }}>
      
      {/* Sekcja Nagłówka (Awatar i BIO) */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{ 
          width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#2196F3', 
          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', 
          fontSize: '2em', margin: '0 auto 10px auto', fontWeight: 'bold' 
        }}>
          {profile.email?.charAt(0).toUpperCase()}
        </div>
        <h3 style={{ margin: '5px 0' }}>{profile.displayName || profile.email}</h3>
        <div style={{ marginTop: '5px' }}>
          <p style={{ color: '#777', fontSize: '0.9em', margin: '0 0 5px 0', fontStyle: 'italic' }}>
            {profile.bio || 'Zaczynam przygodę ze sportem 🚀'}
          </p>
        </div>
      </div>

      {/* Sekcja Statystyk ilościowych */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        <div style={{ flex: 1, backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#2196F3' }}>{totalWorkouts}</div>
          <div style={{ fontSize: '0.85em', color: '#666' }}>Wszystkie treningi</div>
        </div>
        <div style={{ flex: 1, backgroundColor: '#f5f5f5', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#4CAF50' }}>{workoutsLast30Days}</div>
          <div style={{ fontSize: '0.85em', color: '#666' }}>Ostatnie 30 dni</div>
        </div>
      </div>

      {/* Rekordy w Trójboju */}
      <h4 style={{ borderBottom: '2px solid #eee', paddingBottom: '5px', marginBottom: '15px' }}>Rekordy (Trójbój)</h4>
      <div style={{ backgroundColor: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '15px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontWeight: 'bold' }}>Wyciskanie (Bench)</span>
          <span style={{ color: '#2196F3', fontWeight: 'bold' }}>{maxBench} kg</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontWeight: 'bold' }}>Przysiad (Squat)</span>
          <span style={{ color: '#4CAF50', fontWeight: 'bold' }}>{maxSquat} kg</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 'bold' }}>Martwy ciąg (Deadlift)</span>
          <span style={{ color: '#9C27B0', fontWeight: 'bold' }}>{maxDeadlift} kg</span>
        </div>
      </div>

      {/* Ostatnie Treningi */}
      <h4 style={{ borderBottom: '2px solid #eee', paddingBottom: '5px', marginBottom: '15px' }}>Ostatnie sesje</h4>
      {userWorkouts.length === 0 ? (
        <p style={{ color: '#777', textAlign: 'center' }}>Brak historii treningowej.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
          {userWorkouts.map((workout) => (
            <div key={workout.id} style={{ padding: '10px 15px', backgroundColor: '#fafafa', borderLeft: '4px solid #ffa726', borderRadius: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <strong style={{ fontSize: '1em' }}>{workout.workoutName || 'Trening'}</strong>
                <span style={{ fontSize: '0.8em', color: '#888' }}>
                  {workout.createdAt?.toDate() ? workout.createdAt.toDate().toLocaleDateString('pl-PL') : 'Niedawno'}
                </span>
              </div>
              <div style={{ fontSize: '0.85em', color: '#555' }}>
                {workout.exercises ? (
                  workout.exercises.map(ex => ex.name).join(', ')
                ) : (
                  workout.exerciseName || 'Brak wpisanych ćwiczeń'
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Przycisk Powrotu */}
      <button 
        onClick={() => navigate(-1)} 
        style={{ width: '100%', padding: '15px', backgroundColor: '#fff', color: '#555', border: '1px solid #ccc', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1em' }}
      >
        ← Powrót do społeczności
      </button>

    </div>
  );
}