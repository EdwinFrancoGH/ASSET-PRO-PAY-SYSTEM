// Configuración de Firebase Admin (backend). Misma estructura que VetCare:
// exporta `db` como default y `{ db, auth }` con nombre.
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

import serviceAccount from "../../credentials/firebase-key.json" with { type: "json" };

const app = getApps().length === 0
    ? initializeApp({ credential: cert(serviceAccount) })
    : getApps()[0];

const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
export default db;
