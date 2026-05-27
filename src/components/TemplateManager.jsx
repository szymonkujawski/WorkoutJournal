import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';

export default function TemplateManager({ onStartTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Stany dla słownika (żeby wybierać ćwiczenia do planu)
  const [globalExercises, setGlobalExercises] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [templateExercises, setTemplateExercises] = useState([]); // Ćwiczenia dodane do obecnego planu

  useEffect(() => {
    const fetchTemplatesAndDict = async () => {
      if (!auth.currentUser) return;

      try {
        // 1. Pobieranie gotowych planów użytkownika
        const q = query(collection(db, 'workout_templates'), where('userId', '==', auth.currentUser.uid));
        const tSnap = await getDocs(q);
        const tList = [];
        tSnap.forEach(d => tList.push({ id: d.id, ...d.data() }));
        
        // Sortowanie po dacie utworzenia (najnowsze u góry)
        tList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setTemplates(tList);

        // 2. Pobieranie słownika ćwiczeń
        const dSnap = await getDocs(collection(db, 'exercises_dict'));
        const dList = [];
        dSnap.forEach(d => dList.push({ id: d.id, ...d.data() }));
        setGlobalExercises(dList);
        setCategories([...new Set(dList.map(i => i.category))]);
      } catch (error) {
        console.error("Błąd pobierania danych szablonów:", error);
      }
    };
    fetchTemplatesAndDict();
  }, []);

  const filteredExercises = globalExercises.filter(ex => ex.category === selectedCategory);

  const handleAddExerciseToTemplate = () => {
    if (!selectedExercise) return;
    setTemplateExercises([...templateExercises, { name: selectedExercise }]);
    setSelectedExercise(''); // Resetujemy tylko ćwiczenie, żeby szybko dodać kolejne z tej samej partii
  };

  const handleRemoveExerciseFromTemplate = (indexToRemove) => {
    setTemplateExercises(templateExercises.filter((_, i) => i !== indexToRemove));
  };

  const handleSaveTemplate = async () => {
    if (!templateName || templateExercises.length === 0) {
      alert('Podaj nazwę planu i dodaj chociaż jedno ćwiczenie!');
      return;
    }
    try {
      const docRef = await addDoc(collection(db, 'workout_templates'), {
        userId: auth.currentUser.uid,
        name: templateName,
        exercises: templateExercises,
        createdAt: serverTimestamp()
      });
      
      // Dodajemy nowy szablon do listy, żeby od razu się wyświetlił bez odświeżania strony
      setTemplates([{ id: docRef.id, name: templateName, exercises: templateExercises }, ...templates]);
      
      // Resetujemy kreator
      setIsCreating(false);
      setTemplateName('');
      setTemplateExercises([]);
    } catch (e) {
      alert('Błąd zapisu planu: ' + e.message);
    }
  };

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Czy na pewno chcesz usunąć ten plan treningowy?');
    if (confirmDelete) {
      await deleteDoc(doc(db, 'workout_templates', id));
      setTemplates(templates.filter(t => t.id !== id));
    }
  };

  return (
    <div style={{ marginTop: '40px', borderTop: '2px solid #eee', paddingTop: '20px' }}>
      <h3 style={{ textAlign: 'center', color: '#333' }}>Twoje Gotowe Plany</h3>

      {!isCreating ? (
        <button
          onClick={() => setIsCreating(true)}
          style={{ display: 'block', margin: '0 auto 20px', padding: '12px 24px', backgroundColor: '#9C27B0', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(156, 39, 176, 0.3)' }}
        >
          + Stwórz nowy plan
        </button>
      ) : (
        <div style={{ backgroundColor: '#f3e5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #ce93d8' }}>
          <h4 style={{ margin: '0 0 15px 0', color: '#6a1b9a' }}>Kreator Planu</h4>
          <input 
            type="text" 
            placeholder="Nazwa planu (np. Push Wtorek, FBW)" 
            value={templateName} 
            onChange={e => setTemplateName(e.target.value)} 
            style={{ width: '100%', padding: '10px', marginBottom: '15px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }} 
          />

          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <select value={selectedCategory} onChange={e => {setSelectedCategory(e.target.value); setSelectedExercise('');}} style={{ flex: 1, padding: '8px', borderRadius: '4px' }}>
              <option value="">-- Partia --</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)} disabled={!selectedCategory} style={{ flex: 1, padding: '8px', borderRadius: '4px' }}>
              <option value="">-- Ćwiczenie --</option>
              {filteredExercises.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
            </select>
          </div>
          
          <button onClick={handleAddExerciseToTemplate} style={{ width: '100%', padding: '10px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', marginBottom: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
            ↓ Dodaj ćwiczenie do listy
          </button>

          {templateExercises.length > 0 && (
            <ol style={{ paddingLeft: '20px', marginBottom: '20px', backgroundColor: '#fff', padding: '10px 10px 10px 30px', borderRadius: '6px' }}>
              {templateExercises.map((ex, i) => (
                <li key={i} style={{ marginBottom: '8px', borderBottom: '1px solid #eee', paddingBottom: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{ex.name}</span>
                    <button onClick={() => handleRemoveExerciseFromTemplate(i)} style={{ color: '#f44336', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✕ Usuń</button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setIsCreating(false)} style={{ flex: 1, padding: '10px', border: '1px solid #ccc', borderRadius: '4px', background: 'white', cursor: 'pointer' }}>Anuluj</button>
            <button onClick={handleSaveTemplate} style={{ flex: 1, padding: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' }}>Zapisz Plan</button>
          </div>
        </div>
      )}

      {/* Wyświetlanie listy zapisanych planów */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {templates.map(t => (
          <div key={t.id} style={{ padding: '15px', border: '1px solid #ddd', borderRadius: '8px', backgroundColor: '#fff', position: 'relative', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
            <button 
              onClick={() => handleDelete(t.id)} 
              style={{ position: 'absolute', top: '15px', right: '15px', color: '#f44336', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1em' }}
              title="Usuń plan"
            >
              ✕
            </button>
            
            <h4 style={{ margin: '0 0 10px 0', color: '#333', fontSize: '1.2em' }}>{t.name}</h4>
            
            <div style={{ margin: '0 0 15px 0', fontSize: '0.9em', color: '#666', lineHeight: '1.4' }}>
              <strong>Kolejność:</strong> {t.exercises.map(e => e.name).join(' → ')}
            </div>
            
            {/* Ten przycisk za chwilę podepniemy do głównego stopera! */}
            <button 
              onClick={() => onStartTemplate(t)} 
              style={{ width: '100%', padding: '12px', backgroundColor: '#ff9800', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1em' }}
            >
              ▶ Rozpocznij ten trening
            </button>
          </div>
        ))}
        {templates.length === 0 && !isCreating && (
          <p style={{ textAlign: 'center', color: '#777' }}>Nie masz jeszcze żadnych gotowych planów.</p>
        )}
      </div>
    </div>
  );
}