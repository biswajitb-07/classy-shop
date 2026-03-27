import admin from "firebase-admin";

const getPrivateKey = () =>
  String(process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

export const initFirebaseAdmin = () => {
  if (admin.apps.length) {
    return admin.app();
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase Admin credentials are not configured");
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
};

export const verifyFirebaseIdToken = async (idToken) => {
  initFirebaseAdmin();
  return admin.auth().verifyIdToken(idToken);
};
