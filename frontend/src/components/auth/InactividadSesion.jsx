"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaClock } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";

// Tiempo sin actividad antes de preguntar si desea continuar.
const INACTIVIDAD_MS = 60 * 1000; // 1 minuto
// Tiempo que tiene el usuario para responder antes del cierre automático.
const AVISO_MS = 30 * 1000; // 30 segundos

const EVENTOS_ACTIVIDAD = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "wheel"];

// Vigila la actividad del usuario dentro del sistema. Tras 1 minuto sin
// actividad muestra un aviso; si no responde en 30 segundos, cierra la sesión.
// Se basa en marcas de tiempo (no solo en timers) para que funcione aunque
// el navegador congele los timers de una pestaña en segundo plano.
export default function InactividadSesion() {
    const { logout } = useAuth();
    const router = useRouter();

    const ultimaActividad = useRef(Date.now());
    const avisoVisibleRef = useRef(false);
    const cerrandoRef = useRef(false);
    const [avisoVisible, setAvisoVisible] = useState(false);
    const [segundosRestantes, setSegundosRestantes] = useState(AVISO_MS / 1000);

    const cerrarSesion = useCallback(
        async (motivo) => {
            if (cerrandoRef.current) return;
            cerrandoRef.current = true;
            avisoVisibleRef.current = false;
            setAvisoVisible(false);
            try {
                await logout();
            } finally {
                router.replace(motivo ? `/login?motivo=${motivo}` : "/login");
            }
        },
        [logout, router]
    );

    const continuar = () => {
        ultimaActividad.current = Date.now();
        avisoVisibleRef.current = false;
        setAvisoVisible(false);
        setSegundosRestantes(AVISO_MS / 1000);
    };

    // Registrar actividad (se ignora mientras el aviso está abierto: el
    // usuario debe responder explícitamente).
    useEffect(() => {
        const registrar = () => {
            if (!avisoVisibleRef.current) ultimaActividad.current = Date.now();
        };
        EVENTOS_ACTIVIDAD.forEach((ev) => window.addEventListener(ev, registrar, { passive: true }));
        return () => EVENTOS_ACTIVIDAD.forEach((ev) => window.removeEventListener(ev, registrar));
    }, []);

    // Revisión periódica del tiempo inactivo.
    useEffect(() => {
        const revisar = () => {
            if (cerrandoRef.current) return;
            const inactivo = Date.now() - ultimaActividad.current;

            if (inactivo >= INACTIVIDAD_MS + AVISO_MS) {
                cerrarSesion("inactividad");
                return;
            }
            if (inactivo >= INACTIVIDAD_MS) {
                if (!avisoVisibleRef.current) {
                    avisoVisibleRef.current = true;
                    setAvisoVisible(true);
                }
                setSegundosRestantes(Math.max(0, Math.ceil((INACTIVIDAD_MS + AVISO_MS - inactivo) / 1000)));
            }
        };

        const intervalo = setInterval(revisar, 1000);
        // Al volver a la pestaña se revisa de inmediato.
        document.addEventListener("visibilitychange", revisar);
        return () => {
            clearInterval(intervalo);
            document.removeEventListener("visibilitychange", revisar);
        };
    }, [cerrarSesion]);

    if (!avisoVisible) return null;

    const progreso = (segundosRestantes / (AVISO_MS / 1000)) * 100;

    return (
        <div className="tema-nocturno fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 p-4">
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="inactividad-titulo"
                aria-describedby="inactividad-texto"
                className="w-full max-w-md rounded-2xl bg-slate-800/35 backdrop-blur-xl ring-1 ring-white/15 p-8 text-center shadow-2xl"
            >
                <FaClock className="mx-auto text-5xl text-amber-500" />
                <h2 id="inactividad-titulo" className="mt-4 text-xl font-bold text-slate-100">
                    ¿Sigues ahí?
                </h2>
                <p id="inactividad-texto" className="mt-3 text-slate-300">
                    Detectamos inactividad. Por seguridad, tu sesión se cerrará en{" "}
                    <span className="font-bold text-red-400">{segundosRestantes}</span> segundos.
                </p>

                <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-white/15">
                    <div className="h-full bg-amber-500 transition-all duration-1000 ease-linear" style={{ width: `${progreso}%` }} />
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
                    <button
                        onClick={() => cerrarSesion()}
                        className="rounded-xl bg-white/10 px-6 py-3 font-semibold text-slate-100 transition hover:bg-white/20"
                    >
                        Cerrar sesión
                    </button>
                    <button
                        autoFocus
                        onClick={continuar}
                        className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-blue-700"
                    >
                        Continuar en la sesión
                    </button>
                </div>
            </div>
        </div>
    );
}
