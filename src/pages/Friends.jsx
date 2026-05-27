import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, onSnapshot, or, orderBy, limit } from 'firebase/firestore';
import { Link } from 'react-router-dom'; // Dodajemy Link do nawigacji

export default function Friends() {
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchMessage, setSearchMessage] = useState('');
  
  const [pendingRequests, setPendingRequests] = useState([]);
  const [friendsList, setFriendsList] = useState([]);
  const [friendsWorkouts, setFriendsWorkouts] = useState([]); 
  const [loadingFeed, setLoadingFeed] = useState(false);
  
  const currentUser = auth.currentUser;

  // --- 1. NASŁUCHIWANIE NA ZAPROSZENIA I ZNAJOMOŚCI ---
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'friendships'),
      or(
        where('requesterId', '==', currentUser.uid),
        where('receiverId', '==', currentUser.uid)
      )
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const pending = [];
      const accepted = [];

      const profileSnap = await getDocs(collection(db, 'users_profiles'));
      const profilesMap = {};
      profileSnap.forEach(p => {
        profilesMap[p.id] = p.data().email;
      });

      snapshot.docs.forEach(document => {
        const data = document.data();
        const relationshipId = document.id;
        const otherUserId = data.requesterId === currentUser.uid ? data.receiverId : data.requesterId;
        const otherUserEmail = profilesMap[otherUserId] || 'Nieznany użytkownik';

        const relationshipData = { id: relationshipId, otherUserId, otherUserEmail, ...data };

        if (data.status === 'pending' && data.receiverId === currentUser.uid) {
          pending.push(relationshipData);
        } else if (data.status === 'accepted') {
          accepted.push(relationshipData);
        }
      });

      setPendingRequests(pending);
      setFriendsList(accepted);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // --- 2. POBIERANIE TRENINGÓW ZNAJOMYCH (FEED) ---
  useEffect(() => {
    if (friendsList.length === 0) {
      setFriendsWorkouts([]);
      return;
    }

    setLoadingFeed(true);
    const friendsIds = friendsList.map(f => f.otherUserId);

    const q = query(
      collection(db, 'workouts'),
      where('userId', 'in', friendsIds),
      orderBy('createdAt', 'desc'),
      limit(5) // Ograniczenie do 5 najnowszych treningów
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const workoutsFeed = [];
      snapshot.forEach(doc => {
        workoutsFeed.push({ id: doc.id, ...doc.data() });
      });
      setFriendsWorkouts(workoutsFeed);
      setLoadingFeed(false);
    }, (error) => {
      console.error("Błąd pobierania tablicy aktywności:", error);
      setLoadingFeed(false);
    });

    return () => unsubscribe();
  }, [friendsList]);

  // --- 3. WYSZUKIWARKA UŻYTKOWNIKÓW ---
  const handleSearch = async () => {
    if (!searchEmail) return;
    if (searchEmail.toLowerCase() === currentUser.email.toLowerCase()) {
      setSearchMessage('Nie możesz szukać samego siebie!');
      setSearchResult(null);
      return;
    }

    try {
      setSearchMessage('Szukam...');
      const q = query(collection(db, 'users_profiles'), where('email', '==', searchEmail.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setSearchMessage('Nie znaleziono użytkownika o takim e-mailu.');
        setSearchResult(null);
      } else {
        querySnapshot.forEach((doc) => {
          setSearchResult({ id: doc.id, ...doc.data() });
          setSearchMessage('');
        });
      }
    } catch (error) {
      setSearchMessage('Błąd wyszukiwania.');
    }
  };

  // --- 4. WYSYŁANIE ZAPROSZENIA ---
  const handleSendRequest = async () => {
    if (!searchResult) return;
    
    const isAlreadyFriend = friendsList.find(f => f.otherUserId === searchResult.id);
    const isPending = pendingRequests.find(f => f.otherUserId === searchResult.id);
    
    if (isAlreadyFriend || isPending) {
      alert('Jesteście już znajomymi lub zaproszenie oczekuje!');
      return;
    }

    try {
      await addDoc(collection(db, 'friendships'), {
        requesterId: currentUser.uid,
        receiverId: searchResult.id,
        status: 'pending',
        createdAt: new Date()
      });
      alert('Zaproszenie wysłane!');
      setSearchResult(null);
      setSearchEmail('');
    } catch (error) {
      alert('Błąd wysyłania zaproszenia.');
    }
  };

  // --- 5. AKCEPTACJA ZAPROSZENIA ---
  const handleAcceptRequest = async (relationshipId) => {
    try {
      const relRef = doc(db, 'friendships', relationshipId);
      await updateDoc(relRef, { status: 'accepted' });
    } catch (error) {
      alert('Błąd akceptacji zaproszenia.');
    }
  };

  const formatDuration = (totalSeconds) => {
    if (!totalSeconds) return '0 min';
    const minutes = Math.floor(totalSeconds / 60);
    return `${minutes} min`;
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '30px' }}>
      <h2 style={{ textAlign: 'center', color: '#2196F3', marginBottom: '30px' }}>Społeczność</h2>

      {/* --- SEKCJA 1: TABLICA AKTYWNOŚCI ZNAJOMYCH (FEED) --- */}
      <div style={{ marginBottom: '30px' }}>
        <h4 style={{ borderBottom: '2px solid #eee', paddingBottom: '5px', color: '#2196F3' }}>Aktualności znajomych</h4>
        {loadingFeed ? (
          <p style={{ textAlign: 'center', color: '#777' }}>Aktualizowanie tablicy...</p>
        ) : friendsWorkouts.length === 0 ? (
          <p style={{ color: '#777', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>Brak ostatniej aktywności znajomych.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
            {friendsWorkouts.map(workout => (
              <div key={workout.id} style={{ padding: '15px', backgroundColor: '#fff', border: '1px solid #e0e0e0', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  
                  {/* Klikalna nazwa/mail na tablicy */}
                  <Link to={`/user/${workout.userId}`} style={{ fontWeight: 'bold', color: '#1976d2', textDecoration: 'none' }}>
                    👤 {workout.userEmail}
                  </Link>
                  
                  <span style={{ fontSize: '0.8em', color: '#999' }}>
                    {workout.createdAt?.toDate() ? workout.createdAt.toDate().toLocaleDateString('pl-PL') : 'Niedawno'}
                  </span>
                </div>
                <h5 style={{ margin: '5px 0', fontSize: '1.1em', color: '#333' }}>
                  🏋️‍♂️ Ukończył trening: <span style={{ color: '#4CAF50' }}>{workout.workoutName || 'Trening'}</span>
                </h5>
                <p style={{ margin: '5px 0', fontSize: '0.85em', color: '#666' }}>
                  ⏱ Czas trwania: <strong>{formatDuration(workout.duration)}</strong>
                </p>
                <div style={{ marginTop: '8px', padding: '8px 12px', backgroundColor: '#f9f9f9', borderRadius: '6px', fontSize: '0.9em', color: '#555' }}>
                  <strong>Wykonane ćwiczenia:</strong>{' '}
                  {workout.exercises ? workout.exercises.map(ex => ex.name).join(', ') : 'Brak szczegółów'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- SEKCJA 2: MOI ZNAJOMI --- */}
      <div style={{ marginBottom: '30px' }}>
        <h4 style={{ borderBottom: '2px solid #eee', paddingBottom: '5px' }}>Moi znajomi ({friendsList.length})</h4>
        {friendsList.length === 0 ? (
          <p style={{ color: '#777', fontStyle: 'italic', textAlign: 'center', marginTop: '20px' }}>Nie masz jeszcze żadnych znajomych.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
            {friendsList.map(friend => (
              <div key={friend.id} style={{ display: 'flex', alignItems: 'center', backgroundColor: '#fff', padding: '12px', borderRadius: '8px', border: '1px solid #ddd' }}>
                <div style={{ width: '35px', height: '35px', borderRadius: '50%', backgroundColor: '#4CAF50', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginRight: '12px' }}>
                  {friend.otherUserEmail.charAt(0).toUpperCase()}
                </div>
                {/* Klikalna nazwa znajomego na liście */}
                <Link to={`/user/${friend.otherUserId}`} style={{ fontWeight: 'bold', color: '#333', textDecoration: 'none' }}>
                  {friend.otherUserEmail}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- SEKCJA 3: OCZEKUJĄCE ZAPROSZENIA --- */}
      {pendingRequests.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h4 style={{ borderBottom: '2px solid #eee', paddingBottom: '5px', color: '#f57c00' }}>Oczekujące zaproszenia</h4>
          {pendingRequests.map(req => (
            <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff3e0', padding: '12px 15px', borderRadius: '6px', marginBottom: '10px', border: '1px solid #ffe0b2' }}>
              <span>Zaproszenie od: <strong>{req.otherUserEmail}</strong></span>
              <button onClick={() => handleAcceptRequest(req.id)} style={{ backgroundColor: '#ff9800', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Akceptuj</button>
            </div>
          ))}
        </div>
      )}

      {/* --- SEKCJA 4: WYSZUKIWARKA (TERAZ NA SAMYM DOLE) --- */}
      <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
        <h4 style={{ margin: '0 0 15px 0' }}>Znajdź znajomego</h4>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="email" 
            placeholder="Wpisz dokładny adres e-mail" 
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            style={{ flex: 1, padding: '10px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button onClick={handleSearch} style={{ padding: '10px 20px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Szukaj</button>
        </div>
        {searchMessage && <p style={{ color: '#777', fontSize: '0.9em', marginTop: '10px' }}>{searchMessage}</p>}
        {searchResult && (
          <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#e3f2fd', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong style={{ display: 'block', color: '#1976d2' }}>{searchResult.displayName}</strong>
              <span style={{ fontSize: '0.85em', color: '#555' }}>{searchResult.email}</span>
            </div>
            <button onClick={handleSendRequest} style={{ backgroundColor: '#4CAF50', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>+ Zaproś</button>
          </div>
        )}
      </div>

    </div>
  );
}