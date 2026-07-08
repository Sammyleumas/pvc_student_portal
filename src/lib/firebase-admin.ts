import adminApp from "firebase-admin/app";
const { initializeApp, getApps } = adminApp;
import adminAuthPkg from "firebase-admin/auth";
const { getAuth } = adminAuthPkg;
import firebaseConfig from "../../firebase-applet-config.json";

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

export const adminAuth = getAuth();
