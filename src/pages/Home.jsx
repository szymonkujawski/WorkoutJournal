import { useState, useEffect } from 'react'; 
import { motion, AnimatePresence } from 'framer-motion';
import WorkoutSession from '../components/WorkoutSession';
import TemplateManager from '../components/TemplateManager';

export default function Home() {
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [isSessionRunning, setIsSessionRunning] = useState(false);
  
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(true);
  const [templatesCount, setTemplatesCount] = useState(0); 

  useEffect(() => {
    const checkActiveWorkout = () => {
      const active = localStorage.getItem('active_workout_state');
      setIsSessionRunning(!!active);
    };

    checkActiveWorkout(); 
    const interval = setInterval(checkActiveWorkout, 1000); 
    
    return () => clearInterval(interval);
  }, []);

  const handleStartFromTemplate = (template) => {
    setActiveTemplate(template);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearActiveTemplate = () => {
    setActiveTemplate(null);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }}   
      exit={{ opacity: 0, y: -15 }}     
      transition={{ duration: 0.3 }}
      style={{ paddingBottom: '30px', maxWidth: '500px', margin: '0 auto' }} /* ZMIANA: Z 600px na 500px */
    >
      <div style={{ textAlign: 'center', marginBottom: '35px', marginTop: '10px' }}>
        <h2 style={{ margin: '0 0 5px 0', color: 'var(--text-primary)', fontSize: '1.8em' }}>Panel Główny</h2>
        <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95em' }}>
          Wybierz plan z listy lub rozpocznij pusty trening.
        </p>
      </div>
      
      <div style={{ marginBottom: '25px' }}>
        <WorkoutSession prefilledTemplate={activeTemplate} onWorkoutEnd={clearActiveTemplate} />
      </div>
      
      {!isSessionRunning && (
        <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
          
          <button
            onClick={() => setIsTemplatesOpen(!isTemplatesOpen)}
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '18px 20px',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '1.1em',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <span>
              Moje plany treningowe{' '}
              <span style={{ color: 'var(--accent-blue)', fontWeight: 'normal', fontSize: '0.9em' }}>
                ({templatesCount})
              </span>
            </span>
            
            <motion.span
              animate={{ rotate: isTemplatesOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ color: 'var(--text-secondary)', display: 'inline-block', fontSize: '0.8em' }}
            >
              ▼
            </motion.span>
          </button>

          <AnimatePresence>
            {isTemplatesOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <div style={{ padding: '0 20px 20px 20px', borderTop: '1px solid var(--border-color)' }}>
                  <TemplateManager 
                    onStartTemplate={handleStartFromTemplate} 
                    onTemplatesLoaded={(count) => setTemplatesCount(count)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
        </div>
      )}
    </motion.div>
  );
}