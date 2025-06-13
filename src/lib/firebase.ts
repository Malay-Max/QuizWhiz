
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// Replace these with your actual Firebase project configuration values
const firebaseConfigValues: {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string; // Explicitly typed as optional
} = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // measurementId will be undefined if the env var is not set
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  // Filter out undefined values from firebaseConfigValues before passing to initializeApp,
  // though initializeApp should handle undefined optional fields gracefully.
  const definedConfig = Object.fromEntries(
    Object.entries(firebaseConfigValues).filter(([, value]) => value !== undefined)
  );
  app = initializeApp(definedConfig);
} else {
  app = getApps()[0];
}

const db: Firestore = getFirestore(app);

export { app, db };
