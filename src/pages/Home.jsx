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
      <h2 style={{ textAlign: 'center', marginBottom: '30px', color: 'var(--accent-blue)' }}>Strona Główna</h2>
      
      <WorkoutSession prefilledTemplate={activeTemplate} onWorkoutEnd={clearActiveTemplate} />
      <TemplateManager onStartTemplate={handleStartFromTemplate} />
    </div>
  );
}