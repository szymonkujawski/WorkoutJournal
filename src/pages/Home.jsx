import { useState, useEffect } from 'react'; 
import { motion } from 'framer-motion'; // Dodałem import Framer Motion
import WorkoutSession from '../components/WorkoutSession';
import TemplateManager from '../components/TemplateManager';

export default function Home() {
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [isSessionRunning, setIsSessionRunning] = useState(false);

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
      initial={{ opacity: 0, x: -20 }} 
      animate={{ opacity: 1, x: 0 }}   
      exit={{ opacity: 0, x: 20 }}     
      transition={{ duration: 0.2 }}
      style={{ paddingBottom: '20px' }}
    >
      {/* Usunięto napis Strona Główna */}
      
      {/* Zawsze renderujemy WorkoutSession, on sam wie czy pokazać guzik startu, czy trwający trening */}
      <WorkoutSession prefilledTemplate={activeTemplate} onWorkoutEnd={clearActiveTemplate} />
      
      {/* NOWOŚĆ: Wyświetlamy TemplateManager TYLKO wtedy, gdy isSessionRunning jest fałszem */}
      {!isSessionRunning && (
        <TemplateManager onStartTemplate={handleStartFromTemplate} />
      )}
    </motion.div>
  );
}