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
        const bioDocRef = doc(db, 'users_profiles', user.uid);
        const bioSnap = await getDoc(bioDocRef);
        if (bioSnap.exists() && bioSnap.data().bio) {
          setBio(bioSnap.data().bio);
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

  const handleSaveBio = async () => {
    if (!user) return;
    try {
      const bioDocRef = doc(db, 'users_profiles', user.uid);
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

  if (loading) return <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)' }}>Ładowanie profilu...</p>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '20px' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{ 
          width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--accent-blue)', 
          color: '#121212', display: 'flex', alignItems: 'center', justifyContent: 'center', 
          fontSize: '2em', margin: '0 auto 10px auto', fontWeight: 'bold' 
        }}>
          {user?.email ? user.email[0].toUpperCase() : 'U'}
        </div>
        <h3 style={{ margin: '5px 0', color: 'var(--text-primary)' }}>{user?.displayName || user?.email}</h3>
        
        {isEditing ? (
          <div style={{ marginTop: '10px' }}>
            <input 
              type="text" 
              value={tempBio} 
              onChange={(e) => setTempBio(e.target.value)} 
              maxLength={60}
              style={{ width: '80%', maxWidth: '300px', marginBottom: '10px' }}
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setIsEditing(false)} style={{ padding: '8px 15px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px', cursor: 'pointer' }}>Anuluj</button>
              <button onClick={handleSaveBio} style={{ padding: '8px 15px', backgroundColor: 'var(--accent-green)', color: '#121212', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Zapisz</button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: '5px' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9em', margin: '0 0 5px 0', fontStyle: 'italic' }}>{bio}</p>
            <button 
              onClick={() => { setIsEditing(true); setTempBio(bio); }} 
              style={{ background: 'none', border: 'none', color: 'var(--accent-blue)', fontSize: '0.85em', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Edytuj opis
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '30px' }}>
        <div style={{ flex: 1, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: 'var(--accent-blue)' }}>{stats.total}</div>
          <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>Wszystkie treningi</div>
        </div>
        <div style={{ flex: 1, backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: 'var(--accent-green)' }}>{stats.last30Days}</div>
          <div style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>Ostatnie 30 dni</div>
        </div>
      </div>

      <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '5px', marginBottom: '15px', color: 'var(--text-primary)' }}>Rekordy (Trójbój)</h4>
      <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '15px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: 'var(--text-primary)' }}>
          <span style={{ fontWeight: 'bold' }}>Wyciskanie (Bench)</span>
          <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>{prs.bench} kg</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: 'var(--text-primary)' }}>
          <span style={{ fontWeight: 'bold' }}>Przysiad (Squat)</span>
          <span style={{ color: 'var(--accent-green)', fontWeight: 'bold' }}>{prs.squat} kg</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)' }}>
          <span style={{ fontWeight: 'bold' }}>Martwy ciąg (Deadlift)</span>
          <span style={{ color: '#ce93d8', fontWeight: 'bold' }}>{prs.deadlift} kg</span>
        </div>
      </div>

      <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '5px', marginBottom: '15px', color: 'var(--text-primary)' }}>Ostatnie sesje</h4>
      {recentWorkouts.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>Brak historii treningowej.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '30px' }}>
          {recentWorkouts.map((workout) => (
            <div key={workout.id} style={{ padding: '10px 15px', backgroundColor: 'var(--bg-surface)', borderLeft: '4px solid var(--accent-blue)', borderRadius: '4px' }}>
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

      <button 
        onClick={handleLogout}
        style={{ width: '100%', padding: '15px', backgroundColor: 'transparent', color: '#ff5252', border: '1px solid #ff5252', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1em' }}
      >
        Wyloguj się
      </button>

    </div>
  );
}