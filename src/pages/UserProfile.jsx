import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { motion } from 'framer-motion';

// IMPORT WIDŻETU STREAK (Pamiętaj o prawidłowej ścieżce, zakładam że jest w folderze wyżej w components)
import StreakWidget from '../components/StreakWidget';

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState(null);
  const [userWorkouts, setUserWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userRef = doc(db, 'users_profiles', id);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          setProfile(userSnap.data());
        }

        const q = query(
          collection(db, 'workouts'), 
          where('userId', '==', id)
        );
        const workoutSnap = await getDocs(q);
        const list = [];
        workoutSnap.forEach(doc => list.push({ id: doc.id, ...doc.data() }));
        
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

  if (loading) return <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)' }}>Ładowanie profilu...</p>;
  if (!profile) return <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)' }}>Użytkownik nie istnieje.</p>;

  const totalWorkouts = userWorkouts.length;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const workoutsLast30Days = userWorkouts.filter(w => {
    if (!w.createdAt) return false;
    return w.createdAt.toDate() >= thirtyDaysAgo;
  }).length;

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
    <motion.div 
      initial={{ opacity: 0, x: -20 }} 
      animate={{ opacity: 1, x: 0 }}   
      exit={{ opacity: 0, x: 20 }}     
      transition={{ duration: 0.2 }}
      style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '40px' }}
    >
      
      {/* PRZYCISK POWROTU NA GÓRZE */}
      <button 
        onClick={() => navigate(-1)} 
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: 'bold', marginBottom: '20px', padding: 0, fontSize: '1em' }}
      >
        ← Powrót
      </button>
      
      {/* SEKCJA GŁÓWNA PROFILU */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        
        <div style={{ 
          width: '90px', height: '90px', borderRadius: '50%', backgroundColor: 'var(--accent-blue)', 
          color: '#121212', display: 'flex', alignItems: 'center', justifyContent: 'center', 
          fontSize: '2.5em', margin: '0 auto 15px auto', fontWeight: 'bold', overflow: 'hidden',
          border: '3px solid var(--bg-surface)'
        }}>
          {profile.photoURL ? (
            <img src={profile.photoURL} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            (profile.username || profile.displayName || profile.email || 'U').charAt(0).toUpperCase()
          )}
        </div>
        
        <div style={{ marginTop: '5px' }}>
          <h2 style={{ margin: '0 0 5px 0', color: 'var(--text-primary)', fontSize: '1.6em' }}>
            {profile.username || profile.displayName || 'Użytkownik bez nazwy'}
          </h2>
          
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85em', margin: '0 0 10px 0' }}>
            {profile.email}
          </p>

          <p style={{ color: 'var(--text-primary)', fontSize: '0.95em', margin: '0 0 10px 0', fontStyle: 'italic' }}>
            {profile.bio || 'Zaczynam przygodę ze sportem 🚀'}
          </p>
        </div>
      </div>

      {/* WIDŻET STREAK ZNAJOMEGO */}
      {userWorkouts.length > 0 && (
        <StreakWidget workouts={userWorkouts} />
      )}

      {/* STATYSTYKI */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        <div style={{ flex: 1, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: 'var(--accent-blue)' }}>{totalWorkouts}</div>
          <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>Wszystkie treningi</div>
        </div>
        <div style={{ flex: 1, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '15px', borderRadius: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: 'var(--accent-green)' }}>{workoutsLast30Days}</div>
          <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>Ostatnie 30 dni</div>
        </div>
      </div>

      {/* REKORDY */}
      <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '5px', marginBottom: '15px', color: 'var(--text-primary)' }}>Rekordy (Trójbój)</h4>
      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '15px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: 'var(--text-primary)' }}>
          <span style={{ fontWeight: 'bold' }}>Wyciskanie (Bench)</span>
          <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>{maxBench} kg</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: 'var(--text-primary)' }}>
          <span style={{ fontWeight: 'bold' }}>Przysiad (Squat)</span>
          <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>{maxSquat} kg</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)' }}>
          <span style={{ fontWeight: 'bold' }}>Martwy ciąg (Deadlift)</span>
          <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>{maxDeadlift} kg</span>
        </div>
      </div>

      {/* OSTATNIE SESJE */}
      <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '5px', marginBottom: '15px', color: 'var(--text-primary)' }}>Ostatnie sesje</h4>
      {userWorkouts.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Brak historii treningowej.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
          {userWorkouts.map((workout) => (
            <Link 
              key={workout.id} 
              to={`/workout/${workout.id}`} 
              style={{ textDecoration: 'none', display: 'block' }}
            >
              <div 
                style={{ 
                  padding: '10px 15px', 
                  backgroundColor: 'var(--bg-surface)', 
                  borderLeft: '4px solid var(--accent-blue)', 
                  borderRadius: '6px',
                  transition: 'background-color 0.2s',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <strong style={{ fontSize: '1em', color: 'var(--text-primary)' }}>{workout.workoutName || 'Trening'}</strong>
                  <span style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }}>
                    {workout.createdAt?.toDate() ? workout.createdAt.toDate().toLocaleDateString('pl-PL') : 'Niedawno'}
                  </span>
                </div>
                <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>
                  {workout.exercises ? (
                    workout.exercises.map(ex => ex.name).join(', ')
                  ) : (
                    workout.exerciseName || 'Brak wpisanych ćwiczeń'
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

    </motion.div>
  );
}