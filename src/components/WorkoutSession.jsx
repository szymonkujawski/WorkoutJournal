import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, serverTimestamp } from 'firebase/firestore';

export default function WorkoutSession() {
  const [workoutName, setWorkoutName] = useState('');
  const [message, setMessage] = useState('');
  
  const [globalExercises, setGlobalExercises] = useState([]); 
  const [categories, setCategories] = useState([]); 
  const [selectedCategory, setSelectedCategory] = useState(''); 
  const [selectedExercise, setSelectedExercise] = useState(''); 

  const [weight, setWeight] = useState('');
  const [reps, setReps] = useState('');
  const [currentSets, setCurrentSets] = useState([]); 
  const [exercises, setExercises] = useState([]); 

  useEffect(() => {
    const fetchGlobalExercises = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'exercises_dict'));
        const exList = [];
        querySnapshot.forEach((doc) => {
          exList.push({ id: doc.id, ...doc.data() });
        });
        setGlobalExercises(exList);

        const uniqueCategories = [...new Set(exList.map(item => item.category))];
        setCategories(uniqueCategories);
      } catch (error) {
        console.error("Błąd pobierania słownika ćwiczeń:", error);
      }
    };
    fetchGlobalExercises();
  }, []);

  const filteredExercises = globalExercises.filter(ex => ex.category === selectedCategory);

  const handleAddSet = (e) => {
    e.preventDefault();
    if (!weight || !reps) return;
    setCurrentSets([...currentSets, { weight: Number(weight), reps: Number(reps) }]);
    setWeight('');
    setReps('');
  };

  const handleDeleteSet = (indexToDelete) => {
    const updatedSets = currentSets.filter((_, index) => index !== indexToDelete);
    setCurrentSets(updatedSets);
  };

  // --- NOWA FUNKCJA: Usuwanie całego ćwiczenia z listy sesji ---
  const handleDeleteExerciseFromSession = (indexToDelete) => {
    const updatedExercises = exercises.filter((_, index) => index !== indexToDelete);
    setExercises(updatedExercises);
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
        workoutName: workoutName || 'Trening',
        exercises: finalExercises,
        createdAt: serverTimestamp()
      });

      setMessage('Cała sesja treningowa została zapisana w bazie!');
      setWorkoutName('');
      setSelectedCategory('');
      setSelectedExercise('');
      setCurrentSets([]);
      setExercises([]);
    } catch (error) {
      setMessage('Błąd zapisu: ' + error.message);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '20px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', textAlign: 'left' }}>
      <h2 style={{ textAlign: 'center', color: '#2196F3' }}>Aktywna Sesja</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Nazwa treningu:</label>
        <input 
          type="text" 
          value={workoutName} 
          onChange={(e) => setWorkoutName(e.target.value)} 
          placeholder="np. Push A / Pull / FBW" 
          style={{ width: '100%', padding: '8px', boxSizing: 'border-box', fontSize: '1.1em' }}
        />
      </div>

      <hr />

      <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#fffdf9', borderRadius: '6px', border: '1px dashed #ffa726' }}>
        <h4>Wybierz ćwiczenie z bazy:</h4>
        
        <div style={{ marginBottom: '10px' }}>
          <label style={{ display: 'block', marginBottom: '3px', fontSize: '0.9em' }}>Partia mięśniowa:</label>
          <select 
            value={selectedCategory} 
            onChange={(e) => { setSelectedCategory(e.target.value); setSelectedExercise(''); }}
            style={{ width: '100%', padding: '8px' }}
          >
            <option value="">-- Wybierz partię --</option>
            {categories.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '3px', fontSize: '0.9em' }}>Ćwiczenie:</label>
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
                  <button 
                    type="button" 
                    onClick={() => handleDeleteSet(i)} 
                    style={{ background: 'none', border: 'none', color: '#f44336', cursor: 'pointer', fontWeight: 'bold', padding: '0 2px' }}
                    title="Usuń tę serię"
                  >
                    ✕
                  </button>
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

      {/* --- ZMODYFIKOWANA LISTA ĆWICZEŃ W SESJI Z OPCJĄ USUWANIA --- */}
      {exercises.length > 0 && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
          <h5 style={{ margin: '0 0 10px 0' }}>Lista ćwiczeń w tej sesji:</h5>
          <ul style={{ paddingLeft: '0', margin: 0, listStyleType: 'none' }}>
            {exercises.map((ex, i) => (
              <li key={i} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                backgroundColor: '#fff', 
                padding: '8px 12px', 
                borderRadius: '4px', 
                marginBottom: '8px',
                border: '1px solid #ddd'
              }}>
                <div>
                  <strong>{ex.name}</strong> – {ex.sets.length} serii
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteExerciseFromSession(i)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#f44336',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.9em'
                  }}
                  title="Usuń ćwiczenie z sesji"
                >
                  ✕ Usuń
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

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