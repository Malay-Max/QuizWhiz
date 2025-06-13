
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getAuth, type Auth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfigValues: {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  measurementId?: string; // Optional
} = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;

if (!getApps().length) {
  // Explicitly check for projectId
  if (!firebaseConfigValues.projectId) {
    throw new Error(
      `Firebase initialization failed: 'projectId' is missing. ` +
      "Please ensure the 'NEXT_PUBLIC_FIREBASE_PROJECT_ID' environment variable is set correctly, especially in your Vercel project settings for the build environment."
    );
  }

  // Construct the config object with only defined values
  const definedConfig: { [key: string]: string } = {};
  (Object.keys(firebaseConfigValues) as Array<keyof typeof firebaseConfigValues>).forEach((key) => {
    if (firebaseConfigValues[key] !== undefined) {
      definedConfig[key] = firebaseConfigValues[key]!;
    }
  });

  app = initializeApp(definedConfig);
} else {
  app = getApps()[0];
}

const db: Firestore = getFirestore(app);
const auth: Auth = getAuth(app);

export { app, db, auth };
