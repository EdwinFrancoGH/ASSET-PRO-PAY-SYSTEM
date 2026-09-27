"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../lib/firebase";
import { obtenerMiUsuario } from "../services/auth.service";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [errorPerfil, setErrorPerfil] = useState("");
    const [loading, setLoading] = useState(true);
    // true cuando ya se intentó cargar el perfil del usuario logueado
    const [perfilListo, setPerfilListo] = useState(false);

    // A diferencia de VetCare, el rol no se lee de Firestore desde el
    // navegador: se pide al backend (/api/auth/me). Así Firestore puede
    // tener reglas cerradas.
    const cargarPerfil = useCallback(async () => {
        try {
            const { data } = await obtenerMiUsuario();
            setUserData(data.data);
            setErrorPerfil("");
        } catch (error) {
            setUserData(null);
            setErrorPerfil(error.response?.data?.message || "No se pudo cargar tu usuario. Revisa que el servidor esté encendido.");
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                setPerfilListo(false);
                await cargarPerfil();
                setPerfilListo(true);
            } else {
                setPerfilListo(true);
                setUserData(null);
                setErrorPerfil("");
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [cargarPerfil]);

    const login = (email, password) => signInWithEmailAndPassword(auth, email, password);

    const logout = () => signOut(auth);

    const resetPassword = (email) => sendPasswordResetEmail(auth, email);

    const value = {
        user,
        userData,
        userRole: userData?.role || null,
        errorPerfil,
        loading,
        perfilListo,
        login,
        logout,
        resetPassword,
        refreshUserData: cargarPerfil
    };

    return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth debe usarse dentro de un AuthProvider");
    return context;
}
