import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
// Importujemy komponenty z zainstalowanej biblioteki Recharts
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Exercises() {
  const [workouts, setWorkouts] = useState([]);
  const [performedExercises, setPerformedExercises] = useState([]);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!auth.currentUser) return;

      try {
        const q = query(
          collection(db, 'workouts'),
          where('userId', '==', auth.currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        const fetchedWorkouts = [];
        
        querySnapshot.forEach((doc) => {
          fetchedWorkouts.push({ id: doc.id, ...doc.data() });
        });

        // Sortujemy rosnąco po dacie
        fetchedWorkouts.sort((a, b) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateA - dateB;
        });

        setWorkouts(fetchedWorkouts);

        const uniqueExercises = new Set();
        fetchedWorkouts.forEach(w => {
          if (w.exercises) {
            w.exercises.forEach(ex => uniqueExercises.add(ex.name));
          } else if (w.exerciseName) { 
            uniqueExercises.add(w.exerciseName);
          }
        });

        setPerformedExercises(Array.from(uniqueExercises).sort());
        setLoading(false);
      } catch (error) {
        console.error("Błąd pobierania danych do wykresów:", error);
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  useEffect(() => {
    if (!selectedExercise) {
      setChartData([]);
      return;
    }

    const dataMap = {};

    workouts.forEach(workout => {
      if (!workout.createdAt) return;
      
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

  if (loading) return <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)' }}>Ładowanie danych analitycznych...</p>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', color: 'var(--accent-blue)' }}>Analiza Postępów</h2>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Wybierz ćwiczenie do analizy:</label>
        <select 
          value={selectedExercise} 
          onChange={(e) => setSelectedExercise(e.target.value)}
        >
          <option value="">-- Wybierz z wykonanych --</option>
          {performedExercises.map((ex, idx) => (
            <option key={idx} value={ex}>{ex}</option>
          ))}
        </select>
      </div>

      {selectedExercise && chartData.length > 0 ? (
        <div style={{ height: '300px', width: '100%', marginTop: '30px' }}>
          <h4 style={{ textAlign: 'center', marginBottom: '15px', color: 'var(--text-primary)' }}>
            Maksymalny ciężar: <span style={{ color: 'var(--accent-green)' }}>{selectedExercise}</span>
          </h4>
          
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
              <XAxis dataKey="date" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} stroke="var(--border-color)" />
              <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} stroke="var(--border-color)" />
              
              {/* Tooltip w ciemnym motywie */}
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'var(--bg-surface)', 
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
      ) : selectedExercise ? (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Brak wystarczających danych do narysowania wykresu dla tego ćwiczenia.</p>
      ) : (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Wybierz ćwiczenie z listy powyżej, aby zobaczyć wykres siły.</p>
      )}
    </div>
  );
}