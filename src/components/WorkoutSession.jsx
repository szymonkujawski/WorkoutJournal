import { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function WorkoutSession() {
  const [workoutName, setWorkoutName] = useState(''); // np. Push, Pull, MMA Kondycja
  const [exerciseName, setExerciseName] = useState('');
  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  
  const [currentSets, setCurrentSets] = useState([]); // Serie dla aktualnego ćwiczenia
  const [exercises, setExercises] = useState([]); // Wszystkie ćwiczenia w tej sesji
  const [message, setMessage] = useState('');

  // 1. Dodawanie serii do aktualnego ćwiczenia
  const handleAddSet = (e) => {
    e.preventDefault();
    if (!weight || !reps) return;
    setCurrentSets([...currentSets, { weight: Number(weight), reps: Number(reps) }]);
    setWeight('');
    setReps('');
  };

  // 2. Zatwierdzenie ćwiczenia i przejście do kolejnego
  const handleAddExercise = () => {
    if (!exerciseName || currentSets.length === 0) {
      alert('Wpisz nazwę ćwiczenia i dodaj przynajmniej jedną serię!');
      return;
    }
    // Dodajemy gotowe ćwiczenie do listy całego treningu
    setExercises([...exercises, { name: exerciseName, sets: currentSets }]);
    
    // Resetujemy stan dla kolejnego ćwiczenia
    setExerciseName('');
    setCurrentSets([]);
  };

  // 3. Wysłanie CAŁEGO treningu (wszystkich ćwiczeń) do Firestore
  const handleSaveWorkout = async () => {
    // Jeśli użytkownik ma coś w pamięci podręcznej, dodajemy to automatycznie
    let finalExercises = [...exercises];
    if (exerciseName && currentSets.length > 0) {
      finalExercises.push({ name: exerciseName, sets: currentSets });
    }

    if (finalExercises.length === 0) {
      setMessage('Twój trening jest pusty! Dodaj jakieś ćwiczenia.');
      return;
    }

    try {
      await addDoc(collection(db, 'workouts'), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        workoutName: workoutName || 'Trening', // Domyślna nazwa, jeśli puste
        exercises: finalExercises, // Tu leci cała tablica ćwiczeń wraz z ich seriami!
        createdAt: serverTimestamp()
      });

      setMessage('Cała sesja treningowa została zapisana w bazie!');
      setWorkoutName('');
      setExerciseName('');
      setCurrentSets([]);
      setExercises([]);
    } catch (error) {
      setMessage('Błąd zapisu: ' + error.message);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '20px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', textAlign: 'left' }}>
      <h2 style={{ textAlign: 'center', color: '#2196F3' }}>Aktywna Sesja</h2>
      
      {/* Nazwa całego treningu */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nazwa treningu:</label>
        <input 
          type="text" 
          value={workoutName} 
          onChange={(e) => setWorkoutName(e.target.value)} 
          placeholder="np. Góra ciała / Push A / Mata" 
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box', fontSize: '1.1em' }}
        />
      </div>

      <hr />

      {/* Formularz aktualnego ćwiczenia */}
      <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#fffdf9', borderRadius: '6px', border: '1px dashed #ffa726' }}>
        <h4>Dodaj ćwiczenie:</h4>
        <input 
          type="text" 
          value={exerciseName} 
          onChange={(e) => setExerciseName(e.target.value)} 
          placeholder="Nazwa ćwiczenia (np. Przysiad)" 
          style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' }}
        />

        <form onSubmit={handleAddSet} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <input type="number" placeholder="kg" value={weight} onChange={(e) => setWeight(e.target.value)} style={{ flex: 1, padding: '8px' }} />
          <input type="number" placeholder="powt." value={reps} onChange={(e) => setReps(e.target.value)} style={{ flex: 1, padding: '8px' }} />
          <button type="submit" style={{ padding: '8px', backgroundColor: '#ffa726', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            + Seria
          </button>
        </form>

        {/* Podgląd serii w bieżącym ćwiczeniu */}
        {currentSets.length > 0 && (
          <p style={{ fontSize: '0.9em', color: '#666', margin: '5px 0' }}>
            Bieżące serie: {currentSets.map((s, i) => `[S${i+1}: ${s.weight}kg x ${s.reps}] `)}
          </p>
        )}

        <button 
          type="button" 
          onClick={handleAddExercise}
          style={{ width: '100%', padding: '8px', marginTop: '5px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          ✓ Zatwierdź to ćwiczenie
        </button>
      </div>

      {/* Podgląd CAŁEGO dodanego treningu */}
      {exercises.length > 0 && (
        <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
          <h5>Lista ćwiczeń w tej sesji:</h5>
          <ol style={{ paddingLeft: '20px', margin: 0 }}>
            {exercises.map((ex, i) => (
              <li key={i} style={{ marginBottom: '5px' }}>
                <strong>{ex.name}</strong> – {ex.sets.length} serii
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Główny zapis do bazy */}
      <button 
        onClick={handleSaveWorkout} 
        style={{ width: '100%', padding: '12px', marginTop: '20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.1em', cursor: 'pointer' }}
      >
        Zapisz cały trening w chmurze
      </button>

      {message && <p style={{ textAlign: 'center', marginTop: '15px', fontWeight: 'bold', color: 'green' }}>{message}</p>}
    </div>
  );
}