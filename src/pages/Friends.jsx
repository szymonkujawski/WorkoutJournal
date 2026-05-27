import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, onSnapshot, or, orderBy, limit } from 'firebase/firestore';
import { Link } from 'react-router-dom'; 

export default function Friends() {
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchMessage, setSearchMessage] = useState('');
  
  const [pendingRequests, setPendingRequests] = useState([]);
  const [friendsList, setFriendsList] = useState([]);
  const [friendsWorkouts, setFriendsWorkouts] = useState([]); 
  const [loadingFeed, setLoadingFeed] = useState(false);
  
  const currentUser = auth.currentUser;

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
      limit(5)
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
      <h2 style={{ textAlign: 'center', color: 'var(--accent-blue)', marginBottom: '30px' }}>Społeczność</h2>

      <div style={{ marginBottom: '30px' }}>
        <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '5px', color: 'var(--text-primary)' }}>Aktualności znajomych</h4>
        {loadingFeed ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Aktualizowanie tablicy...</p>
        ) : friendsWorkouts.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>Brak ostatniej aktywności znajomych.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
            {friendsWorkouts.map(workout => (
              <div key={workout.id} style={{ padding: '15px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  
                  <Link to={`/user/${workout.userId}`} style={{ fontWeight: 'bold', color: 'var(--accent-blue)', textDecoration: 'none' }}>
                    👤 {workout.userEmail}
                  </Link>
                  
                  <span style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }}>
                    {workout.createdAt?.toDate() ? workout.createdAt.toDate().toLocaleDateString('pl-PL') : 'Niedawno'}
                  </span>
                </div>
                <h5 style={{ margin: '5px 0', fontSize: '1.1em', color: 'var(--text-primary)' }}>
                  🏋️‍♂️ Ukończył trening: <span style={{ color: 'var(--accent-green)' }}>{workout.workoutName || 'Trening'}</span>
                </h5>
                <p style={{ margin: '5px 0', fontSize: '0.85em', color: 'var(--text-secondary)' }}>
                  ⏱ Czas trwania: <strong>{formatDuration(workout.duration)}</strong>
                </p>
                <div style={{ marginTop: '8px', padding: '8px 12px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Wykonane ćwiczenia:</strong>{' '}
                  {workout.exercises ? workout.exercises.map(ex => ex.name).join(', ') : 'Brak szczegółów'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '5px', color: 'var(--text-primary)' }}>Moi znajomi ({friendsList.length})</h4>
        {friendsList.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', marginTop: '20px' }}>Nie masz jeszcze żadnych znajomych.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
            {friendsList.map(friend => (
              <div key={friend.id} style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ width: '35px', height: '35px', borderRadius: '50%', backgroundColor: 'var(--accent-blue)', color: '#121212', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginRight: '12px' }}>
                  {friend.otherUserEmail.charAt(0).toUpperCase()}
                </div>
                <Link to={`/user/${friend.otherUserId}`} style={{ fontWeight: 'bold', color: 'var(--text-primary)', textDecoration: 'none' }}>
                  {friend.otherUserEmail}
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {pendingRequests.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '5px', color: '#ffb74d' }}>Oczekujące zaproszenia</h4>
          {pendingRequests.map(req => (
            <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface-hover)', padding: '12px 15px', borderRadius: '6px', marginBottom: '10px', border: '1px solid var(--border-color)' }}>
              <span style={{ color: 'var(--text-primary)' }}>Od: <strong>{req.otherUserEmail}</strong></span>
              <button onClick={() => handleAcceptRequest(req.id)} style={{ backgroundColor: 'var(--accent-green)', color: '#121212', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>Akceptuj</button>
            </div>
          ))}
        </div>
      )}

      <div style={{ backgroundColor: 'var(--bg-surface)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <h4 style={{ margin: '0 0 15px 0', color: 'var(--text-primary)' }}>Znajdź znajomego</h4>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="email" 
            placeholder="Wpisz dokładny adres e-mail" 
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            style={{ flex: 1 }}
          />
          <button onClick={handleSearch} style={{ padding: '10px 20px', backgroundColor: 'var(--accent-blue)', color: '#121212', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Szukaj</button>
        </div>
        {searchMessage && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9em', marginTop: '10px' }}>{searchMessage}</p>}
        {searchResult && (
          <div style={{ marginTop: '15px', padding: '15px', backgroundColor: 'var(--bg-surface-hover)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-color)' }}>
            <div>
              <strong style={{ display: 'block', color: 'var(--accent-blue)' }}>{searchResult.displayName}</strong>
              <span style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>{searchResult.email}</span>
            </div>
            <button onClick={handleSendRequest} style={{ backgroundColor: 'var(--accent-green)', color: '#121212', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>+ Zaproś</button>
          </div>
        )}
      </div>

    </div>
  );
}