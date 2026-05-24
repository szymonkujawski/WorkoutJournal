import Register from './components/Register';

function App() {
  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>WorkoutJournal</h1>
      <p>Aplikacja do monitorowania postępów treningowych</p>
      
      {/* Wyświetlamy nasz nowy komponent */}
      <Register />
    </div>
  );
}

export default App;