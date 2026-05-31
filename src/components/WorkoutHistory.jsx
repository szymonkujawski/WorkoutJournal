import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

export default function WorkoutHistory() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Stany dla kalendarza
  const [workoutDates, setWorkoutDates] = useState(new Set());
  const [showCalendar, setShowCalendar] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);

  // NOWOŚĆ: Stany dla modala usuwania
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workoutToDelete, setWorkoutToDelete] = useState(null);

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

        // Dodawanie dat do kalendarza
        if (data.createdAt) {
          const d = data.createdAt.toDate();
          const dateString = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          datesSet.add(dateString);
        }
      });

      // Sortowanie chronologiczne od najnowszych
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

  // ZMIANA: Zamiast window.confirm, odpalamy modal
  const handleDeleteClick = (e, workoutId) => {
    e.preventDefault();
    e.stopPropagation(); // Blokuje otwarcie szczegółów sesji podczas klikania w przycisk
    setWorkoutToDelete(workoutId);
    setShowDeleteModal(true);
  };

  // NOWOŚĆ: Funkcja do faktycznego skasowania po potwierdzeniu
  const confirmDelete = async () => {
    if (!workoutToDelete) return;
    try {
      await deleteDoc(doc(db, 'workouts', workoutToDelete));
      setShowDeleteModal(false);
      setWorkoutToDelete(null);
    } catch (error) {
      alert("Błąd podczas usuwania: " + error.message);
    }
  };

  // NOWOŚĆ: Anulowanie kasowania
  const cancelDelete = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowDeleteModal(false);
    setWorkoutToDelete(null);
  };

  // --- LOGIKA KALENDARZA ---
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

  if (loading) return <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)' }}>Ładowanie historii treningów...</p>;
  if (workouts.length === 0) return <p style={{ textAlign: 'center', marginTop: '30px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Brak zapisanych treningów w historii.</p>;

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '15px', textAlign: 'left', position: 'relative' }}>
      
      {/* --- STYL KALENDARZA --- */}
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
      
      {/* Przycisk Pokaż/Ukryj Kalendarz */}
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
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
      {workouts.map((workout) => (
        <div 
          key={workout.id} 
          id={`workout-${workout.id}`}
          onClick={() => navigate(`/workout/${workout.id}`)}
          style={{ 
            padding: '18px', 
            borderRadius: '12px', 
            backgroundColor: highlightedId === workout.id ? 'var(--bg-surface-hover)' : 'var(--bg-surface)', 
            border: '1px solid var(--border-color)',
            borderLeft: highlightedId === workout.id ? '5px solid var(--accent-green)' : '5px solid var(--accent-blue)',
            position: 'relative',
            transition: 'all 0.3s ease', 
            cursor: 'pointer',
            transform: highlightedId === workout.id ? 'scale(1.02)' : 'scale(1)'
          }}
          onMouseEnter={(e) => { if(highlightedId !== workout.id) e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)' }}
          onMouseLeave={(e) => { if(highlightedId !== workout.id) e.currentTarget.style.backgroundColor = 'var(--bg-surface)' }}
        >  
          {/* Przycisk Usuń - teraz wywołuje handleDeleteClick */}
          <button 
            onClick={(e) => handleDeleteClick(e, workout.id)}
            style={{ position: 'absolute', top: '18px', right: '18px', backgroundColor: 'transparent', border: 'none', color: 'rgba(244, 67, 54, 0.6)', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85em', transition: 'color 0.2s' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#f44336'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(244, 67, 54, 0.6)'}
          >
            ✕ Usuń
          </button>

          {/* Nagłówek: Nazwa treningu i Data */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', paddingRight: '65px' }}>
            <strong style={{ fontSize: '1.2em', color: 'var(--accent-blue)' }}>
              {workout.workoutName || 'Trening'}
            </strong>
            <span style={{ fontSize: '0.85em', color: 'var(--text-secondary)', alignSelf: 'center' }}>
              {workout.createdAt?.toDate() ? workout.createdAt.toDate().toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Niedawno'}
            </span>
          </div>
          
          {/* Czas, Objętość i Rekordy (PR) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', fontSize: '0.85em', color: 'var(--text-secondary)', marginBottom: '15px', fontStyle: 'italic' }}>
            <span>Czas: <strong style={{ color: 'var(--text-primary)' }}>{formatDuration(workout.duration)}</strong></span>
            <span>Objętość: <strong style={{ color: 'var(--text-primary)' }}>{calculateTotalVolume(workout)} kg</strong></span>
            
            {/* Wyświetlanie PR z ujednoliconym stylem */}
            {workout.prCount && workout.prCount > 0 ? (
              <span>Rekordy: <strong style={{ color: 'var(--text-primary)' }}>{workout.prCount}</strong></span>
            ) : null}
          </div>
          
          {/* Rozpiska Ćwiczeń oraz dokładnych serii/kilogramów */}
          {workout.exercises && workout.exercises.length > 0 ? (
            workout.exercises.map((ex, exIdx) => (
              <div key={exIdx} style={{ marginBottom: '12px', paddingLeft: '2px' }}>
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
            <div style={{ paddingLeft: '2px' }}>
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

      {/* MODAL POTWIERDZENIA USUNIĘCIA */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '30px 25px', borderRadius: '16px', border: '2px solid #f44336', maxWidth: '350px', width: '90%', textAlign: 'center', boxShadow: '0 10px 30px rgba(244, 67, 54, 0.2)' }}>
            
            <h2 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>Usunąć trening?</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95em', margin: '0 0 25px 0', lineHeight: '1.5' }}>
              Czy na pewno chcesz usunąć ten trening z historii? Ta operacja jest <strong style={{color: '#f44336'}}>nieodwracalna</strong>.
            </p>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={cancelDelete} 
                style={{ flex: 1, padding: '12px', border: '1px solid var(--border-color)', borderRadius: '10px', backgroundColor: 'transparent', color: 'var(--text-primary)', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                Anuluj
              </button>
              <button 
                onClick={confirmDelete} 
                style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '10px', backgroundColor: '#f44336', color: '#fff', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                Usuń
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}