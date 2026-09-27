"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { claseInput, botonPrimario } from "../../../components/ui/estilos";

const MENSAJES = {
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/wrong-password": "Correo o contraseña incorrectos.",
    "auth/user-not-found": "Correo o contraseña incorrectos.",
    "auth/user-disabled": "Tu usuario está desactivado. Contacta al administrador.",
    "auth/too-many-requests": "Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo."
};

export default function LoginPage() {
    const { login, user } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        if (user) router.replace("/dashboard");
    }, [user, router]);

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setEnviando(true);
        try {
            await login(email.trim(), password);
            router.replace("/dashboard");
        } catch (err) {
            setError(MENSAJES[err.code] || "No se pudo iniciar sesión. Inténtalo de nuevo.");
            setEnviando(false);
        }
    };

    return (
        <form onSubmit={onSubmit} className="space-y-5">
            <h1 className="text-2xl font-bold text-slate-800">Iniciar sesión</h1>

            {error && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            <div>
                <label htmlFor="email" className="text-sm font-medium text-gray-600">Correo</label>
                <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={claseInput} />
            </div>

            <div>
                <label htmlFor="password" className="text-sm font-medium text-gray-600">Contraseña</label>
                <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className={claseInput} />
            </div>

            <button type="submit" disabled={enviando} className={`${botonPrimario} w-full`}>
                {enviando ? "Ingresando..." : "Ingresar"}
            </button>

            <p className="text-center text-sm">
                <Link href="/forgot-password" className="text-blue-600 hover:underline">¿Olvidaste tu contraseña?</Link>
            </p>

            <p className="text-center text-xs text-slate-500">
                Las cuentas las crea el administrador del sistema.
            </p>
        </form>
    );
}
