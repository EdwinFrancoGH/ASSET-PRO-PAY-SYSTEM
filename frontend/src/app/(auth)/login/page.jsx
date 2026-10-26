"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { FiMail, FiLock, FiEye, FiEyeOff, FiCheckCircle, FiArrowRight } from "react-icons/fi";
import { useAuth } from "../../../context/AuthContext";
import LogoAssetPro from "../../../components/auth/LogoAssetPro";
import {
    etiquetaAuth,
    cajaInputAuth,
    inputAuth,
    iconoInputAuth,
    botonAuth,
    enlaceAuth,
    alertaErrorAuth,
    alertaAvisoAuth
} from "../../../components/auth/estilosAuth";

const MENSAJES = {
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/wrong-password": "Correo o contraseña incorrectos.",
    "auth/user-not-found": "Correo o contraseña incorrectos.",
    "auth/user-disabled": "Tu usuario está desactivado. Contacta al administrador.",
    "auth/too-many-requests": "Demasiados intentos fallidos. Espera unos minutos e inténtalo de nuevo."
};

const AVISOS = {
    inactividad: "Tu sesión se cerró automáticamente por inactividad.",
    salida: "Cerraste tu sesión correctamente."
};

// "Recordarme" solo guarda el CORREO en este navegador (nunca la contraseña
// ni la sesión), para no debilitar el cierre de sesión por seguridad.
const CLAVE_RECORDAR = "assetpro:correo";

const correoValido = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export default function LoginPage() {
    const { login, logout, user } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [verPassword, setVerPassword] = useState(false);
    const [recordarme, setRecordarme] = useState(false);
    const [error, setError] = useState("");
    const [aviso, setAviso] = useState("");
    const [enviando, setEnviando] = useState(false);

    // true mientras el propio formulario está iniciando sesión, para no
    // confundir el login recién hecho con un "regreso" a esta pantalla.
    const ingresandoRef = useRef(false);
    const preguntandoRef = useRef(false);

    // Mensaje informativo (?motivo=inactividad) y correo recordado.
    useEffect(() => {
        const motivo = new URLSearchParams(window.location.search).get("motivo");
        if (motivo && AVISOS[motivo]) setAviso(AVISOS[motivo]);
        try {
            const guardado = localStorage.getItem(CLAVE_RECORDAR);
            if (guardado) {
                setEmail(guardado);
                setRecordarme(true);
            }
        } catch {
            // Almacenamiento no disponible: se ignora.
        }
    }, []);

    // Si llega aquí con una sesión abierta (por ejemplo, con el botón
    // "Atrás" del navegador después de ingresar), se pregunta si desea
    // salir del sistema en lugar de dejar la sesión abierta.
    useEffect(() => {
        if (!user || ingresandoRef.current || preguntandoRef.current) return;
        preguntandoRef.current = true;

        Swal.fire({
            icon: "warning",
            title: "¿Deseas salir del sistema?",
            text: "Tienes una sesión abierta. Si sales, se cerrará tu sesión por seguridad.",
            showCancelButton: true,
            confirmButtonText: "Sí, cerrar sesión",
            cancelButtonText: "No, volver al sistema",
            confirmButtonColor: "#dc2626",
            reverseButtons: true,
            allowOutsideClick: false,
            allowEscapeKey: false
        }).then(async (r) => {
            preguntandoRef.current = false;
            if (r.isConfirmed) {
                await logout();
                setAviso(AVISOS.salida);
            } else {
                router.push("/dashboard");
            }
        });
    }, [user, logout, router]);

    const onSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setAviso("");
        setEnviando(true);
        ingresandoRef.current = true;
        try {
            await login(email.trim(), password);
            try {
                if (recordarme) localStorage.setItem(CLAVE_RECORDAR, email.trim());
                else localStorage.removeItem(CLAVE_RECORDAR);
            } catch {
                // Almacenamiento no disponible: se ignora.
            }
            // push (no replace) para que el login quede en el historial:
            // así, al presionar "Atrás", se vuelve aquí y se pregunta si
            // desea cerrar la sesión.
            router.push("/dashboard");
        } catch (err) {
            ingresandoRef.current = false;
            setError(MENSAJES[err.code] || "No se pudo iniciar sesión. Inténtalo de nuevo.");
            setEnviando(false);
        }
    };

    return (
        <form onSubmit={onSubmit} className="space-y-5">
            <div className="flex flex-col items-center text-center">
                <LogoAssetPro className="h-16 w-16 drop-shadow-[0_0_18px_rgba(59,130,246,0.55)]" />
                <h1 className="mt-4 text-3xl font-bold text-white">Bienvenido de nuevo</h1>
                <p className="mt-1 text-slate-300">Inicia sesión para continuar</p>
            </div>

            {aviso && <div role="status" className={alertaAvisoAuth}>{aviso}</div>}
            {error && <div role="alert" className={alertaErrorAuth}>{error}</div>}

            <div>
                <label htmlFor="email" className={etiquetaAuth}>Correo electrónico</label>
                <div className={cajaInputAuth}>
                    <FiMail className={iconoInputAuth} />
                    <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        placeholder="ejemplo@correo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputAuth}
                    />
                    {correoValido(email) && <FiCheckCircle className="shrink-0 text-xl text-emerald-400" aria-hidden="true" />}
                </div>
            </div>

            <div>
                <label htmlFor="password" className={etiquetaAuth}>Contraseña</label>
                <div className={cajaInputAuth}>
                    <FiLock className={iconoInputAuth} />
                    <input
                        id="password"
                        type={verPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        placeholder="Ingresa tu contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={inputAuth}
                    />
                    <button
                        type="button"
                        onClick={() => setVerPassword((v) => !v)}
                        aria-label={verPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        className="shrink-0 rounded-md p-1 text-xl text-slate-300 hover:text-white"
                    >
                        {verPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-200">
                    <input
                        type="checkbox"
                        checked={recordarme}
                        onChange={(e) => setRecordarme(e.target.checked)}
                        className="h-5 w-5 cursor-pointer rounded accent-blue-600"
                    />
                    Recordarme
                </label>
                <Link href="/forgot-password" className={enlaceAuth}>¿Olvidaste tu contraseña?</Link>
            </div>

            <button type="submit" disabled={enviando} className={botonAuth}>
                <FiLock className="text-xl" />
                {enviando ? "Ingresando..." : "Iniciar sesión"}
                <FiArrowRight className="absolute right-5 text-xl" />
            </button>
        </form>
    );
}
