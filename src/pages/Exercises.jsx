import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
// NOWOŚĆ: Dodany import getDocsFromCache
import { collection, query, where, getDocs, getDocsFromCache } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

export default function Exercises() {
  const [workouts, setWorkouts] = useState([]);
  
  const [allExercises, setAllExercises] = useState([]); 
  const [availableCategories, setAvailableCategories] = useState([]);
  const [fullExerciseDict, setFullExerciseDict] = useState({}); 
  
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedExercise, setSelectedExercise] = useState('');
  
  const [viewingDetails, setViewingDetails] = useState(null);
  
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  // POMINIĘCIE TIMEOUTU: Dynamiczne przełączanie Sieć / Cache
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      const loadExercises = async () => {
        const dictMap = {};
        const exercisesList = [];
        const cats = new Set();

        const processExerciseDoc = (doc) => {
          const data = doc.data();
          const exObj = {
            name: data.name,
            category: data.category,
            description: data.description || '',
            imageUrl: data.imageUrl || ''
          };
          dictMap[data.name] = exObj;
          exercisesList.push(exObj);
          cats.add(data.category);
        };

        try {
          const dictRef = collection(db, 'exercises_dict');
          // W trybie offline natychmiastowo czytamy z Cache
          const dictSnap = navigator.onLine ? await getDocs(dictRef) : await getDocsFromCache(dictRef);
          dictSnap.forEach(processExerciseDoc);
        } catch (error) {
          console.warn("Błąd słownika globalnego (Offline):", error);
        }

        try {
          const customQ = query(collection(db, 'custom_exercises'), where('userId', '==', user.uid));
          const customSnap = navigator.onLine ? await getDocs(customQ) : await getDocsFromCache(customQ);
          customSnap.forEach(processExerciseDoc);
        } catch (error) {
          console.warn("Błąd słownika prywatnego (Offline):", error);
        }

        exercisesList.sort((a, b) => a.name.localeCompare(b.name));
        const sortedCategories = Array.from(cats).sort();

        setFullExerciseDict(dictMap);
        setAllExercises(exercisesList);
        setAvailableCategories(sortedCategories);
        
        if (sortedCategories.length > 0) {
          setSelectedCategory(sortedCategories[0]);
        }
      };

      const loadWorkouts = async () => {
        try {
          const q = query(collection(db, 'workouts'), where('userId', '==', user.uid));
          const querySnapshot = navigator.onLine ? await getDocs(q) : await getDocsFromCache(q);
          const fetchedWorkouts = [];
          
          querySnapshot.forEach((doc) => {
            fetchedWorkouts.push({ id: doc.id, ...doc.data() });
          });

          fetchedWorkouts.sort((a, b) => {
            const dateA = a.createdAt?.seconds || 0;
            const dateB = b.createdAt?.seconds || 0;
            return dateA - dateB;
          });

          setWorkouts(fetchedWorkouts);
        } catch (error) {
          console.warn("Błąd pobierania historii treningów (Offline):", error);
        }
      };

      await loadExercises();
      await loadWorkouts();
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      const exercisesInCategory = allExercises.filter(e => e.category === selectedCategory);
      if (exercisesInCategory.length > 0) {
        setSelectedExercise(exercisesInCategory[0].name);
      } else {
        setSelectedExercise('');
      }
    }
  }, [selectedCategory, allExercises]);

  useEffect(() => {
    if (!selectedExercise) {
      setChartData([]);
      return;
    }

    const dataMap = {};

    workouts.forEach(workout => {
      if (!workout.createdAt || typeof workout.createdAt.toDate !== 'function') return;
      
      const dateStr = workout.createdAt.toDate().toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' });
      let maxWeightInSession = 0;

      if (workout.exercises) {
        const targetEx = workout.exercises.find(e => e.name === selectedExercise);
        if (targetEx && targetEx.sets) {
          targetEx.sets.forEach(set => {
            if (set.weight > maxWeightInSession) maxWeightInSession = set.weight;
          });
        }
      } else if (workout.exerciseName === selectedExercise) {
        workout.sets?.forEach(set => {
          if (set.weight > maxWeightInSession) maxWeightInSession = set.weight;
        });
      }

      if (maxWeightInSession > 0) {
        if (!dataMap[dateStr] || maxWeightInSession > dataMap[dateStr].weight) {
          dataMap[dateStr] = { date: dateStr, weight: maxWeightInSession };
        }
      }
    });

    setChartData(Object.values(dataMap));
  }, [selectedExercise, workouts]);

  const handleOpenDetails = (exerciseName) => {
    const exerciseInfo = fullExerciseDict[exerciseName] || {
      name: exerciseName,
      category: selectedCategory,
      description: '',
      imageUrl: ''
    };
    setViewingDetails(exerciseInfo);
  };

  if (loading) return <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)' }}>Ładowanie bazy ćwiczeń...</p>;

  if (viewingDetails) {
    return (
      <motion.div 
        initial={{ opacity: 0, x: -20 }} 
        animate={{ opacity: 1, x: 0 }}   
        exit={{ opacity: 0, x: 20 }}     
        transition={{ duration: 0.2 }}
        style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '20px' }}
      >
        <button 
          onClick={() => setViewingDetails(null)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            color: 'var(--accent-blue)',
            cursor: 'pointer',
            fontWeight: 'bold',
            marginBottom: '20px',
            padding: 0,
            fontSize: '1em'
          }}
        >
          ← Powrót do listy ćwiczeń
        </button>

        <div style={{ backgroundColor: 'var(--bg-surface)', padding: '25px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.75em', color: 'var(--accent-blue)', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>
            {viewingDetails.category}
          </span>
          <h3 style={{ margin: '4px 0 20px 0', color: 'var(--text-primary)', fontSize: '1.5em' }}>
            {viewingDetails.name}
          </h3>

          <div style={{ 
            width: '100%', 
            height: '240px', 
            backgroundColor: 'rgba(0,0,0,0.2)', 
            borderRadius: '10px', 
            overflow: 'hidden', 
            marginBottom: '25px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.03)'
          }}>
            {viewingDetails.imageUrl ? (
              <img 
                src={viewingDetails.imageUrl} 
                alt={viewingDetails.name} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '8px', opacity: 0.4 }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <p style={{ margin: 0, fontSize: '0.8em' }}>Brak grafiki instruktażowej w bazie</p>
              </div>
            )}
          </div>

          <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '0.95em', fontWeight: 'bold' }}>
            Instrukcja i technika wykonania:
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9em', lineHeight: '1.6', margin: 0 }}>
            {viewingDetails.description || 
              'Prawidłowe technicznie wykonywanie tego ćwiczenia maksymalizuje zaangażowanie docelowej partii mięśniowej i zapobiega kontuzjom. Pamiętaj o pełnym zakresie ruchu (ROM), kontrolowanej fazie negatywnej oraz utrzymaniu stabilnego, spiętego korpusu przez całą serię.'}
          </p>
        </div>
      </motion.div>
    );
  }

  const exercisesToDisplay = allExercises.filter(ex => ex.category === selectedCategory);

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} 
      animate={{ opacity: 1, x: 0 }}   
      exit={{ opacity: 0, x: 20 }}     
      transition={{ duration: 0.2 }}
      style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '20px' }}
    >
      <h3 style={{ margin: '0 0 15px 0', color: 'var(--text-primary)' }}>Atlas ćwiczeń i statystyki</h3>

      {availableCategories.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '25px' }}>
          
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ marginBottom: '10px', fontSize: '0.85em', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
              Wybierz partię:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {availableCategories.map(cat => {
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: isSelected ? '1px solid var(--accent-blue)' : '1px solid rgba(255, 255, 255, 0.1)',
                      backgroundColor: isSelected ? 'var(--accent-blue)' : 'transparent',
                      color: isSelected ? '#121212' : 'var(--text-primary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      fontSize: '0.85em',
                      fontWeight: isSelected ? 'bold' : 'normal'
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedCategory && (
            <div style={{ backgroundColor: 'var(--bg-surface)', padding: '15px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <div style={{ marginBottom: '10px', fontSize: '0.85em', color: 'var(--text-secondary)' }}>
                Ćwiczenia ({selectedCategory}):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {exercisesToDisplay.map(exObj => {
                  const isSelected = selectedExercise === exObj.name;
                  return (
                    <div 
                      key={exObj.name}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        borderRadius: '6px',
                        border: isSelected ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)',
                        backgroundColor: isSelected ? 'rgba(100, 181, 246, 0.08)' : 'transparent',
                        transition: 'all 0.2s ease',
                        padding: '0 2px 0 12px' 
                      }}
                    >
                      <span
                        onClick={() => setSelectedExercise(exObj.name)}
                        style={{
                          cursor: 'pointer',
                          fontSize: '0.85em',
                          color: isSelected ? 'var(--accent-blue)' : 'var(--text-primary)',
                          fontWeight: isSelected ? 'bold' : 'normal',
                          padding: '8px 6px 8px 0',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {exObj.name}
                      </span>

                      <button
                        onClick={() => handleOpenDetails(exObj.name)}
                        title="Szczegóły ćwiczenia"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: isSelected ? 'var(--accent-blue)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          padding: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0.7,
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="12" y1="16" x2="12" y2="12"></line>
                          <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center' }}>Brak ćwiczeń w bazie danych.</p>
      )}

      {selectedExercise && chartData.length > 0 ? (
        <div style={{ backgroundColor: 'var(--bg-surface)', padding: '20px 10px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h4 style={{ textAlign: 'center', margin: '0 0 20px 0', color: 'var(--text-primary)' }}>
            Maksymalny ciężar: <span style={{ color: 'var(--accent-blue)' }}>{selectedExercise}</span>
          </h4>
          
          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer key={selectedExercise} width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="date" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} stroke="var(--border-color)" />
                <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} stroke="var(--border-color)" />
                
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    borderRadius: '8px', 
                    border: '1px solid var(--border-color)', 
                    boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                    color: 'var(--text-primary)'
                  }}
                  itemStyle={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}
                  formatter={(value) => [`${value} kg`, 'Max Ciężar']}
                />
                
                <Line 
                  type="monotone" 
                  dataKey="weight" 
                  stroke="var(--accent-blue)" 
                  strokeWidth={3} 
                  dot={{ r: 5, fill: 'var(--bg-surface)', strokeWidth: 2, stroke: 'var(--accent-blue)' }} 
                  activeDot={{ r: 8, fill: 'var(--accent-blue)', stroke: 'var(--bg-primary)' }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : selectedExercise ? (
        <div style={{ backgroundColor: 'var(--bg-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
            Jeszcze nie wykonywałeś/aś ćwiczenia: <strong style={{color: 'var(--text-primary)'}}>{selectedExercise}</strong>. <br />
            Wykonaj je podczas treningu, aby zobaczyć tutaj swój wykres postępów!
          </p>
        </div>
      ) : null}
      
    </motion.div>
  );
}