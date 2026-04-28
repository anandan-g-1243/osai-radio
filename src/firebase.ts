import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
};

const requiredEnvMap = {
  VITE_FIREBASE_API_KEY: firebaseConfig.apiKey,
  VITE_FIREBASE_AUTH_DOMAIN: firebaseConfig.authDomain,
  VITE_FIREBASE_PROJECT_ID: firebaseConfig.projectId,
  VITE_FIREBASE_STORAGE_BUCKET: firebaseConfig.storageBucket,
  VITE_FIREBASE_MESSAGING_SENDER_ID: firebaseConfig.messagingSenderId,
  VITE_FIREBASE_APP_ID: firebaseConfig.appId,
  VITE_FIREBASE_DATABASE_URL: firebaseConfig.databaseURL,
} as const;

const missingEnvKeys = Object.entries(requiredEnvMap)
  .filter(([, value]) => typeof value !== 'string' || value.trim().length === 0)
  .map(([key]) => key);

export const firebaseConfigError =
  missingEnvKeys.length > 0
    ? `Missing Firebase environment variables: ${missingEnvKeys.join(', ')}`
    : null;

const app = firebaseConfigError ? null : initializeApp(firebaseConfig);

export const db = app ? getDatabase(app) : null;
export const storage = app ? getStorage(app) : null;
