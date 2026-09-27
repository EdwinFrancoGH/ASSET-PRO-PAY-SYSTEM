import axios from "axios";
import { auth } from "../lib/firebase";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
});

// Adjunta el token de Firebase del usuario en cada petición (igual que VetCare).
api.interceptors.request.use(async (config) => {
    const currentUser = auth.currentUser;

    if (currentUser) {
        const idToken = await currentUser.getIdToken();
        config.headers.Authorization = `Bearer ${idToken}`;
    }

    return config;
});

export default api;
