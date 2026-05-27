import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, where } from 'firebase/firestore';

export default function WorkoutSession({ prefilledTemplate, onWorkoutEnd }) {
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const [workoutName, setWorkoutName] = useState('');
  const [message, setMessage] = useState('');
  
  const [globalExercises, setGlobalExercises] = useState([]); 
  const [categories, setCategories] = useState([]); 
  const [historyWorkouts, setHistoryWorkouts] = useState([]); 

  const [selectedCategory, setSelectedCategory] = useState(''); 
  const [selectedExercise, setSelectedExercise] = useState(''); 
  
  const [exercises, setExercises] = useState([]);
  const [inlineInputs, setInlineInputs] = useState({});

  useEffect(() => {
    if (prefilledTemplate) {
      setWorkoutName(prefilledTemplate.name);
      const loadedExercises = prefilledTemplate.exercises.map(ex => ({
        name: ex.name,
        sets: []
      }));
      setExercises(loadedExercises);
      setIsWorkoutActive(true); 
    }
  }, [prefilledTemplate]);

  useEffect(() => {
    const fetchData = async () => {
      if (!auth.currentUser) return;
      try {
        const dictSnap = await getDocs(collection(db, 'exercises_dict'));
        const exList = [];
        dictSnap.forEach((doc) => exList.push({ id: doc.id, ...doc.data() }));
        setGlobalExercises(exList);
        setCategories([...new Set(exList.map(item => item.category))]);

        const q = query(collection(db, 'workouts'), where('userId', '==', auth.currentUser.uid));
        const histSnap = await getDocs(q);
        const histList = [];
        histSnap.forEach(doc => histList.push(doc.data()));
        
        histList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setHistoryWorkouts(histList);
      } catch (error) {
        console.error("Błąd pobierania danych:", error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    let interval;
    if (isWorkoutActive) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWorkoutActive]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getLastPerformanceForExercise = (exerciseName) => {
    if (!exerciseName) return '';
    for (const w of historyWorkouts) {
      const ex = w.exercises?.find(e => e.name === exerciseName);
      if (ex && ex.sets && ex.sets.length > 0) {
        const bestSet = ex.sets.reduce((prev, current) => (prev.weight > current.weight) ? prev : current);
        return `Ostatnio: ${bestSet.weight} kg x ${bestSet.reps} powt.`;
      }
    }
    return 'Pierwszy raz wykonujesz to ćwiczenie!';
  };

  const filteredExercises = globalExercises.filter(ex => ex.category === selectedCategory);
  
  const handleInlineInputChange = (exIndex, field, value) => {
    setInlineInputs({
      ...inlineInputs,
      [exIndex]: {
        ...(inlineInputs[exIndex] || { weight: '', reps: '' }),
        [field]: value
      }
    });
  };

  const handleAddSetToExercise = (exIndex, e) => {
    e.preventDefault();
    const inputs = inlineInputs[exIndex] || { weight: '', reps: '' };
    if (!inputs.weight || !inputs.reps) return;

    const updatedExercises = [...exercises];
    updatedExercises[exIndex].sets.push({
      weight: Number(inputs.weight),
      reps: Number(inputs.reps)
    });

    setExercises(updatedExercises);
    setInlineInputs({ ...inlineInputs, [exIndex]: { weight: '', reps: '' } });
  };

  const handleDeleteSetFromExercise = (exIndex, setIndexToDelete) => {
    const updatedExercises = [...exercises];
    updatedExercises[exIndex].sets = updatedExercises[exIndex].sets.filter((_, i) => i !== setIndexToDelete);
    setExercises(updatedExercises);
  };

  const handleAddExerciseToSession = () => {
    if (!selectedExercise) {
      alert('Wybierz ćwiczenie z listy!');
      return;
    }
    setExercises([...exercises, { name: selectedExercise, sets: [] }]);
    setSelectedExercise('');
  };

  const handleDeleteExerciseFromSession = (indexToDelete) => {
    setExercises(exercises.filter((_, index) => index !== indexToDelete));
    const newInputs = { ...inlineInputs };
    delete newInputs[indexToDelete];
    setInlineInputs(newInputs);
  };

  const handleSaveWorkout = async () => {
    if (exercises.length === 0) {
      setMessage('Twój trening jest pusty! Dodaj jakieś ćwiczenia.');
      return;
    }

    const hasEmptyExercise = exercises.some(ex => ex.sets.length === 0);
    if (hasEmptyExercise) {
      alert('Każde dodane ćwiczenie musi mieć przynajmniej jedną serię przed zapisem!');
      return;
    }

    try {
      await addDoc(collection(db, 'workouts'), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        workoutName: workoutName || 'Pusty Trening',
        exercises: exercises,
        duration: elapsedTime, 
        createdAt: serverTimestamp()
      });

      setMessage('Trening zapisany!');
      
      setTimeout(() => {
        setIsWorkoutActive(false);
        setElapsedTime(0);
        setWorkoutName('');
        setSelectedCategory('');
        setSelectedExercise('');
        setExercises([]);
        setInlineInputs({});
        setMessage('');
        if (onWorkoutEnd) onWorkoutEnd(); 
      }, 2000);

    } catch (error) {
      setMessage('Błąd zapisu: ' + error.message);
    }
  };

  if (!isWorkoutActive) {
    return (
      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <button 
          onClick={() => setIsWorkoutActive(true)}
          style={{ padding: '20px 40px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '12px', fontSize: '1.2em', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 15px rgba(33, 150, 243, 0.4)' }}
        >
          + Rozpocznij pusty trening
        </button>
        {message && <p style={{ color: 'green', fontWeight: 'bold', marginTop: '20px' }}>{message}</p>}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '500px', margin: '10px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px', textAlign: 'left', position: 'relative', backgroundColor: '#fff' }}>
      
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

      <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#f9f9f9', borderRadius: '6px', border: '1px solid #ddd', marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0' }}>Dodaj nowe ćwiczenie do sesji:</h4>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
          <select 
            value={selectedCategory} 
            onChange={(e) => { setSelectedCategory(e.target.value); setSelectedExercise(''); }}
            style={{ flex: 1, padding: '8px' }}
          >
            <option value="">-- Partia --</option>
            {categories.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
          </select>

          <select 
            value={selectedExercise} 
            onChange={(e) => setSelectedExercise(e.target.value)}
            disabled={!selectedCategory}
            style={{ flex: 1, padding: '8px' }}
          >
            <option value="">-- Ćwiczenie --</option>
            {filteredExercises.map((ex) => <option key={ex.id} value={ex.name}>{ex.name}</option>)}
          </select>
        </div>

        {selectedExercise && (
          <p style={{ margin: '0 0 10px 0', fontSize: '0.85em', color: '#757575', fontStyle: 'italic' }}>
            ℹ️ {getLastPerformanceForExercise(selectedExercise)}
          </p>
        )}

        <button 
          type="button" 
          onClick={handleAddExerciseToSession}
          style={{ width: '100%', padding: '8px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          + Wprowadź ćwiczenie do listy sesji
        </button>
      </div>

      {exercises.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h5 style={{ margin: '0 0 15px 0', fontSize: '1.1em', borderBottom: '1px solid #ccc', paddingBottom: '5px' }}>Lista ćwiczeń w tej sesji:</h5>
          
          {exercises.map((ex, exIdx) => {
            const currentInputs = inlineInputs[exIdx] || { weight: '', reps: '' };
            
            return (
              <div key={exIdx} style={{ backgroundColor: '#fffdf9', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #ffa726' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <strong style={{ fontSize: '1.1em', color: '#e65100' }}>{ex.name}</strong>
                  <button type="button" onClick={() => handleDeleteExerciseFromSession(exIdx)} style={{ backgroundColor: 'transparent', border: 'none', color: '#f44336', cursor: 'pointer', fontWeight: 'bold' }}>✕ Usuń</button>
                </div>

                <p style={{ margin: '0 0 10px 0', fontSize: '0.85em', color: '#757575', fontStyle: 'italic' }}>
                  ℹ️ {getLastPerformanceForExercise(ex.name)}
                </p>

                {/* Tylko wyrenderuje listę, jeśli są dodane jakiekolwiek serie. Żadnego tekstu zastępczego. */}
                {ex.sets.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px', paddingLeft: '10px' }}>
                    {ex.sets.map((set, setIdx) => (
                      <div key={setIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9em' }}>
                        <span>Seria {setIdx + 1}: <strong>{set.weight} kg</strong> x {set.reps} powt.</span>
                        <button type="button" onClick={() => handleDeleteSetFromExercise(exIdx, setIdx)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '0.8em' }}>[Usuń]</button>
                      </div>
                    ))}
                  </div>
                )}

                <form 
                  onSubmit={(e) => handleAddSetToExercise(exIdx, e)} 
                  style={{ display: 'flex', gap: '8px' }}
                >
                  <input 
                    type="number" 
                    placeholder="kg" 
                    value={currentInputs.weight} 
                    onChange={(e) => handleInlineInputChange(exIdx, 'weight', e.target.value)}
                    style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} 
                  />
                  <input 
                    type="number" 
                    placeholder="powt." 
                    value={currentInputs.reps} 
                    onChange={(e) => handleInlineInputChange(exIdx, 'reps', e.target.value)}
                    style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #ccc' }} 
                  />
                  <button 
                    type="submit" 
                    style={{ padding: '6px 12px', backgroundColor: '#ffa726', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    + Dodaj serię
                  </button>
                </form>

              </div>
            );
          })}
        </div>
      )}

      <button 
        onClick={handleSaveWorkout} 
        style={{ width: '100%', padding: '12px', marginTop: '20px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', fontSize: '1.1em', cursor: 'pointer' }}
      >
        Zapisz i zakończ całą sesję
      </button>

      {message && <p style={{ textAlign: 'center', marginTop: '15px', fontWeight: 'bold', color: 'green' }}>{message}</p>}
    </div>
  );
}