import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';

export default function WorkoutHistory() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Stany do obsługi autorskiego pop-upa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'workouts'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const workoutsArray = [];
      querySnapshot.forEach((doc) => {
        workoutsArray.push({ id: doc.id, ...doc.data() });
      });

      workoutsArray.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });

      setWorkouts(workoutsArray);
      setLoading(false);
    }, (error) => {
      console.error("Błąd podczas pobierania historii:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Otwarcie pop-upa i zapamiętanie, który trening chcemy usunąć
  const openDeleteModal = (workoutId) => {
    setIdToDelete(workoutId);
    setIsModalOpen(true);
  };

  // Zamknięcie pop-upa bez usuwania
  const closeDeleteModal = () => {
    setIsModalOpen(false);
    setIdToDelete(null);
  };

  // Potwierdzenie usunięcia z poziomu pop-upa
  const handleConfirmDelete = async () => {
    if (!idToDelete) return;
    try {
      const workoutDocRef = doc(db, 'workouts', idToDelete);
      await deleteDoc(workoutDocRef);
      closeDeleteModal(); // zamykamy okienko po sukcesie
    } catch (error) {
      alert("Błąd podczas usuwania: " + error.message);
    }
  };

  if (loading) return <p style={{ textAlign: 'center' }}>Ładowanie historii treningów...</p>;

  return (
    <div style={{ maxWidth: '500px', margin: '20px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', textAlign: 'left', position: 'relative' }}>
      <h3 style={{ textAlign: 'center' }}>Twój Dziennik Treningowy</h3>
      
      {workouts.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666' }}>Brak zapisanych treningów. Czas na pierwszą sesję!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {workouts.map((workout) => (
            <div key={workout.id} style={{ padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '6px', borderLeft: '5px solid #2196F3', position: 'relative' }}>
              
              {/* Przycisk otwierający nasz pop-up */}
              <button 
                onClick={() => openDeleteModal(workout.id)}
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#f44336',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.9em'
                }}
                title="Usuń trening"
              >
                ✕ Usuń
              </button>

              {/* Nagłówek treningu */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid #ddd', paddingBottom: '5px', paddingRight: '60px' }}>
                <strong style={{ fontSize: '1.2em', color: '#333' }}>
                  {workout.workoutName || 'Trening'}
                </strong>
                <span style={{ fontSize: '0.85em', color: '#777', alignSelf: 'center' }}>
                  {workout.createdAt?.toDate() ? workout.createdAt.toDate().toLocaleDateString('pl-PL') : 'Przed chwilą'}
                </span>
              </div>
              
              {/* Wyświetlanie ćwiczeń */}
              {workout.exercises && workout.exercises.length > 0 ? (
                workout.exercises.map((ex, exIdx) => (
                  <div key={exIdx} style={{ marginBottom: '12px', paddingLeft: '5px' }}>
                    <span style={{ fontWeight: '600', color: '#555', display: 'block', marginBottom: '4px' }}>
                      {ex.name}
                    </span>
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

      {/* --- AUTORSKI POP-UP MODAL --- */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.5)', // Przyciemnienie tła strony
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000 // Pewność, że modal będzie na samej górze
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '25px',
            borderRadius: '8px',
            boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            maxWidth: '350px',
            width: '90%',
            textAlign: 'center'
          }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Potwierdź usunięcie</h4>
            <p style={{ color: '#666', fontSize: '0.95em', marginBottom: '20px' }}>Czy na pewno chcesz bezpowrotnie usunąć ten trening z historii?</p>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                onClick={closeDeleteModal}
                style={{ padding: '8px 15px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff', cursor: 'pointer' }}
              >
                Anuluj
              </button>
              <button 
                onClick={handleConfirmDelete}
                style={{ padding: '8px 15px', border: 'none', borderRadius: '4px', backgroundColor: '#f44336', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Tak, usuń
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}