import { useMemo } from 'react';

export default function StreakWidget({ workouts = [] }) {
  
  const { currentWeekDays, weeklyStreak, workoutsThisWeek } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // 1. Ustalanie dni bieżącego tygodnia (Pon-Niedz)
    const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1; 
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);

    const weekDays = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return {
        date: d,
        label: ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'][i],
        isToday: d.getTime() === today.getTime(),
        hasWorkout: false
      };
    });

    // 2. Grupowanie treningów po tygodniach i dniach
    const weekCounts = {};
    const uniqueWorkoutDates = new Set();

    workouts.forEach(w => {
      if (!w.createdAt) return;
      const d = w.createdAt.toDate();
      
      // Do zaznaczania "ptaszków" (każdy dzień z treningiem)
      const workoutDayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      uniqueWorkoutDates.add(workoutDayStart);

      // Do liczenia zasady "Min 2 treningi w tygodniu"
      const day = d.getDay() === 0 ? 6 : d.getDay() - 1;
      const weekStart = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day).getTime();
      
      weekCounts[weekStart] = (weekCounts[weekStart] || 0) + 1;
    });

    // Odznaczamy dni na interfejsie
    weekDays.forEach(day => {
      if (uniqueWorkoutDates.has(day.date.getTime())) {
        day.hasWorkout = true;
      }
    });

    // 3. Obliczanie "Globalnego Streaku" (Min. 2 treningi na tydzień)
    const validWeeks = Object.keys(weekCounts)
      .map(Number)
      .filter(weekStart => weekCounts[weekStart] >= 2)
      .sort((a, b) => b - a);

    let streak = 0;
    let weekToCheck = startOfWeek.getTime();
    const currentWeekCount = weekCounts[weekToCheck] || 0;

    // Jeśli w tym tygodniu mamy już cel (>=2), zaczynamy liczyć od niego
    if (validWeeks.includes(weekToCheck)) {
      // Będzie policzony w pętli
    } else {
      // Jeśli nie, streak nadal żyje, pod warunkiem, że w zeszłym tyg. był osiągnięty cel
      const lastWeek = new Date(weekToCheck);
      lastWeek.setDate(lastWeek.getDate() - 7);
      if (validWeeks.includes(lastWeek.getTime())) {
        weekToCheck = lastWeek.getTime();
      } else {
        weekToCheck = null; // Przerwany streak
      }
    }

    // Liczenie ciągłości wstecz
    if (weekToCheck !== null) {
      while (validWeeks.includes(weekToCheck)) {
        streak++;
        const prev = new Date(weekToCheck);
        prev.setDate(prev.getDate() - 7);
        weekToCheck = prev.getTime();
      }
    }

    return { 
      currentWeekDays: weekDays, 
      weeklyStreak: streak, 
      workoutsThisWeek: currentWeekCount 
    };
  }, [workouts]);

  return (
    <div style={{ 
      backgroundColor: 'var(--bg-surface)', 
      borderRadius: '16px', 
      padding: '25px 20px', 
      border: '1px solid var(--border-color)',
      marginBottom: '20px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
    }}>
      
      {/* GÓRA: Minimalistyczny blok z liczbą */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '25px' }}>
        
        <div style={{ 
          minWidth: '55px', 
          height: '55px', 
          backgroundColor: weeklyStreak > 0 ? 'var(--accent-blue)' : 'var(--bg-primary)', 
          borderRadius: '12px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: weeklyStreak > 0 ? '#121212' : 'var(--text-secondary)',
          fontSize: '1.6em',
          fontWeight: '900',
          border: weeklyStreak === 0 ? '1px solid var(--border-color)' : 'none'
        }}>
          {weeklyStreak}
        </div>

        <div>
          <h3 style={{ margin: '0 0 4px 0', fontSize: '1.3em', color: 'var(--text-primary)' }}>
            {weeklyStreak === 1 ? 'Tydzień' : (weeklyStreak > 0 && weeklyStreak < 5 ? 'Tygodnie' : 'Tygodni')} z rzędu
          </h3>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85em', lineHeight: '1.4' }}>
            {workoutsThisWeek >= 2 
              ? 'Świetnie! Cel na ten tydzień (2 treningi) osiągnięty.' 
              : `Zrób jeszcze ${2 - workoutsThisWeek} trening${2 - workoutsThisWeek === 1 ? '' : 'i'}, aby ${weeklyStreak > 0 ? 'utrzymać' : 'rozpocząć'} passę!`}
          </p>
        </div>
      </div>

      {/* DÓŁ: Dni bieżącego tygodnia */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
        {currentWeekDays.map((day, idx) => (
          <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              fontSize: '0.8em', 
              fontWeight: 'bold', 
              color: day.isToday ? 'var(--text-primary)' : 'var(--text-secondary)' 
            }}>
              {day.label}
            </span>
            
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: day.hasWorkout ? 'var(--accent-blue)' : (day.isToday ? 'rgba(255,255,255,0.05)' : 'transparent'),
              border: day.hasWorkout ? 'none' : (day.isToday ? '2px dashed var(--border-color)' : '2px solid var(--border-color)'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#121212',
              fontWeight: 'bold',
              fontSize: '1em'
            }}>
              {day.hasWorkout ? '✓' : ''}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}