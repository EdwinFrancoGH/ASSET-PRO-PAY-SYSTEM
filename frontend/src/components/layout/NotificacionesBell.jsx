"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaBell } from "react-icons/fa";
import { obtenerNotificaciones, marcarLeida, marcarTodasLeidas } from "../../services/notificaciones.service";
import { tiempoRelativo } from "../../utils/formato";

const INTERVALO_MS = 30_000;

// Evento global para refrescar la campana después de una acción
// (ej. aprobar): window.dispatchEvent(new Event("notificaciones:refrescar"))
export const refrescarNotificaciones = () => window.dispatchEvent(new Event("notificaciones:refrescar"));

export default function NotificacionesBell() {
    const [abierto, setAbierto] = useState(false);
    const [datos, setDatos] = useState({ noLeidas: 0, notificaciones: [] });
    const contenedor = useRef(null);
    const router = useRouter();

    const cargar = useCallback(async () => {
        try {
            const { data } = await obtenerNotificaciones(8);
            setDatos(data.data);
        } catch {
            // Silencioso: si falla, se reintenta en el siguiente ciclo.
        }
    }, []);

    useEffect(() => {
        cargar();
        const id = setInterval(cargar, INTERVALO_MS);
        window.addEventListener("focus", cargar);
        window.addEventListener("notificaciones:refrescar", cargar);
        return () => {
            clearInterval(id);
            window.removeEventListener("focus", cargar);
            window.removeEventListener("notificaciones:refrescar", cargar);
        };
    }, [cargar]);

    useEffect(() => {
        const fuera = (e) => contenedor.current && !contenedor.current.contains(e.target) && setAbierto(false);
        document.addEventListener("mousedown", fuera);
        return () => document.removeEventListener("mousedown", fuera);
    }, []);

    const abrirNotificacion = async (n) => {
        setAbierto(false);
        if (!n.leida) {
            marcarLeida(n.id).then(cargar).catch(() => {});
        }
        if (n.peticionId) router.push(`/peticiones/${n.peticionId}`);
    };

    const leerTodas = async () => {
        await marcarTodasLeidas().catch(() => {});
        cargar();
    };

    return (
        <div className="relative" ref={contenedor}>
            <button
                onClick={() => setAbierto((v) => !v)}
                className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100"
                aria-label={`Notificaciones${datos.noLeidas ? `, ${datos.noLeidas} sin leer` : ""}`}
            >
                <FaBell className="text-xl" />
                {datos.noLeidas > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                        {datos.noLeidas > 99 ? "99+" : datos.noLeidas}
                    </span>
                )}
            </button>

            {abierto && (
                <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 z-50">
                    <div className="flex items-center justify-between border-b px-4 py-3">
                        <span className="font-semibold text-slate-800">Notificaciones</span>
                        {datos.noLeidas > 0 && (
                            <button onClick={leerTodas} className="text-sm text-blue-600 hover:underline">
                                Marcar todas como leídas
                            </button>
                        )}
                    </div>

                    <ul className="max-h-96 overflow-y-auto divide-y">
                        {datos.notificaciones.length === 0 && (
                            <li className="px-4 py-8 text-center text-sm text-slate-500">No tienes notificaciones.</li>
                        )}
                        {datos.notificaciones.map((n) => (
                            <li key={n.id}>
                                <button
                                    onClick={() => abrirNotificacion(n)}
                                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 flex gap-3 ${n.leida ? "" : "bg-blue-50/60"}`}
                                >
                                    <span className={`mt-1.5 h-2 w-2 flex-none rounded-full ${n.leida ? "bg-transparent" : "bg-blue-600"}`} />
                                    <span className="min-w-0">
                                        <span className="block text-sm font-semibold text-slate-800">{n.titulo}</span>
                                        <span className="block text-sm text-slate-600 line-clamp-2">{n.mensaje}</span>
                                        <span className="block mt-1 text-xs text-slate-400">{tiempoRelativo(n.fecha)}</span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>

                    <Link href="/notificaciones" onClick={() => setAbierto(false)} className="block border-t px-4 py-3 text-center text-sm font-medium text-blue-600 hover:bg-slate-50 rounded-b-2xl">
                        Ver todas
                    </Link>
                </div>
            )}
        </div>
    );
}
