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

        // Sortujemy rosnąco po dacie (od najstarszych do najnowszych - ważne dla wykresu!)
        fetchedWorkouts.sort((a, b) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateA - dateB;
        });

        setWorkouts(fetchedWorkouts);

        // Wyciągamy unikalne nazwy ćwiczeń, które użytkownik faktycznie zrobił
        const uniqueExercises = new Set();
        fetchedWorkouts.forEach(w => {
          if (w.exercises) {
            w.exercises.forEach(ex => uniqueExercises.add(ex.name));
          } else if (w.exerciseName) { // Kompatybilność ze starym formatem
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

  // Algorytm przetwarzający dane pod wykres za każdym razem, gdy zmienimy ćwiczenie w liście
  useEffect(() => {
    if (!selectedExercise) {
      setChartData([]);
      return;
    }

    const dataMap = {};

    workouts.forEach(workout => {
      if (!workout.createdAt) return;
      
      // Formatujemy datę do wyświetlenia na osi X
      const dateStr = workout.createdAt.toDate().toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' });
      let maxWeightInSession = 0;

      // Szukamy wybranego ćwiczenia w danej sesji
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

      // Jeśli ćwiczenie wystąpiło na tym treningu, zapisujemy jego maksymalny wynik
      if (maxWeightInSession > 0) {
        // Jeśli w jednym dniu były dwa takie same treningi, bierzemy absolutny max
        if (!dataMap[dateStr] || maxWeightInSession > dataMap[dateStr].weight) {
          dataMap[dateStr] = { date: dateStr, weight: maxWeightInSession };
        }
      }
    });

    // Konwertujemy obiekt z powrotem na tablicę wymaganą przez Recharts
    setChartData(Object.values(dataMap));
  }, [selectedExercise, workouts]);

  if (loading) return <p style={{ textAlign: 'center', marginTop: '20px' }}>Ładowanie danych analitycznych...</p>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', color: '#2196F3' }}>Analiza Postępów</h2>
      
      <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Wybierz ćwiczenie do analizy:</label>
        <select 
          value={selectedExercise} 
          onChange={(e) => setSelectedExercise(e.target.value)}
          style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
        >
          <option value="">-- Wybierz z wykonanych --</option>
          {performedExercises.map((ex, idx) => (
            <option key={idx} value={ex}>{ex}</option>
          ))}
        </select>
      </div>

      {selectedExercise && chartData.length > 0 ? (
        <div style={{ height: '300px', width: '100%', marginTop: '30px' }}>
          <h4 style={{ textAlign: 'center', marginBottom: '15px' }}>
            Maksymalny ciężar: <span style={{ color: '#4CAF50' }}>{selectedExercise}</span>
          </h4>
          
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              {/* Tooltip pokazuje się po najechaniu palcem/myszką na punkt wykresu */}
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
                formatter={(value) => [`${value} kg`, 'Max Ciężar']}
              />
              <Line 
                type="monotone" 
                dataKey="weight" 
                stroke="#2196F3" 
                strokeWidth={3} 
                dot={{ r: 5, fill: '#2196F3', strokeWidth: 2, stroke: '#fff' }} 
                activeDot={{ r: 8 }} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : selectedExercise ? (
        <p style={{ textAlign: 'center', color: '#666' }}>Brak wystarczających danych do narysowania wykresu dla tego ćwiczenia.</p>
      ) : (
        <p style={{ textAlign: 'center', color: '#666' }}>Wybierz ćwiczenie z listy powyżej, aby zobaczyć wykres siły.</p>
      )}
    </div>
  );
}