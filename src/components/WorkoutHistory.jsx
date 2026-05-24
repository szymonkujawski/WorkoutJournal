import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function WorkoutHistory() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sprawdzamy na wypadek, gdyby użytkownik jeszcze się nie załadował
    if (!auth.currentUser) return;

    // Pobieramy treningi zalogowanego użytkownika (bez orderBy, aby uniknąć problemów z indeksem na start)
    const q = query(
      collection(db, 'workouts'),
      where('userId', '==', auth.currentUser.uid)
    );

    // Słuchacz bazy w czasie rzeczywistym
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const workoutsArray = [];
      querySnapshot.forEach((doc) => {
        workoutsArray.push({ id: doc.id, ...doc.data() });
      });

      // Sortujemy lokalnie w JavaScript od najnowszych do najstarszych na podstawie createdAt
      workoutsArray.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA; // Najnowsze na górze
      });

      setWorkouts(workoutsArray);
      setLoading(false);
    }, (error) => {
      console.error("Błąd podczas pobierania historii:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <p style={{ textAlign: 'center' }}>Ładowanie historii treningów...</p>;

  return (
    <div style={{ maxWidth: '500px', margin: '20px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', textAlign: 'left' }}>
      <h3 style={{ textAlign: 'center' }}>Twój Dziennik Treningowy</h3>
      
      {workouts.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666' }}>Brak zapisanych treningów. Czas na pierwszą sesję!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {workouts.map((workout) => (
            <div key={workout.id} style={{ padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '6px', borderLeft: '5px solid #2196F3' }}>
              
              {/* Nagłówek treningu: Nazwa sesji i Data */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>
                <strong style={{ fontSize: '1.2em', color: '#333' }}>
                  {workout.workoutName || 'Trening'}
                </strong>
                <span style={{ fontSize: '0.85em', color: '#777' }}>
                  {workout.createdAt?.toDate() ? workout.createdAt.toDate().toLocaleDateString('pl-PL') : 'Przed chwilą'}
                </span>
              </div>
              
              {/* Główna pętla wyświetlająca ćwiczenia w danym treningu */}
              {workout.exercises && workout.exercises.length > 0 ? (
                workout.exercises.map((ex, exIdx) => (
                  <div key={exIdx} style={{ marginBottom: '12px', paddingLeft: '5px' }}>
                    <span style={{ fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>
                      {ex.name}
                    </span>
                    
                    {/* Podpętla wyświetlająca serie dla konkretnego ćwiczenia */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '15px', fontSize: '0.9em', color: '#666' }}>
                      {ex.sets?.map((set, setIdx) => (
                        <div key={setIdx}>
                          Seria {setIdx + 1}: <strong>{set.weight} kg</strong> x {set.reps} powt.
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                /* Kompatybilność wsteczna ze starym formatem (jedno ćwiczenie na dokument) */
                <div style={{ paddingLeft: '5px' }}>
                  <span style={{ fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>
                    {workout.exerciseName}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '15px', fontSize: '0.9em', color: '#666' }}>
                    {workout.sets?.map((set, setIdx) => (
                      <div key={setIdx}>
                        Seria {setIdx + 1}: <strong>{set.weight} kg</strong> x {set.reps} powt.
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  );
}