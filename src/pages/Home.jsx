import { useState, useEffect } from 'react'; // ZMIANA: Dodano useEffect
import WorkoutSession from '../components/WorkoutSession';
import TemplateManager from '../components/TemplateManager';

export default function Home() {
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [isSessionRunning, setIsSessionRunning] = useState(false); // NOWOŚĆ: Stan trwającej sesji

  // NOWOŚĆ: Nasłuchujemy, czy w tle działa trening zapisany w localStorage
  useEffect(() => {
    const checkActiveWorkout = () => {
      const active = localStorage.getItem('active_workout_state');
      setIsSessionRunning(!!active);
    };

    checkActiveWorkout(); // Sprawdź od razu po wejściu na stronę
    const interval = setInterval(checkActiveWorkout, 1000); // Sprawdzaj co sekundę (reaguje natychmiast na kliknięcie Zakończ/Rozpocznij)
    
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
    <div style={{ paddingBottom: '20px' }}>
      {/* Usunięto napis Strona Główna */}
      
      {/* Zawsze renderujemy WorkoutSession, on sam wie czy pokazać guzik startu, czy trwający trening */}
      <WorkoutSession prefilledTemplate={activeTemplate} onWorkoutEnd={clearActiveTemplate} />
      
      {/* NOWOŚĆ: Wyświetlamy TemplateManager TYLKO wtedy, gdy isSessionRunning jest fałszem */}
      {!isSessionRunning && (
        <TemplateManager onStartTemplate={handleStartFromTemplate} />
      )}
    </div>
  );
}