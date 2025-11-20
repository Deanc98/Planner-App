// --- src/firebase.js ---
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your specific configuration
const firebaseConfig = {
  apiKey: "AIzaSyAS3KBm3VWbL5XPp3Xk9aoUNvNTjEB_SAw",
  authDomain: "trade-planner-d7b16.firebaseapp.com",
  projectId: "trade-planner-d7b16",
  storageBucket: "trade-planner-d7b16.firebasestorage.app",
  messagingSenderId: "338350944496",
  appId: "1:338350944496:web:0147dfd33d9aaee9159235",
  measurementId: "G-6TN8ERMV0H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export the services so other files can use them
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
