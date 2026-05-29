import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, where } from 'firebase/firestore';

import CustomSelect from './CustomSelect';

export default function WorkoutSession({ prefilledTemplate, onWorkoutEnd }) {
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [startTime, setStartTime] = useState(null); 
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const [workoutName, setWorkoutName] = useState('');
  const [message, setMessage] = useState('');
  
  const [globalExercises, setGlobalExercises] = useState([]); 
  const [categories, setCategories] = useState([]); 
  const [historyWorkouts, setHistoryWorkouts] = useState([]); 

  const [selectedCategory, setSelectedCategory] = useState(''); 
  const [selectedExercise, setSelectedExercise] = useState(''); 
  
  const [exercises, setExercises] = useState([]);
  
  const [showAddExerciseBox, setShowAddExerciseBox] = useState(false);

  const [showCongratsModal, setShowCongratsModal] = useState(false);
  const [workoutSummary, setWorkoutSummary] = useState({ duration: 0, volume: 0, totalWorkouts: 0, exerciseCount: 0 });

  useEffect(() => {
    const savedState = localStorage.getItem('active_workout_state');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      setWorkoutName(parsed.workoutName || '');
      setExercises(parsed.exercises || []);
      setStartTime(parsed.startTime || Date.now());
      setIsWorkoutActive(true);
    }
  }, []);

  useEffect(() => {
    if (isWorkoutActive && startTime) {
      localStorage.setItem('active_workout_state', JSON.stringify({
        workoutName,
        exercises,
        startTime
      }));
    }
  }, [exercises, workoutName, isWorkoutActive, startTime]);

  useEffect(() => {
    if (prefilledTemplate) {
      const savedState = localStorage.getItem('active_workout_state');
      if (!savedState) {
        setWorkoutName(prefilledTemplate.name);
        const loadedExercises = prefilledTemplate.exercises.map(ex => ({
          name: ex.name,
          sets: [{ weight: '', reps: '', completed: false }]
        }));
        setExercises(loadedExercises);
        const now = Date.now();
        setStartTime(now);
        setIsWorkoutActive(true); 
      }
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
    if (isWorkoutActive && startTime && !showCongratsModal) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWorkoutActive, startTime, showCongratsModal]);

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
    return '';
  };

  const filteredExercises = globalExercises.filter(ex => ex.category === selectedCategory);
  
  const handleInputChange = (exIndex, setIndex, field, value) => {
    let cleanValue = value.replace(/[^0-9.,]/g, '');
    cleanValue = cleanValue.replace(',', '.');

    const updatedExercises = [...exercises];
    updatedExercises[exIndex].sets[setIndex][field] = cleanValue;
    setExercises(updatedExercises);
  };

  const toggleSetCompletion = (exIndex, setIndex) => {
    const updatedExercises = [...exercises];
    updatedExercises[exIndex].sets[setIndex].completed = !updatedExercises[exIndex].sets[setIndex].completed;
    setExercises(updatedExercises);
  };

  const handleAddEmptySet = (exIndex) => {
    const updatedExercises = [...exercises];
    
    let lastWeight = '';
    let lastReps = '';
    if (updatedExercises[exIndex].sets.length > 0) {
      const lastSet = updatedExercises[exIndex].sets[updatedExercises[exIndex].sets.length - 1];
      lastWeight = lastSet.weight;
      lastReps = lastSet.reps;
    }

    updatedExercises[exIndex].sets.push({
      weight: lastWeight,
      reps: lastReps,
      completed: false
    });
    setExercises(updatedExercises);
  };

  const handleDeleteSetFromExercise = (exIndex, setIndexToDelete) => {
    const updatedExercises = [...exercises];
    updatedExercises[exIndex].sets = updatedExercises[exIndex].sets.filter((_, i) => i !== setIndexToDelete);
    setExercises(updatedExercises);
  };

  const handleStartEmptyWorkout = () => {
    const now = Date.now();
    setStartTime(now);
    setIsWorkoutActive(true);
  };

  const handleAddExerciseToSession = () => {
    if (!selectedExercise) {
      alert('Wybierz ćwiczenie z listy!');
      return;
    }
    setExercises([
      ...exercises, 
      { 
        name: selectedExercise, 
        sets: [{ weight: '', reps: '', completed: false }] 
      }
    ]);
    setSelectedExercise('');
    setShowAddExerciseBox(false); 
  };

  const handleDeleteExerciseFromSession = (indexToDelete) => {
    setExercises(exercises.filter((_, index) => index !== indexToDelete));
  };

  // NOWOŚĆ: Funkcja anulowania sesji
  const handleCancelWorkout = () => {
    const confirmCancel = window.confirm("Czy na pewno chcesz anulować trening? Niezapisane postępy zostaną trwale utracone.");
    if (confirmCancel) {
      localStorage.removeItem('active_workout_state');
      setIsWorkoutActive(false);
      setElapsedTime(0);
      setStartTime(null);
      setWorkoutName('');
      setSelectedCategory('');
      setSelectedExercise('');
      setExercises([]);
      setMessage('');
      if (onWorkoutEnd) onWorkoutEnd(); 
    }
  };

  const handleSaveWorkout = async () => {
    if (exercises.length === 0) {
      setMessage('Twój trening jest pusty! Dodaj jakieś ćwiczenia.');
      return;
    }

    const cleanedExercises = exercises.map(ex => ({
      name: ex.name,
      sets: ex.sets.filter(s => s.weight !== '' && s.reps !== '').map(s => ({
        weight: Number(s.weight),
        reps: Number(s.reps)
      }))
    })).filter(ex => ex.sets.length > 0);

    if (cleanedExercises.length === 0) {
      alert('Musisz wypełnić poprawnie co najmniej jedną serię, aby zapisać trening!');
      return;
    }

    try {
      await addDoc(collection(db, 'workouts'), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        workoutName: workoutName || 'Pusty Trening',
        exercises: cleanedExercises,
        duration: elapsedTime, 
        createdAt: serverTimestamp()
      });

      let totalVolume = 0;
      cleanedExercises.forEach(ex => {
        ex.sets.forEach(set => {
          totalVolume += (set.weight * set.reps);
        });
      });

      setWorkoutSummary({
        duration: elapsedTime,
        volume: totalVolume.toLocaleString('pl-PL'),
        totalWorkouts: historyWorkouts.length + 1,
        exerciseCount: cleanedExercises.length
      });

      localStorage.removeItem('active_workout_state');
      setShowCongratsModal(true);
      setMessage('');

    } catch (error) {
      setMessage('Błąd zapisu: ' + error.message);
    }
  };

  const handleCloseCongratsModal = () => {
    setShowCongratsModal(false);
    setIsWorkoutActive(false);
    setElapsedTime(0);
    setStartTime(null);
    setWorkoutName('');
    setSelectedCategory('');
    setSelectedExercise('');
    setExercises([]);
    
    const fetchData = async () => {
      const q = query(collection(db, 'workouts'), where('userId', '==', auth.currentUser.uid));
      const histSnap = await getDocs(q);
      const histList = [];
      histSnap.forEach(doc => histList.push(doc.data()));
      histList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setHistoryWorkouts(histList);
    };
    fetchData();

    if (onWorkoutEnd) onWorkoutEnd(); 
  };

  if (!isWorkoutActive) {
    return (
      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <button 
          onClick={handleStartEmptyWorkout}
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
      
      <style>{`
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>

      <div style={{ position: 'absolute', top: '15px', right: '15px', backgroundColor: 'var(--bg-primary)', color: 'var(--accent-blue)', padding: '5px 10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.1em', border: '1px solid var(--border-color)' }}>
        ⏱ {formatTime(elapsedTime)}
      </div>

      <h2 style={{ margin: '0 0 20px 0', color: 'var(--accent-blue)' }}>Trwa Sesja</h2>
      
      <div style={{ marginBottom: '20px' }}>
        <input 
          type="text" 
          value={workoutName} 
          onChange={(e) => setWorkoutName(e.target.value)} 
          placeholder="Nazwa treningu (np. Klatka i Biceps)" 
          style={{ width: '100%', padding: '12px', backgroundColor: 'transparent', border: 'none', borderBottom: '2px solid var(--border-color)', color: 'var(--text-primary)', fontSize: '1.2em', fontWeight: 'bold', outline: 'none' }}
        />
      </div>

      {exercises.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          {exercises.map((ex, exIdx) => {
            const lastPerf = getLastPerformanceForExercise(ex.name);
            
            return (
              <div key={exIdx} style={{ marginBottom: '25px' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                  <strong style={{ fontSize: '1.15em', color: 'var(--accent-blue)' }}>{ex.name}</strong>
                  {/* ZMIANA: Zamiast "⋮" jest czytelny "✕" */}
                  <button type="button" onClick={() => handleDeleteExerciseFromSession(exIdx)} style={{ backgroundColor: 'transparent', border: 'none', color: '#f44336', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1em' }} title="Usuń ćwiczenie">✕</button>
                </div>
                
                {lastPerf && (
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.85em', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    {lastPerf}
                  </p>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 10px', marginBottom: '8px', fontSize: '0.8em', color: 'var(--text-secondary)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  <span style={{ width: '40px', textAlign: 'center' }}>Seria</span>
                  <span style={{ flex: 1, textAlign: 'center' }}>KG</span>
                  <span style={{ flex: 1, textAlign: 'center' }}>Powt.</span>
                  <span style={{ width: '40px', textAlign: 'center' }}>✓</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ex.sets.map((set, setIdx) => (
                    <div 
                      key={setIdx} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        backgroundColor: set.completed ? 'rgba(76, 175, 80, 0.15)' : 'var(--bg-primary)', 
                        padding: '8px 10px', 
                        borderRadius: '8px',
                        border: set.completed ? '1px solid var(--accent-green)' : '1px solid var(--border-color)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <button 
                        type="button"
                        onClick={() => handleDeleteSetFromExercise(exIdx, setIdx)}
                        style={{ width: '40px', textAlign: 'center', backgroundColor: 'transparent', border: 'none', color: 'var(--text-secondary)', fontWeight: 'bold', fontSize: '1em', cursor: 'pointer', padding: 0 }}
                        title="Kliknij, by usunąć serię"
                      >
                        {setIdx + 1}
                      </button>

                      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                        <input 
                          type="text" 
                          inputMode="decimal"
                          placeholder="-"
                          value={set.weight} 
                          onChange={(e) => handleInputChange(exIdx, setIdx, 'weight', e.target.value)}
                          disabled={set.completed}
                          style={{ width: '100%', minWidth: '0', textAlign: 'center', backgroundColor: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '1.15em', fontWeight: 'bold', outline: 'none', padding: 0 }}
                        />
                      </div>

                      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                        <input 
                          type="text" 
                          inputMode="numeric"
                          placeholder="-"
                          value={set.reps} 
                          onChange={(e) => handleInputChange(exIdx, setIdx, 'reps', e.target.value)}
                          disabled={set.completed}
                          style={{ width: '100%', minWidth: '0', textAlign: 'center', backgroundColor: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '1.15em', fontWeight: 'bold', outline: 'none', padding: 0 }}
                        />
                      </div>

                      <div style={{ width: '40px', display: 'flex', justifyContent: 'center' }}>
                        <button 
                          type="button"
                          onClick={() => toggleSetCompletion(exIdx, setIdx)}
                          style={{ 
                            width: '28px', 
                            height: '28px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            backgroundColor: set.completed ? 'var(--accent-green)' : 'rgba(255, 255, 255, 0.05)', 
                            border: set.completed ? 'none' : '1px solid var(--text-secondary)', 
                            borderRadius: '6px', 
                            color: set.completed ? '#121212' : 'transparent', 
                            cursor: 'pointer', 
                            transition: 'all 0.2s ease',
                            fontWeight: 'bold'
                          }}
                        >
                          ✓
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  type="button" 
                  onClick={() => handleAddEmptySet(exIdx)}
                  style={{ display: 'block', width: '100%', textAlign: 'center', padding: '10px 0', marginTop: '5px', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.9em' }}
                >
                  + Dodaj serię
                </button>

              </div>
            );
          })}
        </div>
      )}

      {showAddExerciseBox ? (
        <div style={{ padding: '15px', backgroundColor: 'var(--bg-primary)', borderRadius: '10px', border: '1px dashed var(--accent-blue)', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)', textAlign: 'center' }}>Wybierz ćwiczenie</h4>
          
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <div style={{ flex: 1 }}>
              <CustomSelect 
                value={selectedCategory} 
                onChange={(val) => { setSelectedCategory(val); setSelectedExercise(''); }}
                options={categories}
                placeholder="-- Partia --"
              />
            </div>
            <div style={{ flex: 1 }}>
              <CustomSelect 
                value={selectedExercise} 
                onChange={(val) => setSelectedExercise(val)}
                options={filteredExercises.map(ex => ex.name)} 
                placeholder="-- Ćwiczenie --"
                disabled={!selectedCategory}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              type="button" 
              onClick={() => setShowAddExerciseBox(false)}
              style={{ flex: 1, padding: '10px', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Anuluj
            </button>
            <button 
              type="button" 
              onClick={handleAddExerciseToSession}
              disabled={!selectedExercise}
              style={{ flex: 1, padding: '10px', backgroundColor: selectedExercise ? 'var(--accent-blue)' : 'var(--border-color)', color: '#121212', border: 'none', borderRadius: '8px', cursor: selectedExercise ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}
            >
              + Dodaj do planu
            </button>
          </div>
        </div>
      ) : (
        <button 
          type="button"
          onClick={() => setShowAddExerciseBox(true)}
          style={{ width: '100%', padding: '14px', marginBottom: '20px', backgroundColor: 'rgba(100, 181, 246, 0.08)', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1em' }}
        >
          + Dodaj ćwiczenie
        </button>
      )}

      {/* ZIELONY PRZYCISK ZAPISU */}
      <button 
        onClick={handleSaveWorkout} 
        style={{ width: '100%', padding: '16px', backgroundColor: 'var(--accent-green)', color: '#121212', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '1.2em', cursor: 'pointer', marginBottom: '10px' }}
      >
        Zakończ trening
      </button>

      {/* NOWOŚĆ: CZERWONY PRZYCISK ANULOWANIA SESJI */}
      <button 
        onClick={handleCancelWorkout} 
        style={{ width: '100%', padding: '14px', backgroundColor: 'transparent', color: '#f44336', border: '1px solid #f44336', borderRadius: '8px', fontWeight: 'bold', fontSize: '1em', cursor: 'pointer' }}
      >
        Anuluj sesję
      </button>

      {message && <p style={{ textAlign: 'center', marginTop: '15px', fontWeight: 'bold', color: '#f44336' }}>{message}</p>}

      {showCongratsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '35px 25px', borderRadius: '16px', border: '2px solid var(--accent-green)', maxWidth: '350px', width: '90%', textAlign: 'center', boxShadow: '0 10px 30px rgba(76, 175, 80, 0.2)' }}>
            
            <div style={{ fontSize: '4em', marginBottom: '10px', animation: 'bounce 1s ease infinite' }}>🔥</div>
            
            <h2 style={{ margin: '0 0 5px 0', color: 'var(--text-primary)' }}>Świetna robota!</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1em', margin: '0 0 25px 0' }}>
              To Twój <strong style={{ color: 'var(--accent-blue)', fontSize: '1.2em' }}>{workoutSummary.totalWorkouts}</strong> trening. Oby tak dalej!
            </p>
            
            <div style={{ backgroundColor: 'var(--bg-primary)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-color)', marginBottom: '25px', textAlign: 'left' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9em' }}>⏱ Czas:</span>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1.1em' }}>{formatTime(workoutSummary.duration)}</strong>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9em' }}>🏋️ Objętość:</span>
                <strong style={{ color: 'var(--accent-green)', fontSize: '1.1em' }}>{workoutSummary.volume} kg</strong>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9em' }}>📝 Ćwiczenia:</span>
                <strong style={{ color: 'var(--text-primary)', fontSize: '1.1em' }}>{workoutSummary.exerciseCount}</strong>
              </div>

            </div>

            <button 
              onClick={handleCloseCongratsModal} 
              style={{ width: '100%', padding: '15px', border: 'none', borderRadius: '10px', backgroundColor: 'var(--accent-green)', color: '#121212', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1em', transition: 'transform 0.1s' }}
              onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
              onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              Zamknij podsumowanie
            </button>
          </div>
        </div>
      )}

    </div>
  );
}