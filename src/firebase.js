// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// Importujemy moduł bazy danych Firestore
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCWg2ZqxBe4zvDk0fLf5iRg1uVAhUoehXo",
  authDomain: "workoutjournal-app.firebaseapp.com",
  projectId: "workoutjournal-app",
  storageBucket: "workoutjournal-app.firebasestorage.app",
  messagingSenderId: "712421824627",
  appId: "1:712421824627:web:6dc2cc4846c3f6d2b5b206"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Inicjalizujemy usługi
const auth = getAuth(app);
const db = getFirestore(app); // To jest brakująca baza!

// Eksportujemy obie usługi, aby komponenty mogły z nich korzystać
export { auth, db };
export default app;