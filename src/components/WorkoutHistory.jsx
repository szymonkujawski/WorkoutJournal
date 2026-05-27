import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';

import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

export default function WorkoutHistory() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [workoutDates, setWorkoutDates] = useState(new Set());
  const [showCalendar, setShowCalendar] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'workouts'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const workoutsArray = [];
      const datesSet = new Set(); 

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        workoutsArray.push({ id: doc.id, ...data });

        if (data.createdAt) {
          const d = data.createdAt.toDate();
          const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          datesSet.add(dateString);
        }
      });

      workoutsArray.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });

      setWorkouts(workoutsArray);
      setWorkoutDates(datesSet);
      setLoading(false);
    }, (error) => {
      console.error("Błąd podczas pobierania historii:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatDuration = (totalSeconds) => {
    if (!totalSeconds) return 'Brak danych';
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes === 0) return `${seconds} sek`;
    return `${minutes} min ${seconds} sek`;
  };

  const calculateTotalVolume = (workout) => {
    let totalVolume = 0;
    if (workout.exercises) {
      workout.exercises.forEach(ex => {
        ex.sets?.forEach(set => {
          totalVolume += (set.weight * set.reps);
        });
      });
    } else if (workout.sets) {
      workout.sets.forEach(set => {
        totalVolume += (set.weight * set.reps);
      });
    }
    return totalVolume.toLocaleString('pl-PL');
  };

  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (workoutDates.has(dateString)) {
        return 'highlight-workout-day'; 
      }
    }
    return null;
  };

  const handleDayClick = (value) => {
    const clickedDate = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;

    if (workoutDates.has(clickedDate)) {
      const targetWorkout = workouts.find(w => {
        if (!w.createdAt) return false;
        const d = w.createdAt.toDate();
        const wDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return wDate === clickedDate;
      });

      if (targetWorkout) {
        const element = document.getElementById(`workout-${targetWorkout.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightedId(targetWorkout.id);
          setTimeout(() => setHighlightedId(null), 2000);
        }
      }
    }
  };

  const openDeleteModal = (workoutId) => {
    setIdToDelete(workoutId);
    setIsModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsModalOpen(false);
    setIdToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!idToDelete) return;
    try {
      const workoutDocRef = doc(db, 'workouts', idToDelete);
      await deleteDoc(workoutDocRef);
      closeDeleteModal();
    } catch (error) {
      alert("Błąd podczas usuwania: " + error.message);
    }
  };

  if (loading) return <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)' }}>Ładowanie historii treningów...</p>;

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'left', position: 'relative' }}>
      
      {/* CSS Kalendarza pod Ciemny Motyw */}
      <style>{`
        .react-calendar {
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 15px;
          font-family: inherit;
          margin-bottom: 25px;
          width: 100%;
          background-color: var(--bg-surface);
          color: var(--text-primary);
        }
        .react-calendar button {
          color: var(--text-primary);
        }
        .react-calendar__month-view__weekdays abbr {
          text-decoration: none;
          font-weight: 700;
          color: var(--text-secondary);
          font-size: 0.85em;
          text-transform: uppercase;
        }
        .react-calendar__tile {
          padding: 12px 6px;
          transition: all 0.2s ease-in-out;
          border-radius: 8px;
          margin: 2px 0;
        }
        .react-calendar__tile:enabled:hover,
        .react-calendar__tile:enabled:focus {
          background-color: var(--bg-surface-hover);
          border-radius: 8px;
        }
        .react-calendar__tile--now {
          background-color: var(--border-color);
          color: var(--accent-blue);
          font-weight: bold;
          border-radius: 8px;
        }
        .react-calendar__tile--now:enabled:hover {
          background-color: var(--bg-surface-hover);
        }
        .highlight-workout-day {
          background: var(--accent-blue) !important;
          color: #121212 !important;
          font-weight: bold;
          border-radius: 8px !important;
          transform: scale(0.92);
        }
        .react-calendar__tile--active {
          background-color: var(--bg-surface-hover) !important;
          border: 1px solid var(--accent-blue) !important;
          color: var(--accent-blue) !important;
          border-radius: 8px;
          transform: scale(0.92);
        }
        .react-calendar__month-view__days__day--neighboringMonth {
          color: var(--border-color) !important;
        }
        .react-calendar__navigation button {
          min-width: 44px;
          background: none;
          font-size: 1.2em;
          font-weight: bold;
          border-radius: 8px;
        }
        .react-calendar__navigation button:enabled:hover,
        .react-calendar__navigation button:enabled:focus {
          background-color: var(--bg-surface-hover);
        }
      `}</style>
      
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button 
          onClick={() => setShowCalendar(!showCalendar)}
          style={{ padding: '8px 15px', backgroundColor: 'var(--bg-surface)', color: 'var(--accent-blue)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {showCalendar ? "Ukryj kalendarz" : "Pokaż kalendarz aktywności"}
        </button>
      </div>

      {showCalendar && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Calendar 
            tileClassName={tileClassName}
            onClickDay={handleDayClick}
            locale="pl-PL" 
          />
        </div>
      )}

      {/* --- LISTA TRENINGÓW --- */}
      {workouts.length === 0 ? (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Brak zapisanych treningów. Czas na pierwszą sesję!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {workouts.map((workout) => (
            <div 
              key={workout.id} 
              id={`workout-${workout.id}`} 
              style={{ 
                padding: '15px', 
                borderRadius: '12px', 
                position: 'relative',
                transition: 'all 0.5s ease', 
                backgroundColor: highlightedId === workout.id ? 'var(--bg-surface-hover)' : 'var(--bg-surface)', 
                borderLeft: highlightedId === workout.id ? '5px solid var(--accent-green)' : '5px solid var(--accent-blue)',
                borderTop: '1px solid var(--border-color)',
                borderRight: '1px solid var(--border-color)',
                borderBottom: '1px solid var(--border-color)',
                transform: highlightedId === workout.id ? 'scale(1.02)' : 'scale(1)'
              }}
            >  
              <button 
                onClick={() => openDeleteModal(workout.id)}
                style={{ position: 'absolute', top: '15px', right: '15px', backgroundColor: 'transparent', border: 'none', color: '#f44336', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9em' }}
                title="Usuń trening"
              >
                ✕ Usuń
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', paddingRight: '60px' }}>
                <strong style={{ fontSize: '1.2em', color: 'var(--text-primary)' }}>
                  {workout.workoutName || 'Trening'}
                </strong>
                <span style={{ fontSize: '0.85em', color: 'var(--text-secondary)', alignSelf: 'center' }}>
                  {workout.createdAt?.toDate() ? workout.createdAt.toDate().toLocaleDateString('pl-PL') : 'Przed chwilą'}
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '15px', fontSize: '0.85em', color: 'var(--text-secondary)', marginBottom: '12px', fontStyle: 'italic' }}>
                <span>Czas: <strong style={{ color: 'var(--text-primary)' }}>{formatDuration(workout.duration)}</strong></span>
                <span>Objętość: <strong style={{ color: 'var(--text-primary)' }}>{calculateTotalVolume(workout)} kg</strong></span>
              </div>
              
              {workout.exercises && workout.exercises.length > 0 ? (
                workout.exercises.map((ex, exIdx) => (
                  <div key={exIdx} style={{ marginBottom: '12px', paddingLeft: '5px' }}>
                    <span style={{ fontWeight: '600', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                      {ex.name}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '15px', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                      {ex.sets?.map((set, setIdx) => (
                        <div key={setIdx}>
                          Seria {setIdx + 1}: <strong style={{ color: 'var(--accent-blue)' }}>{set.weight} kg</strong> x {set.reps} powt.
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ paddingLeft: '5px' }}>
                  <span style={{ fontWeight: '600', color: 'var(--text-primary)', display: 'block', marginBottom: '4px' }}>
                    {workout.exerciseName}
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingLeft: '15px', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                    {workout.sets?.map((set, setIdx) => (
                      <div key={setIdx}>
                        Seria {setIdx + 1}: <strong style={{ color: 'var(--accent-blue)' }}>{set.weight} kg</strong> x {set.reps} powt.
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          ))}
        </div>
      )}

      {/* Pop-up potwierdzenia usunięcia z ciemnym motywem */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '25px', borderRadius: '12px', border: '1px solid var(--border-color)', maxWidth: '350px', width: '90%', textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>Potwierdź usunięcie</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95em', marginBottom: '20px' }}>Czy na pewno chcesz bezpowrotnie usunąć ten trening z historii?</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={closeDeleteModal} style={{ padding: '10px 15px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>Anuluj</button>
              <button onClick={handleConfirmDelete} style={{ padding: '10px 15px', border: 'none', borderRadius: '8px', backgroundColor: '#f44336', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Tak, usuń</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}