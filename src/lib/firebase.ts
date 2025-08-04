import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCW5_FGdw751zrXx45PbfLsedU5T-mOW2o",
  authDomain: "auth.cheat-code.cc",
  projectId: "cheatcode-cc",
  storageBucket: "cheatcode-cc.firebasestorage.app",
  messagingSenderId: "369737877345",
  appId: "1:369737877345:web:8511e3d48e9be09a9f2720",
  measurementId: "G-0H7VBLLBF0"
};


// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };