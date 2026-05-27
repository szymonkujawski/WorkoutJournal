import WorkoutHistory from '../components/WorkoutHistory';

export default function History() {
  return (
    <div style={{ paddingBottom: '20px' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--accent-blue)' }}>Historia</h2>
      <WorkoutHistory />
    </div>
  );
}