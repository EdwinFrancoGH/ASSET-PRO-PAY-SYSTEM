import { ACCIONES_HISTORIAL } from "../../utils/estados";
import { formatoFechaHora } from "../../utils/formato";

const colorPunto = (accion) =>
    accion.startsWith("RECHAZADA") ? "bg-red-500" : accion.startsWith("APROBADA") || accion === "PAGADA" ? "bg-emerald-500" : "bg-slate-400";

export default function HistorialTimeline({ historial = [] }) {
    const eventos = [...historial].reverse();

    return (
        <ol className="relative border-l-2 border-slate-200 ml-2 space-y-6">
            {eventos.map((h, i) => (
                <li key={`${h.fecha}-${i}`} className="ml-6">
                    <span className={`absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full ring-4 ring-white ${colorPunto(h.accion)}`} />
                    <p className="font-semibold text-slate-800">{ACCIONES_HISTORIAL[h.accion] || h.accion}</p>
                    <p className="text-sm text-slate-600">{h.usuarioNombre} <span className="text-slate-400">({h.usuarioRol})</span></p>
                    <p className="text-xs text-slate-400">{formatoFechaHora(h.fecha)}</p>
                    {h.comentario && <p className="mt-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">{h.comentario}</p>}
                </li>
            ))}
        </ol>
    );
}
