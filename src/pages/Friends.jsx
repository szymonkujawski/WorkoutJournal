import { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, doc, updateDoc, deleteDoc, onSnapshot, or } from 'firebase/firestore';
import { Link } from 'react-router-dom'; 
import { motion } from 'framer-motion';

export default function Friends() {
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchMessage, setSearchMessage] = useState('');
  
  const [pendingRequests, setPendingRequests] = useState([]);
  const [friendsList, setFriendsList] = useState([]);
  const [friendsWorkouts, setFriendsWorkouts] = useState([]); 
  const [loadingFeed, setLoadingFeed] = useState(false);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [friendToDelete, setFriendToDelete] = useState(null);
  const [alertData, setAlertData] = useState({ show: false, message: '', type: 'info' });

  const [usersProfiles, setUsersProfiles] = useState({});

  const currentUser = auth.currentUser;

  const showCustomAlert = (message, type = 'info') => {
    setAlertData({ show: true, message, type });
  };

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
        profilesMap[p.id] = p.data();
      });
      setUsersProfiles(profilesMap);

      snapshot.docs.forEach(document => {
        const data = document.data();
        const relationshipId = document.id;
        const otherUserId = data.requesterId === currentUser.uid ? data.receiverId : data.requesterId;
        
        const profileData = profilesMap[otherUserId] || {};
        const otherUserEmail = profileData.email || 'Nieznany użytkownik';
        const otherUsername = profileData.username || profileData.displayName || otherUserEmail.split('@')[0];
        const otherUserPhoto = profileData.photoURL || '';

        const relationshipData = { 
          id: relationshipId, 
          otherUserId, 
          otherUserEmail, 
          otherUsername, 
          otherUserPhoto, 
          ...data 
        };

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
    const friendsIds = friendsList.map(f => f.otherUserId).slice(0, 10);

    const q = query(
      collection(db, 'workouts'),
      where('userId', 'in', friendsIds)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const workoutsFeed = [];
      snapshot.forEach(doc => {
        workoutsFeed.push({ id: doc.id, ...doc.data() });
      });

      workoutsFeed.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });

      setFriendsWorkouts(workoutsFeed.slice(0, 5));
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
      showCustomAlert('Jesteście już znajomymi lub Twoje zaproszenie oczekuje na akceptację.', 'info');
      return;
    }

    try {
      await addDoc(collection(db, 'friendships'), {
        requesterId: currentUser.uid,
        receiverId: searchResult.id,
        status: 'pending',
        createdAt: new Date()
      });
      showCustomAlert('Zaproszenie zostało pomyślnie wysłane!', 'success');
      setSearchResult(null);
      setSearchEmail('');
    } catch (error) {
      showCustomAlert('Wystąpił błąd podczas wysyłania zaproszenia.', 'error');
    }
  };

  const handleAcceptRequest = async (relationshipId) => {
    try {
      const relRef = doc(db, 'friendships', relationshipId);
      await updateDoc(relRef, { status: 'accepted' });
    } catch (error) {
      showCustomAlert('Błąd akceptacji zaproszenia.', 'error');
    }
  };

  const handleRejectRequest = async (relationshipId) => {
    try {
      await deleteDoc(doc(db, 'friendships', relationshipId));
    } catch (error) {
      showCustomAlert('Błąd podczas odrzucania zaproszenia.', 'error');
    }
  };

  const initiateRemoveFriend = (friend) => {
    setFriendToDelete(friend);
    setShowDeleteModal(true);
  };

  const confirmRemoveFriend = async () => {
    if (!friendToDelete) return;
    try {
      await deleteDoc(doc(db, 'friendships', friendToDelete.id));
      setShowDeleteModal(false);
      setFriendToDelete(null);
    } catch (error) {
      showCustomAlert('Błąd podczas usuwania znajomego.', 'error');
    }
  };

  const getAlertColor = () => {
    if (alertData.type === 'success') return 'var(--accent-green)';
    if (alertData.type === 'error') return '#ff5252';
    return 'var(--accent-blue)';
  };

  const getAlertTitle = () => {
    if (alertData.type === 'success') return 'Sukces!';
    if (alertData.type === 'error') return 'Błąd';
    return 'Informacja';
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} 
      animate={{ opacity: 1, x: 0 }}   
      exit={{ opacity: 0, x: 20 }}     
      transition={{ duration: 0.2 }}
      style={{ maxWidth: '600px', margin: '0 auto', paddingBottom: '30px' }}
    >

      {/* Aktualności znajomych */}
      <div style={{ marginBottom: '30px' }}>
        <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '5px', color: 'var(--text-primary)' }}>Aktualności znajomych</h4>
        {loadingFeed ? (
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Aktualizowanie tablicy...</p>
        ) : friendsWorkouts.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>Brak ostatniej aktywności znajomych.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginTop: '15px' }}>
            {friendsWorkouts.map(workout => {
              const authorProfile = usersProfiles[workout.userId] || {};
              const authorName = authorProfile.username || authorProfile.displayName || workout.userEmail?.split('@')[0] || 'Nieznany';
              const authorPhoto = authorProfile.photoURL || '';

              return (
                <div key={workout.id} style={{ padding: '15px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '30px', height: '30px', borderRadius: '50%', backgroundColor: 'var(--accent-blue)', color: '#121212', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', overflow: 'hidden', flexShrink: 0, fontSize: '0.85em' }}>
                        {authorPhoto ? (
                          <img src={authorPhoto} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          authorName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <Link to={`/user/${workout.userId}`} style={{ fontWeight: 'bold', color: 'var(--accent-blue)', textDecoration: 'none' }}>
                        {authorName}
                      </Link>
                    </div>
                    
                    <span style={{ fontSize: '0.8em', color: 'var(--text-secondary)' }}>
                      {workout.createdAt?.toDate() ? workout.createdAt.toDate().toLocaleDateString('pl-PL') : 'Niedawno'}
                    </span>
                  </div>
                  <h5 style={{ margin: '5px 0', fontSize: '1.1em', color: 'var(--text-primary)' }}>
                    Ukończył trening: <span style={{ color: 'var(--accent-green)' }}>{workout.workoutName || 'Trening'}</span>
                  </h5>
                  <div style={{ marginTop: '8px', padding: '8px 12px', backgroundColor: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.9em', color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Wykonane ćwiczenia:</strong>{' '}
                    {workout.exercises ? workout.exercises.map(ex => ex.name).join(', ') : 'Brak szczegółów'}
                <Link 
                  to={`/workout/${workout.id}`} 
                  style={{ 
                    display: 'block', 
                    textAlign: 'center', 
                    marginTop: '12px', 
                    padding: '10px', 
                    backgroundColor: 'rgba(100, 181, 246, 0.1)', 
                    border: '1px solid var(--accent-blue)', 
                    borderRadius: '8px', 
                    textDecoration: 'none', 
                    color: 'var(--accent-blue)', 
                    fontWeight: 'bold',
                    fontSize: '0.9em',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(100, 181, 246, 0.2)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(100, 181, 246, 0.1)'}
                >
                  Zobacz szczegóły
                </Link>
                  </div>
                  
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lista znajomych */}
      <div style={{ marginBottom: '30px' }}>
        <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '5px', color: 'var(--text-primary)' }}>Moi znajomi ({friendsList.length})</h4>
        {friendsList.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', textAlign: 'center', marginTop: '20px' }}>Nie masz jeszcze żadnych znajomych.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
            {friendsList.map(friend => (
              <div key={friend.id} style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-surface)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                
                <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: 'var(--accent-blue)', color: '#121212', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', marginRight: '12px', overflow: 'hidden', flexShrink: 0 }}>
                  {friend.otherUserPhoto ? (
                    <img src={friend.otherUserPhoto} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    friend.otherUsername.charAt(0).toUpperCase()
                  )}
                </div>
                
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <Link to={`/user/${friend.otherUserId}`} style={{ fontWeight: 'bold', color: 'var(--text-primary)', textDecoration: 'none', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {friend.otherUsername}
                  </Link>
                  <div style={{ fontSize: '0.8em', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {friend.otherUserEmail}
                  </div>
                </div>

                <button 
                  onClick={() => initiateRemoveFriend(friend)}
                  style={{ background: 'none', border: 'none', color: '#ff5252', fontSize: '1.2em', cursor: 'pointer', padding: '5px 10px', fontWeight: 'bold' }}
                  title="Usuń ze znajomych"
                >
                  ✕
                </button>

              </div>
            ))}
          </div>
        )}
      </div>

      {/* Oczekujące zaproszenia */}
      {pendingRequests.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
          <h4 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '5px', color: '#ffb74d' }}>Oczekujące zaproszenia</h4>
          {pendingRequests.map(req => (
            <div key={req.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--bg-surface-hover)', padding: '12px 15px', borderRadius: '6px', marginBottom: '10px', border: '1px solid var(--border-color)' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{req.otherUsername}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{req.otherUserEmail}</span>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: '10px' }}>
                <button 
                  onClick={() => handleRejectRequest(req.id)} 
                  style={{ backgroundColor: 'transparent', color: '#ff5252', border: '1px solid #ff5252', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85em' }}
                >
                  Odrzuć
                </button>
                <button 
                  onClick={() => handleAcceptRequest(req.id)} 
                  style={{ backgroundColor: 'var(--accent-green)', color: '#121212', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85em' }}
                >
                  Akceptuj
                </button>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* Wyszukiwarka znajomych */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              
              <div style={{ width: '35px', height: '35px', borderRadius: '50%', backgroundColor: 'var(--accent-blue)', color: '#121212', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', overflow: 'hidden' }}>
                {searchResult.photoURL ? (
                  <img src={searchResult.photoURL} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (searchResult.username || searchResult.displayName || searchResult.email).charAt(0).toUpperCase()
                )}
              </div>

              <div>
                <strong style={{ display: 'block', color: 'var(--text-primary)' }}>
                  {searchResult.username || searchResult.displayName || 'Nieznany'}
                </strong>
                <span style={{ fontSize: '0.85em', color: 'var(--text-secondary)' }}>{searchResult.email}</span>
              </div>
            </div>
            
            <button onClick={handleSendRequest} style={{ backgroundColor: 'var(--accent-green)', color: '#121212', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>+ Zaproś</button>
          </div>
        )}
      </div>

      {/* Modal Usuwania Znajomego */}
      {showDeleteModal && friendToDelete && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '25px', borderRadius: '12px', border: '1px solid var(--border-color)', maxWidth: '350px', width: '90%', textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>Usuwanie znajomego</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95em', marginBottom: '20px', lineHeight: '1.4' }}>
              Czy na pewno chcesz usunąć użytkownika <strong style={{ color: 'var(--text-primary)' }}>{friendToDelete.otherUsername}</strong> ze swoich znajomych?
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                onClick={() => { setShowDeleteModal(false); setFriendToDelete(null); }} 
                style={{ padding: '10px 15px', border: '1px solid var(--border-color)', borderRadius: '8px', backgroundColor: 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                Anuluj
              </button>
              <button 
                onClick={confirmRemoveFriend} 
                style={{ padding: '10px 15px', border: 'none', borderRadius: '8px', backgroundColor: '#ff5252', color: '#121212', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Usuń
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Powiadomienie */}
      {alertData.show && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ backgroundColor: 'var(--bg-surface)', padding: '25px', borderRadius: '12px', border: `1px solid ${getAlertColor()}`, maxWidth: '350px', width: '90%', textAlign: 'center', boxShadow: `0 8px 30px rgba(0,0,0,0.5)` }}>
            
            <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: `${getAlertColor()}20`, color: getAlertColor(), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5em', margin: '0 auto 15px auto', fontWeight: 'bold' }}>
              {alertData.type === 'success' ? '✓' : alertData.type === 'error' ? '✕' : 'i'}
            </div>

            <h4 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)', fontSize: '1.2em' }}>{getAlertTitle()}</h4>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95em', marginBottom: '25px', lineHeight: '1.4' }}>
              {alertData.message}
            </p>
            
            <button 
              onClick={() => setAlertData({ show: false, message: '', type: 'info' })} 
              style={{ width: '100%', padding: '12px', border: 'none', borderRadius: '8px', backgroundColor: getAlertColor(), color: '#121212', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Zrozumiałem
            </button>
          </div>
        </div>
      )}

    </motion.div>
  );
}