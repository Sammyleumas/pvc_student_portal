import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = getApps().length ? getApps()[0] : initializeApp({
  projectId: firebaseConfig.projectId,
});

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
adminDb.settings({ ignoreUndefinedProperties: true });
