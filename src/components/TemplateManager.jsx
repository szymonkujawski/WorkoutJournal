import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, query, where, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';

import CustomSelect from './CustomSelect';

export default function TemplateManager({ onStartTemplate, onTemplatesLoaded }) {
  const [templates, setTemplates] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const [globalExercises, setGlobalExercises] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [templateExercises, setTemplateExercises] = useState([]); 

  const [viewingDetails, setViewingDetails] = useState(null);

  const [templateToStart, setTemplateToStart] = useState(null);
  const [templateToDelete, setTemplateToDelete] = useState(null);

  useEffect(() => {
    if (onTemplatesLoaded) {
      onTemplatesLoaded(templates.length);
    }
  }, [templates, onTemplatesLoaded]);

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

  const handleAddExerciseToTemplate = (exerciseName) => {
    setTemplateExercises([...templateExercises, { name: exerciseName }]);
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
      
      handleCloseCreator();
    } catch (e) {
      alert('Błąd zapisu planu: ' + e.message);
    }
  };

  const handleCloseCreator = () => {
    setIsCreating(false);
    setTemplateName('');
    setTemplateExercises([]);
    setSelectedCategory('');
    setViewingDetails(null);
  };

  const confirmDelete = async () => {
    if (!templateToDelete) return;
    try {
      await deleteDoc(doc(db, 'workout_templates', templateToDelete.id));
      setTemplates(templates.filter(t => t.id !== templateToDelete.id));
      setTemplateToDelete(null);
    } catch (e) {
      console.error("Błąd usuwania: ", e);
    }
  };

  const confirmStart = () => {
    if (!templateToStart) return;
    onStartTemplate(templateToStart);
    setTemplateToStart(null);
  };

  return (
    <div style={{ marginTop: '30px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(2, 1fr)', 
        gap: '12px', 
        width: '100%' 
      }}>
        {templates.map(t => (
          <div 
            key={t.id} 
            onClick={() => setTemplateToStart(t)}
            style={{ 
              padding: '12px', 
              border: '1px solid var(--border-color)', 
              borderRadius: '8px', 
              backgroundColor: 'var(--bg-surface)', 
              position: 'relative', 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'flex-start',
              minHeight: '110px',
              minWidth: 0, 
              overflow: 'hidden',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)';
              e.currentTarget.style.borderColor = 'var(--accent-blue)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            <button 
              onClick={(e) => {
                e.stopPropagation(); 
                setTemplateToDelete(t);
              }} 
              style={{ position: 'absolute', top: '8px', right: '8px', color: '#f44336', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '1em', zIndex: 5, padding: '4px' }}
              title="Usuń plan"
            >
              ✕
            </button>
            
            <div style={{ paddingRight: '12px', minWidth: 0 }}>
              <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent-blue)', fontSize: '1em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t.name}
              </h4>
              <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {t.exercises.map(e => e.name).join(', ')}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {templates.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9em', marginBottom: '20px', marginTop: '10px' }}>Nie masz jeszcze żadnych gotowych planów.</p>
      )}

      <button
        onClick={() => setIsCreating(true)}
        style={{ display: 'block', width: '100%', margin: '20px auto 0 auto', padding: '14px', backgroundColor: 'var(--accent-blue)', color: '#121212', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', boxSizing: 'border-box' }}
      >
        + Stwórz nowy plan
      </button>

      {/* MODAL POTWIERDZENIA STARTU */}
      <AnimatePresence>
        {templateToStart && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px', boxSizing: 'border-box' }}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{ backgroundColor: 'var(--bg-surface)', padding: '30px', borderRadius: '16px', border: '1px solid var(--accent-blue)', maxWidth: '320px', width: '100%', textAlign: 'center', boxSizing: 'border-box' }}
            >
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '10px', fontSize: '1.3em' }}>Rozpocząć trening?</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '25px', fontSize: '0.95em', lineHeight: '1.4' }}>
                Czy chcesz wystartować z planem <strong style={{ color: 'var(--accent-blue)' }}>{templateToStart.name}</strong>?
              </p>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => setTemplateToStart(null)} 
                  style={{ flex: 1, padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Anuluj
                </button>
                <button 
                  onClick={confirmStart} 
                  style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', backgroundColor: 'var(--accent-blue)', color: '#121212', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  ▶ Start
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODAL POTWIERDZENIA USUNIĘCIA */}
      <AnimatePresence>
        {templateToDelete && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '20px', boxSizing: 'border-box' }}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              style={{ backgroundColor: 'var(--bg-surface)', padding: '30px', borderRadius: '16px', border: '1px solid #f44336', maxWidth: '320px', width: '100%', textAlign: 'center', boxSizing: 'border-box' }}
            >
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '10px', fontSize: '1.3em' }}>Usunąć plan?</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '25px', fontSize: '0.95em', lineHeight: '1.4' }}>
                Czy na pewno chcesz bezpowrotnie usunąć szablon <strong style={{ color: '#f44336' }}>{templateToDelete.name}</strong>?
              </p>
              
              <div style={{ display: 'flex', gap: '10px' }}>
                <button 
                  onClick={() => setTemplateToDelete(null)} 
                  style={{ flex: 1, padding: '12px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Anuluj
                </button>
                <button 
                  onClick={confirmDelete} 
                  style={{ flex: 1, padding: '12px', border: 'none', borderRadius: '8px', backgroundColor: '#f44336', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Usuń
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KREATOR PLANÓW (BEZPIECZNE CENTROWANIE I BOX-SIZING) */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,    // Wymusza szerokość do krawędzi bez "wyciekania"
              bottom: 0,   // Wymusza wysokość do krawędzi bez "wyciekania"
              backgroundColor: 'var(--bg-primary)',
              zIndex: 9999,
              overflowY: 'auto',
              padding: '20px',
              boxSizing: 'border-box' // Trzyma padding w ryzach!
            }}
          >
            <div style={{ 
              width: '100%', 
              maxWidth: '600px', 
              margin: '0 auto 60px auto', // Centruje w poziomie bez Flexboxa
              backgroundColor: 'var(--bg-surface)', 
              padding: '25px', 
              borderRadius: '12px', 
              border: '1px solid var(--border-color)',
              boxSizing: 'border-box' // Kolejne zabezpieczenie modelu pudełkowego
            }}>
              
              {viewingDetails ? (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
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
                    ← Powrót do kreatora
                  </button>

                  <div style={{ backgroundColor: 'var(--bg-primary)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', boxSizing: 'border-box' }}>
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
                      border: '1px solid rgba(255,255,255,0.03)',
                      boxSizing: 'border-box'
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
                          <p style={{ margin: 0, fontSize: '0.8em' }}>Brak grafiki instruktażowej</p>
                        </div>
                      )}
                    </div>

                    <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)', fontSize: '0.95em', fontWeight: 'bold' }}>
                      Instrukcja i technika:
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9em', lineHeight: '1.6', margin: 0 }}>
                      {viewingDetails.description || 'Prawidłowe technicznie wykonywanie tego ćwiczenia maksymalizuje zaangażowanie docelowej partii mięśniowej i zapobiega kontuzjom. Pamiętaj o pełnym zakresie ruchu (ROM) i kontrolowanej fazie negatywnej.'}
                    </p>

                    <button 
                      onClick={() => {
                        handleAddExerciseToTemplate(viewingDetails.name);
                        setViewingDetails(null); 
                      }} 
                      style={{ width: '100%', padding: '14px', backgroundColor: 'var(--accent-blue)', color: '#121212', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', marginTop: '25px', fontSize: '1.05em', boxSizing: 'border-box' }}
                    >
                      + Dodaj do planu
                    </button>
                  </div>
                </motion.div>
              ) : (
                
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <h3 style={{ margin: '0 0 25px 0', color: 'var(--accent-blue)', textAlign: 'center', fontSize: '1.5em' }}>Kreator Planu</h3>
                  
                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9em', fontWeight: 'bold' }}>Nazwa Twojego planu</label>
                    <input 
                      type="text" 
                      placeholder="np. Push, FBW, Góra..." 
                      value={templateName} 
                      onChange={e => setTemplateName(e.target.value)} 
                      style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-primary)', fontSize: '1.1em', outline: 'none', boxSizing: 'border-box' }} 
                    />
                  </div>

                  <div style={{ padding: '20px', backgroundColor: 'var(--bg-primary)', borderRadius: '10px', border: '1px dashed var(--border-color)', marginBottom: '25px', boxSizing: 'border-box' }}>
                    <h4 style={{ margin: '0 0 15px 0', color: 'var(--text-primary)', textAlign: 'center' }}>Baza ćwiczeń</h4>
                    
                    <CustomSelect 
                      value={selectedCategory} 
                      onChange={val => setSelectedCategory(val)}
                      options={categories}
                      placeholder="Wybierz partię mięśniową..."
                    />

                    {selectedCategory && (
                      <div style={{ marginTop: '15px', maxHeight: '250px', overflowY: 'auto', paddingRight: '5px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {filteredExercises.map(ex => (
                          <div key={ex.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <span style={{ color: 'var(--text-primary)', fontSize: '0.95em', fontWeight: '500' }}>
                              {ex.name}
                            </span>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <button 
                                onClick={() => setViewingDetails(ex)}
                                title="Szczegóły ćwiczenia"
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s' }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent-blue)' }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
                              >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="12" y1="16" x2="12" y2="12"></line>
                                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                </svg>
                              </button>
                              
                              <button 
                                onClick={() => handleAddExerciseToTemplate(ex.name)} 
                                style={{ backgroundColor: 'rgba(100, 181, 246, 0.1)', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue)', borderRadius: '6px', padding: '6px 12px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = 'var(--accent-blue)';
                                  e.currentTarget.style.color = '#121212';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'rgba(100, 181, 246, 0.1)';
                                  e.currentTarget.style.color = 'var(--accent-blue)';
                                }}
                              >
                                + Dodaj
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {templateExercises.length > 0 && (
                    <div style={{ marginBottom: '30px' }}>
                      <h4 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>Lista ćwiczeń w planie ({templateExercises.length}):</h4>
                      <ol style={{ paddingLeft: '0', listStyleType: 'none', margin: '0' }}>
                        {templateExercises.map((ex, i) => (
                          <li key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-primary)', padding: '12px 15px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '8px' }}>
                            <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                              <span style={{ color: 'var(--accent-blue)', marginRight: '10px' }}>{i + 1}.</span> 
                              {ex.name}
                            </span>
                            <button onClick={() => handleRemoveExerciseFromTemplate(i)} style={{ color: '#f44336', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2em', padding: '0 5px' }} title="Usuń z planu">✕</button>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '15px', marginTop: '20px' }}>
                    <button onClick={handleCloseCreator} style={{ flex: 1, padding: '15px', border: '1px solid var(--border-color)', borderRadius: '10px', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1em', boxSizing: 'border-box' }}>
                      Anuluj
                    </button>
                    <button onClick={handleSaveTemplate} style={{ flex: 1, padding: '15px', backgroundColor: 'var(--accent-green)', color: '#121212', border: 'none', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.1em', boxSizing: 'border-box' }}>
                      Zapisz plan
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}