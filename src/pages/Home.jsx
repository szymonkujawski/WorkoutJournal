import { useState } from 'react';
import WorkoutSession from '../components/WorkoutSession';
import TemplateManager from '../components/TemplateManager';

export default function Home() {
  const [activeTemplate, setActiveTemplate] = useState(null);

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
      <WorkoutSession prefilledTemplate={activeTemplate} onWorkoutEnd={clearActiveTemplate} />
      <TemplateManager onStartTemplate={handleStartFromTemplate} />
    </div>
  );
}