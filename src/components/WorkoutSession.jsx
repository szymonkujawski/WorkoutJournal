import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, where } from 'firebase/firestore';

// IMPORTUJEMY NASZ AUTORSKI KOMPONENT LISTY
import CustomSelect from './CustomSelect';

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
          style={{ padding: '20px 40px', backgroundColor: 'var(--accent-blue)', color: '#121212', border: 'none', borderRadius: '12px', fontSize: '1.2em', fontWeight: 'bold', cursor: 'pointer' }}
        >
          + Rozpocznij pusty trening
        </button>
        {message && <p style={{ color: 'var(--accent-green)', fontWeight: 'bold', marginTop: '20px' }}>{message}</p>}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '500px', margin: '10px auto', padding: '20px', border: '1px solid var(--border-color)', borderRadius: '12px', textAlign: 'left', position: 'relative', backgroundColor: 'var(--bg-surface)' }}>
      
      <div style={{ position: 'absolute', top: '15px', right: '15px', backgroundColor: 'var(--bg-primary)', color: 'var(--accent-blue)', padding: '5px 10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1em', border: '1px solid var(--border-color)' }}>
        ⏱ {formatTime(elapsedTime)}
      </div>

      <h2 style={{ margin: '0 0 20px 0', color: 'var(--accent-blue)' }}>Trwa Sesja</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Nazwa treningu:</label>
        <input 
          type="text" 
          value={workoutName} 
          onChange={(e) => setWorkoutName(e.target.value)} 
          placeholder="np. Klatka i Biceps" 
        />
      </div>

      <hr style={{ borderColor: 'var(--border-color)', borderStyle: 'solid', margin: '20px 0' }} />

      <div style={{ padding: '15px', backgroundColor: 'var(--bg-primary)', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 15px 0', color: 'var(--text-primary)' }}>Dodaj nowe ćwiczenie:</h4>
        
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          {/* PODMIANA NA CUSTOM SELECT 1 */}
          <div style={{ flex: 1 }}>
            <CustomSelect 
              value={selectedCategory} 
              onChange={(val) => { setSelectedCategory(val); setSelectedExercise(''); }}
              options={categories}
              placeholder="-- Partia --"
            />
          </div>

          {/* PODMIANA NA CUSTOM SELECT 2 */}
          <div style={{ flex: 1 }}>
            <CustomSelect 
              value={selectedExercise} 
              onChange={(val) => setSelectedExercise(val)}
              options={filteredExercises.map(ex => ex.name)} // Wyciągamy same nazwy string
              placeholder="-- Ćwiczenie --"
              disabled={!selectedCategory}
            />
          </div>
        </div>

        {selectedExercise && (
          <p style={{ margin: '0 0 15px 0', fontSize: '0.85em', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            ℹ️ {getLastPerformanceForExercise(selectedExercise)}
          </p>
        )}

        <button 
          type="button" 
          onClick={handleAddExerciseToSession}
          style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(255, 255, 255, 0.05)', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          ↓ Wprowadź ćwiczenie do listy
        </button>
      </div>

      {exercises.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h5 style={{ margin: '0 0 15px 0', fontSize: '1.1em', borderBottom: '1px solid var(--border-color)', paddingBottom: '5px', color: 'var(--text-primary)' }}>Lista ćwiczeń w tej sesji:</h5>
          
          {exercises.map((ex, exIdx) => {
            const currentInputs = inlineInputs[exIdx] || { weight: '', reps: '' };
            
            return (
              <div key={exIdx} style={{ backgroundColor: 'var(--bg-primary)', padding: '15px', borderRadius: '10px', marginBottom: '15px', border: '1px solid var(--border-color)' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  {/* ZMIANA KOLORU NA NIEBIESKI */}
                  <strong style={{ fontSize: '1.1em', color: 'var(--accent-blue)' }}>{ex.name}</strong>
                  <button type="button" onClick={() => handleDeleteExerciseFromSession(exIdx)} style={{ backgroundColor: 'transparent', border: 'none', color: '#f44336', cursor: 'pointer', fontWeight: 'bold' }}>✕ Usuń</button>
                </div>

                <p style={{ margin: '0 0 15px 0', fontSize: '0.85em', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  ℹ️ {getLastPerformanceForExercise(ex.name)}
                </p>

                {ex.sets.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '15px', paddingLeft: '5px' }}>
                    {ex.sets.map((set, setIdx) => (
                      <div key={setIdx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95em', color: 'var(--text-primary)' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Seria {setIdx + 1}:</span> 
                        <span><strong style={{ color: 'var(--accent-blue)' }}>{set.weight} kg</strong> x {set.reps}</span>
                        <button type="button" onClick={() => handleDeleteSetFromExercise(exIdx, setIdx)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8em', marginLeft: 'auto' }}>[Usuń]</button>
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
                  />
                  <input 
                    type="number" 
                    placeholder="powt." 
                    value={currentInputs.reps} 
                    onChange={(e) => handleInlineInputChange(exIdx, 'reps', e.target.value)}
                  />
                  {/* ZMIANA KOLORU NA NIEBIESKI */}
                  <button 
                    type="submit" 
                    style={{ padding: '0 16px', backgroundColor: 'var(--accent-blue)', color: '#121212', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    + Dodaj
                  </button>
                </form>

              </div>
            );
          })}
        </div>
      )}

      <button 
        onClick={handleSaveWorkout} 
        style={{ width: '100%', padding: '14px', marginTop: '20px', backgroundColor: 'var(--accent-green)', color: '#121212', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1em', cursor: 'pointer' }}
      >
        Zapisz i zakończ całą sesję
      </button>

      {message && <p style={{ textAlign: 'center', marginTop: '15px', fontWeight: 'bold', color: 'var(--accent-green)' }}>{message}</p>}
    </div>
  );
}