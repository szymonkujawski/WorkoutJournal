import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, where } from 'firebase/firestore';

export default function WorkoutSession() {
  // Stany zarządzające cyklem treningu
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const [workoutName, setWorkoutName] = useState('');
  const [message, setMessage] = useState('');
  
  // Stany dla słownika i historii
  const [globalExercises, setGlobalExercises] = useState([]); 
  const [categories, setCategories] = useState([]); 
  const [historyWorkouts, setHistoryWorkouts] = useState([]); // Cała historia użytkownika
  const [lastPerformance, setLastPerformance] = useState(''); // Tekst podpowiedzi "Ostatnio: X kg"

  const [selectedCategory, setSelectedCategory] = useState(''); 
  const [selectedExercise, setSelectedExercise] = useState(''); 
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [currentSets, setCurrentSets] = useState([]); 
  const [exercises, setExercises] = useState([]); 

  // 1. Pobieranie Słownika oraz Historii Treningów (do podpowiedzi) przy starcie
  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;
      try {
        // Pobieranie słownika
        const dictSnap = await getDocs(collection(db, 'exercises_dict'));
        const exList = [];
        dictSnap.forEach((doc) => exList.push({ id: doc.id, ...doc.data() }));
        setGlobalExercises(exList);
        setCategories([...new Set(exList.map(item => item.category))]);

        // Pobieranie historii użytkownika
        const q = query(collection(db, 'workouts'), where('userId', '==', auth.currentUser.uid));
        const histSnap = await getDocs(q);
        const histList = [];
        histSnap.forEach(doc => histList.push(doc.data()));
        
        // Sortujemy od najnowszych, żeby podpowiedź dotyczyła ostatniego wystąpienia ćwiczenia
        histList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setHistoryWorkouts(histList);
      } catch (error) {
        console.error("Błąd pobierania danych:", error);
      }
    };
    fetchData();
  }, []);

  // 2. Obsługa stopera (Timera) w tle
  useEffect(() => {
    let interval;
    if (isWorkoutActive) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWorkoutActive]);

  // Formatowanie sekund na minuty i sekundy (np. 05:30)
  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // 3. Algorytm szukający ostatniego ciężaru po wybraniu ćwiczenia
  useEffect(() => {
    if (!selectedExercise) {
      setLastPerformance('');
      return;
    }

    let found = false;
    for (const w of historyWorkouts) {
      const ex = w.exercises?.find(e => e.name === selectedExercise);
      if (ex && ex.sets && ex.sets.length > 0) {
        // Znajdujemy najcięższą serię z tego ostatniego treningu
        const bestSet = ex.sets.reduce((prev, current) => (prev.weight > current.weight) ? prev : current);
        setLastPerformance(`Ostatnio: ${bestSet.weight} kg x ${bestSet.reps} powt.`);
        found = true;
        break; // Przerywamy pętlę, bo znaleźliśmy najświeższy wpis
      }
    }
    if (!found) setLastPerformance('Pierwszy raz wykonujesz to ćwiczenie!');
  }, [selectedExercise, historyWorkouts]);

  // Funkcje obsługi formularza (niezmienione logicznie)
  const filteredExercises = globalExercises.filter(ex => ex.category === selectedCategory);

  const handleAddSet = (e) => {
    e.preventDefault();
    if (!weight || !reps) return;
    setCurrentSets([...currentSets, { weight: Number(weight), reps: Number(reps) }]);
    setWeight('');
    setReps('');
  };

  const handleDeleteSet = (indexToDelete) => {
    setCurrentSets(currentSets.filter((_, index) => index !== indexToDelete));
  };

  const handleDeleteExerciseFromSession = (indexToDelete) => {
    setExercises(exercises.filter((_, index) => index !== indexToDelete));
  };

  const handleAddExercise = () => {
    if (!selectedExercise || currentSets.length === 0) {
      alert('Wybierz ćwiczenie z listy i dodaj przynajmniej jedną serię!');
      return;
    }
    setExercises([...exercises, { name: selectedExercise, sets: currentSets }]);
    setSelectedExercise('');
    setCurrentSets([]);
  };

  const handleSaveWorkout = async () => {
    let finalExercises = [...exercises];
    if (selectedExercise && currentSets.length > 0) {
      finalExercises.push({ name: selectedExercise, sets: currentSets });
    }

    if (finalExercises.length === 0) {
      setMessage('Twój trening jest pusty! Dodaj jakieś ćwiczenia.');
      return;
    }

    try {
      await addDoc(collection(db, 'workouts'), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        workoutName: workoutName || 'Pusty Trening',
        exercises: finalExercises,
        duration: elapsedTime, // Zapisujemy czas trwania sesji do bazy!
        createdAt: serverTimestamp()
      });

      setMessage('Trening zapisany!');
      
      // Resetowanie całego stanu do ekranu startowego
      setTimeout(() => {
        setIsWorkoutActive(false);
        setElapsedTime(0);
        setWorkoutName('');
        setSelectedCategory('');
        setSelectedExercise('');
        setCurrentSets([]);
        setExercises([]);
        setMessage('');
      }, 2000); // 2 sekundy pauzy, żeby użytkownik przeczytał komunikat

    } catch (error) {
      setMessage('Błąd zapisu: ' + error.message);
    }
  };

  // --- EKRAN 1: PRZED ROZPOCZĘCIEM TRENINGU ---
  if (!isWorkoutActive) {
    return (
      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <button 
          onClick={() => setIsWorkoutActive(true)}
          style={{ 
            padding: '20px 40px', 
            backgroundColor: '#2196F3', 
            color: 'white', 
            border: 'none', 
            borderRadius: '12px', 
            fontSize: '1.2em', 
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(33, 150, 243, 0.4)'
          }}
        >
          + Rozpocznij pusty trening
        </button>
        {message && <p style={{ color: 'green', fontWeight: 'bold', marginTop: '20px' }}>{message}</p>}
      </div>
    );
  }

  // --- EKRAN 2: W TRAKCIE TRWANIA TRENINGU ---
  return (
    <div style={{ maxWidth: '500px', margin: '10px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', textAlign: 'left', position: 'relative' }}>
      
      {/* Pływający stoper w rogu */}
      <div style={{ position: 'absolute', top: '15px', right: '15px', backgroundColor: '#e3f2fd', color: '#1976d2', padding: '5px 10px', borderRadius: '20px', fontWeight: 'bold', fontSize: '1.1em' }}>
        ⏱ {formatTime(elapsedTime)}
      </div>

      <h2 style={{ margin: '0 0 20px 0', color: '#2196F3' }}>Trwa Sesja</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nazwa treningu:</label>
        <input 
          type="text" 
          value={workoutName} 
          onChange={(e) => setWorkoutName(e.target.value)} 
          placeholder="np. Klatka i Biceps" 
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box', fontSize: '1.1em' }}
        />
      </div>

      <hr />

      <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#fffdf9', borderRadius: '6px', border: '1px dashed #ffa726' }}>
        <h4>Dodaj ćwiczenie:</h4>
        
        <div style={{ marginBottom: '10px' }}>
          <select 
            value={selectedCategory} 
            onChange={(e) => { setSelectedCategory(e.target.value); setSelectedExercise(''); }}
            style={{ width: '100%', padding: '8px' }}
          >
            <option value="">-- Partia mięśniowa --</option>
            {categories.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '5px' }}>
          <select 
            value={selectedExercise} 
            onChange={(e) => setSelectedExercise(e.target.value)}
            disabled={!selectedCategory}
            style={{ width: '100%', padding: '8px' }}
          >
            <option value="">-- Wybierz ćwiczenie --</option>
            {filteredExercises.map((ex) => <option key={ex.id} value={ex.name}>{ex.name}</option>)}
          </select>
        </div>

        {/* --- PODPOWIEDŹ O OSTATNIM CIĘŻARZE --- */}
        {selectedExercise && (
          <p style={{ margin: '0 0 15px 0', fontSize: '0.85em', color: '#757575', fontStyle: 'italic' }}>
            ℹ️ {lastPerformance}
          </p>
        )}

        <form onSubmit={handleAddSet} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input type="number" placeholder="kg" value={weight} onChange={(e) => setWeight(e.target.value)} style={{ flex: 1, padding: '8px' }} />
          <input type="number" placeholder="powt." value={reps} onChange={(e) => setReps(e.target.value)} style={{ flex: 1, padding: '8px' }} />
          <button type="submit" style={{ padding: '8px', backgroundColor: '#ffa726', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            + Seria
          </button>
        </form>

        {currentSets.length > 0 && (
          <div style={{ margin: '10px 0', backgroundColor: '#fff', padding: '8px', borderRadius: '4px', border: '1px solid #eee' }}>
            <span style={{ fontSize: '0.9em', fontWeight: 'bold', color: '#666' }}>Dodane serie:</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '5px' }}>
              {currentSets.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', backgroundColor: '#f0f0f0', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85em' }}>
                  <span>S{i+1}: {s.weight}kg x {s.reps}</span>
                  <button type="button" onClick={() => handleDeleteSet(i)} style={{ background: 'none', border: 'none', color: '#f44336', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <button 
          type="button" 
          onClick={handleAddExercise}
          style={{ width: '100%', padding: '8px', marginTop: '5px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          ✓ Zatwierdź to ćwiczenie
        </button>
      </div>

      {exercises.length > 0 && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
          <h5 style={{ margin: '0 0 10px 0' }}>Lista ćwiczeń w tej sesji:</h5>
          <ul style={{ paddingLeft: '0', margin: 0, listStyleType: 'none' }}>
            {exercises.map((ex, i) => (
              <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: '8px 12px', borderRadius: '4px', marginBottom: '8px', border: '1px solid #ddd' }}>
                <div><strong>{ex.name}</strong> – {ex.sets.length} serii</div>
                <button type="button" onClick={() => handleDeleteExerciseFromSession(i)} style={{ backgroundColor: 'transparent', border: 'none', color: '#f44336', cursor: 'pointer', fontWeight: 'bold' }}>✕ Usuń</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button 
        onClick={handleSaveWorkout} 
        style={{ width: '100%', padding: '12px', marginTop: '20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.1em', cursor: 'pointer' }}
      >
        Zapisz i zakończ trening
      </button>

    </div>
  );
}