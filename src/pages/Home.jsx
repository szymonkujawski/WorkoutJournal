import { useState } from 'react';
import WorkoutSession from '../components/WorkoutSession';
import TemplateManager from '../components/TemplateManager';

export default function Home() {
  // Stan przechowujący wybrany szablon, który przekażemy do stopera
  const [activeTemplate, setActiveTemplate] = useState(null);

  const handleStartFromTemplate = (template) => {
    setActiveTemplate(template);
    // Po przekazaniu szablonu, przewijamy ekran gładko na samą górę do formularza
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Funkcja resetująca po zapisaniu/anulowaniu treningu
  const clearActiveTemplate = () => {
    setActiveTemplate(null);
  };

  return (
    <div style={{ paddingBottom: '20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '30px' }}>Strona Główna</h2>
      
      {/* Przekazujemy szablon jako "prop" (właściwość) do komponentu sesji */}
      <WorkoutSession prefilledTemplate={activeTemplate} onWorkoutEnd={clearActiveTemplate} />

      <TemplateManager onStartTemplate={handleStartFromTemplate} />
    </div>
  );
}