// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

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
export default app;