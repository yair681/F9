// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBAe1m7AapkyxxDFfs6AkyYdjnpUMKSSOM",
  authDomain: "pirhei-aharon.firebaseapp.com",
  projectId: "pirhei-aharon",
  storageBucket: "pirhei-aharon.firebasestorage.app",
  messagingSenderId: "294755528900",
  appId: "1:294755528900:web:caab9ed4e16f195db31991",
  //measurementId: "G-SLJ5MFQHPZ" // לא נחוץ לרוב פעולות ה-Auth/Firestore
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// משתנה ID ייחודי לאפליקציה
export const APP_ID_CUSTOM = "pirhei-aharon-app";

// ייצוא השירותים
export { app, auth, db };
