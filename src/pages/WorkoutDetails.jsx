import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { db, auth } from '../firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { motion } from 'framer-motion';

export default function WorkoutDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = auth.currentUser;

  const [workout, setWorkout] = useState(null);
  const [author, setAuthor] = useState(null);
  const [loading, setLoading] = useState(true);

  const [likes, setLikes] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchWorkoutAndAuthor = async () => {
      try {
        const workoutRef = doc(db, 'workouts', id);
        const workoutSnap = await getDoc(workoutRef);

        if (workoutSnap.exists()) {
          const wData = workoutSnap.data();
          setWorkout({ id: workoutSnap.id, ...wData });
          setLikes(wData.likes || []);

          const authorRef = doc(db, 'users_profiles', wData.userId);
          const authorSnap = await getDoc(authorRef);
          if (authorSnap.exists()) {
            setAuthor(authorSnap.data());
          }

          if (currentUser) {
            const myProfileRef = doc(db, 'users_profiles', currentUser.uid);
            const myProfileSnap = await getDoc(myProfileRef);
            if (myProfileSnap.exists()) {
              setCurrentUserProfile(myProfileSnap.data());
            }
          }
        }
      } catch (error) {
        console.error("Błąd pobierania sesji:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWorkoutAndAuthor();
  }, [id, currentUser]);

  useEffect(() => {
    const commentsRef = collection(db, 'workouts', id, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedComments = [];
      snapshot.forEach(doc => {
        fetchedComments.push({ id: doc.id, ...doc.data() });
      });
      setComments(fetchedComments);
    });

    return () => unsubscribe();
  }, [id]);

  const handleLikeToggle = async () => {
    if (!currentUser) return;
    const workoutRef = doc(db, 'workouts', id);
    const hasLiked = likes.includes(currentUser.uid);

    try {
      if (hasLiked) {
        setLikes(prev => prev.filter(uid => uid !== currentUser.uid));
        await updateDoc(workoutRef, { likes: arrayRemove(currentUser.uid) });
      } else {
        setLikes(prev => [...prev, currentUser.uid]);
        await updateDoc(workoutRef, { likes: arrayUnion(currentUser.uid) });
      }
    } catch (error) {
      console.error("Błąd przy dodawaniu lajka:", error);
      alert("Nie udało się zapisać polubienia. Sprawdź połączenie z internetem.");
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;

    setIsSubmitting(true);
    try {
      const username = currentUserProfile?.username || currentUserProfile?.displayName || currentUser.email.split('@')[0];
      const photoURL = currentUserProfile?.photoURL || '';

      await addDoc(collection(db, 'workouts', id, 'comments'), {
        userId: currentUser.uid,
        username: username,
        userPhoto: photoURL,
        text: newComment.trim(),
        createdAt: new Date()
      });
      
      setNewComment('');
    } catch (error) {
      console.error("Błąd przy dodawaniu komentarza:", error);
      alert("Nie udało się dodać komentarza. Upewnij się, że masz uprawnienia.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)' }}>Ładowanie sesji...</p>;
  if (!workout) return <p style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)' }}>Sesja nie istnieje lub została usunięta.</p>;

  const authorName = author?.username || author?.displayName || workout.userEmail?.split('@')[0] || 'Nieznany';
  const authorPhoto = author?.photoURL || '';
  const hasLiked = likes.includes(currentUser?.uid);

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} 
      animate={{ opacity: 1, x: 0 }}   
      exit={{ opacity: 0, x: 20 }}     
      transition={{ duration: 0.2 }}
      style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '40px' }}
    >
      
      {/* Przycisk powrotu na górze (zostaje nienaruszony dla wygodnej nawigacji) */}
      <button 
        onClick={() => navigate(-1)} 
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: 'bold', marginBottom: '20px', padding: 0, fontSize: '1em' }}
      >
        ← Powrót
      </button>

      {/* Karta głównego treningu */}
      <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '20px', marginBottom: '20px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid var(--border-color)', paddingBottom: '15px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--accent-blue)', color: '#121212', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', overflow: 'hidden' }}>
              {authorPhoto ? <img src={authorPhoto} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : authorName.charAt(0).toUpperCase()}
            </div>
            <div>
              <Link to={`/user/${workout.userId}`} style={{ fontWeight: 'bold', color: 'var(--text-primary)', textDecoration: 'none', fontSize: '1.1em' }}>
                {authorName}
              </Link>
              <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }}>
                {workout.createdAt?.toDate() ? workout.createdAt.toDate().toLocaleDateString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : 'Niedawno'}
              </div>
            </div>
          </div>
        </div>

        <h3 style={{ margin: '0 0 15px 0', color: 'var(--accent-green)' }}>{workout.workoutName || 'Trening'}</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {workout.exercises ? workout.exercises.map((ex, idx) => (
            <div key={idx} style={{ backgroundColor: 'var(--bg-primary)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '5px' }}>{ex.name}</strong>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9em' }}>
                {ex.sets ? ex.sets.map((s, i) => (
                  <span key={i} style={{ display: 'inline-block', marginRight: '10px' }}>
                    Seria {i+1}: <span style={{ color: 'var(--accent-blue)', fontWeight: 'bold' }}>{s.weight}kg</span> x {s.reps}
                  </span>
                )) : 'Brak szczegółów serii'}
              </div>
            </div>
          )) : (
            <p style={{ color: 'var(--text-secondary)' }}>Brak szczegółowych danych o ćwiczeniach.</p>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid var(--border-color)' }}>
          <button 
            onClick={handleLikeToggle}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              background: hasLiked ? 'rgba(100, 181, 246, 0.15)' : 'var(--bg-primary)', 
              border: hasLiked ? '1px solid var(--accent-blue)' : '1px solid var(--border-color)', 
              borderRadius: '20px',
              cursor: 'pointer', 
              color: hasLiked ? 'var(--accent-blue)' : 'var(--text-primary)', 
              fontWeight: 'bold', 
              padding: '8px 16px', 
              transition: 'all 0.2s ease' 
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill={hasLiked ? "var(--accent-blue)" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
            </svg>
            {likes.length} {likes.length === 1 ? 'osoba lubi to' : 'osób lubi to'}
          </button>
        </div>
      </div>

      {/* Sekcja Komentarzy */}
      <div style={{ backgroundColor: 'var(--bg-surface)', borderRadius: '12px', border: '1px solid var(--border-color)', padding: '20px' }}>
        <h4 style={{ margin: '0 0 15px 0', color: 'var(--text-primary)' }}>Komentarze ({comments.length})</h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '20px', maxHeight: '400px', overflowY: 'auto' }}>
          {comments.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9em', textAlign: 'center' }}>Bądź pierwszą osobą, która skomentuje!</p>
          ) : (
            comments.map(comment => (
              <div key={comment.id} style={{ display: 'flex', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--accent-blue)', color: '#121212', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', overflow: 'hidden', flexShrink: 0, fontSize: '0.8em' }}>
                  {comment.userPhoto ? <img src={comment.userPhoto} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : comment.username.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, backgroundColor: 'var(--bg-primary)', padding: '10px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <Link to={`/user/${comment.userId}`} style={{ fontWeight: 'bold', fontSize: '0.85em', color: 'var(--text-primary)', textDecoration: 'none' }}>
                      {comment.username}
                    </Link>
                    <span style={{ fontSize: '0.7em', color: 'var(--text-secondary)' }}>
                      {comment.createdAt?.toDate() ? comment.createdAt.toDate().toLocaleDateString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9em', lineHeight: '1.4' }}>
                    {comment.text}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="Napisz motywujący komentarz..." 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            disabled={isSubmitting}
            style={{ flex: 1, padding: '12px 15px', borderRadius: '20px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', outline: 'none' }}
          />
          <button 
            type="submit" 
            disabled={!newComment.trim() || isSubmitting}
            style={{ 
              padding: '0 20px', 
              borderRadius: '20px', 
              backgroundColor: newComment.trim() && !isSubmitting ? 'var(--accent-blue)' : 'var(--border-color)', 
              color: '#121212', 
              border: 'none', 
              fontWeight: 'bold', 
              cursor: newComment.trim() && !isSubmitting ? 'pointer' : 'not-allowed', 
              transition: 'background-color 0.2s' 
            }}
          >
            {isSubmitting ? 'Wysyłanie...' : 'Wyślij'}
          </button>
        </form>
      </div>

    </motion.div>
  );
}