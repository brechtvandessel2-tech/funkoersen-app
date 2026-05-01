import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Vervang deze waarden met jouw Firebase project config
// Te vinden in: Firebase Console → Project Settings → Your apps
const firebaseConfig = {
  apiKey: "AIzaSyAsJXsWHtRya7Q5zjvlddXOXexqwAKbchU",
  authDomain: "funkoersen-2026.firebaseapp.com",
  projectId: "funkoersen-2026",
  storageBucket: "funkoersen-2026.firebasestorage.app",
  messagingSenderId: "196880358797",
  appId: "1:196880358797:web:e3016c6040b17270e6b1c4",
  measurementId: "G-QXCVKSL7H3"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
