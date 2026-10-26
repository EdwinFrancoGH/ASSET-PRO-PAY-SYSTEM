"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

function PantallaCarga() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-white text-sm">Cargando...</p>
            </div>
        </div>
    );
}

// Protege las rutas privadas: sin sesión → /login. Con sesión, espera a
// que el backend devuelva el perfil (rol) antes de mostrar la app.
export default function ProtectedRoute({ children }) {
    const { user, loading, perfilListo, userData, errorPerfil, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) router.replace("/login");
    }, [user, loading, router]);

    if (loading || !user || !perfilListo) return <PantallaCarga />;

    if (!userData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
                <div className="max-w-md rounded-2xl bg-slate-800/35 backdrop-blur-xl ring-1 ring-white/15 p-8 text-center shadow-xl">
                    <h2 className="text-xl font-bold text-slate-100">No pudimos abrir tu cuenta</h2>
                    <p className="mt-3 text-slate-300">{errorPerfil}</p>
                    <button
                        onClick={logout}
                        className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
                    >
                        Cerrar sesión
                    </button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
