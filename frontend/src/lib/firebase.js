// Firebase en el cliente: solo se usa Authentication (login). Los datos se
// leen siempre a través del backend, así que no se inicializa Firestore.
import { initializeApp, getApps } from "firebase/app";
import { getAuth, setPersistence, browserSessionPersistence } from "firebase/auth";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// Seguridad: la sesión vive solo mientras la pestaña esté abierta. Al cerrar
// la pestaña o el navegador, la sesión se elimina y hay que volver a ingresar.
if (typeof window !== "undefined") {
    setPersistence(auth, browserSessionPersistence).catch(() => {});
}

export default app;
