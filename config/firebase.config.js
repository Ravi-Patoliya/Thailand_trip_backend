'use strict';
const admin = require('firebase-admin');

let firebaseApp = null;

const initFirebase = () => {
  if (firebaseApp) return firebaseApp;

  const hasJson  = !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const hasCreds = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!hasJson && !hasCreds) {
    if (process.env.NODE_ENV === 'production') {
      console.error('💀 Firebase: FIREBASE_SERVICE_ACCOUNT_JSON or GOOGLE_APPLICATION_CREDENTIALS required in production.');
      process.exit(1);
    }
    console.warn('⚠️  Firebase: not configured — push notifications will be skipped in dev.');
    return null;
  }

  try {
    const credential = hasJson
      ? admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))
      : admin.credential.applicationDefault();

    firebaseApp = admin.initializeApp({
      credential,
      projectId: process.env.FIREBASE_PROJECT_ID,
    });

    console.log('✅ Firebase Admin SDK initialised');
    return firebaseApp;

  } catch (err) {
    console.error('❌ Firebase init failed:', err.message);
    if (process.env.NODE_ENV === 'production') process.exit(1);
    return null;
  }
};

const getMessaging = () => {
  const app = initFirebase();
  if (!app) return null;
  return admin.messaging(app);
};

const getFirestore = () => {
  const app = initFirebase();
  if (!app) return null;
  return admin.firestore(app);
};

const getAuth = () => {
  const app = initFirebase();
  if (!app) return null;
  return admin.auth(app);
};

module.exports = { initFirebase, getMessaging, getFirestore, getAuth };
