import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';

export default function TemplateManager({ onStartTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const [globalExercises, setGlobalExercises] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedExercise, setSelectedExercise] = useState('');
  const [templateExercises, setTemplateExercises] = useState([]); 

  useEffect(() => {
    const fetchTemplatesAndDict = async () => {
      if (!auth.currentUser) return;

      try {
        const q = query(collection(db, 'workout_templates'), where('userId', '==', auth.currentUser.uid));
        const tSnap = await getDocs(q);
        const tList = [];
        tSnap.forEach(d => tList.push({ id: d.id, ...d.data() }));
        
        tList.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setTemplates(tList);

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
    setSelectedExercise(''); 
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
      
      setTemplates([{ id: docRef.id, name: templateName, exercises: templateExercises }, ...templates]);
      
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
    <div style={{ marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>

      {/* 1. Najpierw wyświetlamy siatkę zapisanych planów */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {templates.map(t => (
          <div key={t.id} style={{ padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'var(--bg-surface)', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '130px' }}>
            <button 
              onClick={() => handleDelete(t.id)} 
              style={{ position: 'absolute', top: '8px', right: '8px', color: '#f44336', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '1em', zIndex: 5 }}
              title="Usuń plan"
            >
              ✕
            </button>
            
            <div style={{ paddingRight: '12px' }}>
              <h4 style={{ margin: '0 0 6px 0', color: 'var(--accent-blue)', fontSize: '0.95em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.name}</h4>
              <div style={{ fontSize: '0.75em', color: 'var(--text-secondary)', lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '10px' }}>
                {t.exercises.map(e => e.name).join(', ')}
              </div>
            </div>
            
            <button 
              onClick={() => onStartTemplate(t)} 
              style={{ width: '100%', padding: '6px', backgroundColor: 'var(--accent-blue)', color: '#121212', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.75em' }}
            >
              ▶ Start
            </button>
          </div>
        ))}
      </div>
      
      {templates.length === 0 && !isCreating && (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9em', marginBottom: '20px' }}>Nie masz jeszcze żadnych gotowych planów.</p>
      )}

      {/* 2. Przycisk "Stwórz nowy plan" przenieśliśmy na dół */}
      {!isCreating ? (
        <button
          onClick={() => setIsCreating(true)}
          style={{ display: 'block', margin: '0 auto', padding: '12px 24px', backgroundColor: 'var(--accent-blue)', color: '#121212', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          + Stwórz nowy plan
        </button>
      ) : (
        <div style={{ backgroundColor: 'var(--bg-surface)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h4 style={{ margin: '0 0 15px 0', color: 'var(--accent-blue)' }}>Kreator Planu</h4>
          <input 
            type="text" 
            placeholder="Nazwa planu (np. Push, FBW)" 
            value={templateName} 
            onChange={e => setTemplateName(e.target.value)} 
            style={{ marginBottom: '15px' }} 
          />

          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <select value={selectedCategory} onChange={e => {setSelectedCategory(e.target.value); setSelectedExercise('');}}>
              <option value="">-- Partia --</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={selectedExercise} onChange={e => setSelectedExercise(e.target.value)} disabled={!selectedCategory}>
              <option value="">-- Ćwiczenie --</option>
              {filteredExercises.map(e => <option key={e.id} value={e.name}>{e.name}</option>)}
            </select>
          </div>
          
          <button onClick={handleAddExerciseToTemplate} style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-surface-hover)', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue)', borderRadius: '8px', marginBottom: '15px', fontWeight: 'bold', cursor: 'pointer' }}>
            ↓ Dodaj ćwiczenie do listy
          </button>

          {templateExercises.length > 0 && (
            <ol style={{ paddingLeft: '20px', marginBottom: '20px', backgroundColor: 'var(--bg-primary)', padding: '10px 10px 10px 30px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              {templateExercises.map((ex, i) => (
                <li key={i} style={{ marginBottom: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px', color: 'var(--text-primary)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{ex.name}</span>
                    <button onClick={() => handleRemoveExerciseFromTemplate(i)} style={{ color: '#f44336', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setIsCreating(false)} style={{ flex: 1, padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>Anuluj</button>
            <button onClick={handleSaveTemplate} style={{ flex: 1, padding: '10px', backgroundColor: 'var(--accent-green)', color: '#121212', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Zapisz</button>
          </div>
        </div>
      )}

    </div>
  );
}