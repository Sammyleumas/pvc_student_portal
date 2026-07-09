import adminApp from "firebase-admin/app";
const { initializeApp, getApps } = adminApp;
import adminAuthPkg from "firebase-admin/auth";
const { getAuth } = adminAuthPkg;
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      projectId: firebaseConfig.projectId,
    });

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app, firebaseConfig.firestoreDatabaseId);
