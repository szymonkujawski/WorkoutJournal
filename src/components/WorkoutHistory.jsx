import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, onSnapshot, doc, deleteDoc } from 'firebase/firestore';

// Importujemy kalendarz i jego domyślne style
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

export default function WorkoutHistory() {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Stany dla kalendarza i modali
  const [workoutDates, setWorkoutDates] = useState(new Set());
  const [showCalendar, setShowCalendar] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [idToDelete, setIdToDelete] = useState(null);

  // Nowy stan do podświetlania wybranego treningu
  const [highlightedId, setHighlightedId] = useState(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'workouts'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const workoutsArray = [];
      const datesSet = new Set(); // Zbiór unikalnych dat treningów

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        workoutsArray.push({ id: doc.id, ...data });

        // Formatujemy datę do YYYY-MM-DD, aby łatwo porównywać ją w kalendarzu
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

  // --- FUNKCJA DLA KALENDARZA: Sprawdza, czy w danym dniu był trening ---
  const tileClassName = ({ date, view }) => {
    if (view === 'month') {
      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      if (workoutDates.has(dateString)) {
        return 'highlight-workout-day'; // Zwracamy naszą autorską klasę CSS
      }
    }
    return null;
  };

  // --- NOWA FUNKCJA: Przewijanie do treningu po kliknięciu w dzień ---
  const handleDayClick = (value) => {
    // 1. Formatujemy klikniętą datę
    const clickedDate = `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;

    // 2. Sprawdzamy, czy w tym dniu był jakiś trening
    if (workoutDates.has(clickedDate)) {
      // 3. Znajdujemy pierwszy trening w tablicy workouts, który pasuje do tej daty
      const targetWorkout = workouts.find(w => {
        if (!w.createdAt) return false;
        const d = w.createdAt.toDate();
        const wDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        return wDate === clickedDate;
      });

      // 4. Jeśli znaleźliśmy trening, przewijamy do niego ekran i go podświetlamy
      if (targetWorkout) {
        const element = document.getElementById(`workout-${targetWorkout.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setHighlightedId(targetWorkout.id);
          
          // Usuwamy podświetlenie po 2 sekundach
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

  if (loading) return <p style={{ textAlign: 'center', marginTop: '20px' }}>Ładowanie historii treningów...</p>;

  return (
    <div style={{ maxWidth: '500px', margin: '20px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', textAlign: 'left', position: 'relative' }}>
      
      {/* Wstrzykujemy zaawansowany CSS dla nowoczesnego wyglądu kalendarza */}
      <style>{`
        /* Cały kontener kalendarza */
        .react-calendar {
          border: none;
          border-radius: 16px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.06);
          padding: 15px;
          font-family: inherit;
          margin-bottom: 25px;
          width: 100%;
          background-color: #ffffff;
        }

        /* Usunięcie brzydkich podkreśleń pod dniami tygodnia i zmiana koloru */
        .react-calendar__month-view__weekdays abbr {
          text-decoration: none;
          font-weight: 700;
          color: #999;
          font-size: 0.85em;
          text-transform: uppercase;
        }

        /* Wygląd pojedynczego kafelka (dnia) */
        .react-calendar__tile {
          padding: 12px 6px;
          transition: all 0.2s ease-in-out;
          border-radius: 8px; /* Nowoczesne, zaokrąglone kafelki */
          margin: 2px 0;
        }

        /* Hover na zwykłym dniu */
        .react-calendar__tile:enabled:hover,
        .react-calendar__tile:enabled:focus {
          background-color: #f0f0f0;
          border-radius: 8px;
        }

        /* Dzisiejszy dzień (subtelny niebieski zamiast domyślnego żółtego) */
        .react-calendar__tile--now {
          background-color: #e3f2fd;
          color: #1976d2;
          font-weight: bold;
          border-radius: 8px;
        }
        .react-calendar__tile--now:enabled:hover {
          background-color: #bbdefb;
        }

        /* Dzień z naszym treningiem (Gradient + cień) */
        .highlight-workout-day {
          background: linear-gradient(135deg, #4CAF50, #2E7D32) !important;
          color: white !important;
          font-weight: bold;
          border-radius: 8px !important;
          box-shadow: 0 4px 10px rgba(76, 175, 80, 0.3);
          transform: scale(0.92); /* Lekko go pomniejszamy, żeby kafelki się nie zlewały */
        }

        /* Kliknięty dzień (niebieski akcent) */
        .react-calendar__tile--active {
          background-color: #2196F3 !important;
          color: white !important;
          border-radius: 8px;
          transform: scale(0.92);
        }

        /* Mocne przyciemnienie dni z poprzedniego/następnego miesiąca */
        .react-calendar__month-view__days__day--neighboringMonth {
          color: #e0e0e0 !important;
        }

        /* Ukrycie obramowania przycisków nawigacji miesiącami */
        .react-calendar__navigation button {
          min-width: 44px;
          background: none;
          font-size: 1.2em;
          font-weight: bold;
          border-radius: 8px;
        }
        .react-calendar__navigation button:enabled:hover,
        .react-calendar__navigation button:enabled:focus {
          background-color: #f0f0f0;
        }
      `}</style>

      <h3 style={{ textAlign: 'center', margin: '0 0 20px 0' }}>Twój Dziennik Treningowy</h3>
      
      {/* --- SEKCJA KALENDARZA --- */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <button 
          onClick={() => setShowCalendar(!showCalendar)}
          style={{ padding: '8px 15px', backgroundColor: '#e3f2fd', color: '#1976d2', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {showCalendar ? "Ukryj kalendarz ⬆️" : "Pokaż kalendarz aktywności 📅"}
        </button>
      </div>

      {showCalendar && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Calendar 
            tileClassName={tileClassName}
            onClickDay={handleDayClick}
            locale="pl-PL" // Ustawiamy polskie nazwy miesięcy i dni
          />
        </div>
      )}

      {/* --- LISTA TRENINGÓW --- */}
      {workouts.length === 0 ? (
        <p style={{ textAlign: 'center', color: '#666' }}>Brak zapisanych treningów. Czas na pierwszą sesję!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {workouts.map((workout) => (
            <div 
              key={workout.id} 
              id={`workout-${workout.id}`} // <--- ID KARTY
              style={{ 
                padding: '15px', 
                borderRadius: '6px', 
                position: 'relative',
                transition: 'all 0.5s ease', // Płynne przejście kolorów
                // Poniżej dynamiczna zmiana kolorów jeśli trening jest podświetlony
                backgroundColor: highlightedId === workout.id ? '#fff3e0' : '#f5f5f5', 
                borderLeft: highlightedId === workout.id ? '5px solid #ff9800' : '5px solid #2196F3',
                transform: highlightedId === workout.id ? 'scale(1.02)' : 'scale(1)'
              }}
            >  
              <button 
                onClick={() => openDeleteModal(workout.id)}
                style={{ position: 'absolute', top: '12px', right: '12px', backgroundColor: 'transparent', border: 'none', color: '#f44336', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9em' }}
                title="Usuń trening"
              >
                ✕ Usuń
              </button>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', borderBottom: '1px solid #ddd', paddingBottom: '5px', paddingRight: '60px' }}>
                <strong style={{ fontSize: '1.2em', color: '#333' }}>
                  {workout.workoutName || 'Trening'}
                </strong>
                <span style={{ fontSize: '0.85em', color: '#777', alignSelf: 'center' }}>
                  {workout.createdAt?.toDate() ? workout.createdAt.toDate().toLocaleDateString('pl-PL') : 'Przed chwilą'}
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '15px', fontSize: '0.85em', color: '#555', marginBottom: '12px', fontStyle: 'italic' }}>
                <span>⏱️ Czas: <strong>{formatDuration(workout.duration)}</strong></span>
                <span>💪 Łączny ciężar: <strong>{calculateTotalVolume(workout)} kg</strong></span>
              </div>
              
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

      {/* Pop-up potwierdzenia usunięcia */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)', maxWidth: '350px', width: '90%', textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Potwierdź usunięcie</h4>
            <p style={{ color: '#666', fontSize: '0.95em', marginBottom: '20px' }}>Czy na pewno chcesz bezpowrotnie usunąć ten trening z historii?</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={closeDeleteModal} style={{ padding: '8px 15px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff', cursor: 'pointer' }}>Anuluj</button>
              <button onClick={handleConfirmDelete} style={{ padding: '8px 15px', border: 'none', borderRadius: '4px', backgroundColor: '#f44336', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Tak, usuń</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}