"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import EncabezadoPagina from "../../../components/ui/EncabezadoPagina";
import Cargando from "../../../components/ui/Cargando";
import { refrescarNotificaciones } from "../../../components/layout/NotificacionesBell";
import { obtenerNotificaciones, marcarLeida, marcarTodasLeidas } from "../../../services/notificaciones.service";
import { formatoFechaHora } from "../../../utils/formato";

export default function NotificacionesPage() {
    const router = useRouter();
    const [datos, setDatos] = useState(null);

    const cargar = () => obtenerNotificaciones(200).then(({ data }) => setDatos(data.data)).catch(() => setDatos({ noLeidas: 0, notificaciones: [] }));

    useEffect(() => { cargar(); }, []);

    const abrir = async (n) => {
        if (!n.leida) await marcarLeida(n.id).catch(() => {});
        refrescarNotificaciones();
        if (n.enlace) router.push(n.enlace);
        else if (n.peticionId) router.push(`/peticiones/${n.peticionId}`);
        else cargar();
    };

    const leerTodas = async () => {
        await marcarTodasLeidas().catch(() => {});
        refrescarNotificaciones();
        cargar();
    };

    return (
        <>
            <EncabezadoPagina titulo="Notificaciones" descripcion="Avisos de cada cambio en tus peticiones y en las que te asignan.">
                {datos?.noLeidas > 0 && (
                    <button onClick={leerTodas} className="rounded-xl bg-white/10 px-6 py-3 font-semibold text-white hover:bg-white/20">
                        Marcar todas como leídas
                    </button>
                )}
            </EncabezadoPagina>

            <div className="bg-slate-800/35 backdrop-blur-xl ring-1 ring-white/15 rounded-2xl shadow-lg overflow-hidden">
                {datos === null ? (
                    <Cargando />
                ) : datos.notificaciones.length === 0 ? (
                    <p className="p-10 text-center text-slate-400">No tienes notificaciones.</p>
                ) : (
                    <ul className="divide-y">
                        {datos.notificaciones.map((n) => (
                            <li key={n.id}>
                                <button onClick={() => abrir(n)} className={`flex w-full gap-4 px-8 py-5 text-left hover:bg-white/5 ${n.leida ? "" : "bg-blue-500/10"}`}>
                                    <span className={`mt-2 h-2.5 w-2.5 flex-none rounded-full ${n.leida ? "bg-white/15" : "bg-blue-600"}`} />
                                    <span className="min-w-0 flex-1">
                                        <span className="flex flex-wrap items-baseline justify-between gap-2">
                                            <span className="font-semibold text-slate-100">{n.titulo}</span>
                                            <span className="text-xs text-slate-400">{formatoFechaHora(n.fecha)}</span>
                                        </span>
                                        <span className="mt-1 block text-slate-300">{n.mensaje}</span>
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
}
