"use client";

import { useEffect, useState } from "react";
import { FaKey, FaSyncAlt } from "react-icons/fa";
import { formatoMonto, formatoFechaHora } from "../../utils/formato";

// Tiempo restante legible: "47 h 12 min", "35 min".
const restante = (iso) => {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return null;
    const min = Math.floor(ms / 60000);
    const h = Math.floor(min / 60);
    return h > 0 ? `${h} h ${min % 60} min` : `${min} min`;
};

// Tarjeta con el token que el solicitante presenta en caja. Si venció,
// ofrece generar uno nuevo (no requiere volver a aprobar).
export default function TokenCajaChica({ solicitud, onRegenerar, regenerando }) {
    const [, setTick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setTick((n) => n + 1), 30000);
        return () => clearInterval(t);
    }, []);

    const quedan = restante(solicitud.tokenExpira);
    const tk = solicitud.token || "";

    return (
        <div className={`rounded-2xl p-5 ring-1 ${quedan ? "bg-emerald-500/10 ring-emerald-400/30" : "bg-orange-500/10 ring-orange-400/30"}`}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <span className={`flex h-12 w-12 flex-none items-center justify-center rounded-xl text-xl ${quedan ? "bg-emerald-500/20 text-emerald-300" : "bg-orange-500/20 text-orange-300"}`}>
                        <FaKey />
                    </span>
                    <div>
                        <p className="text-sm text-slate-300">
                            {solicitud.numero} · {formatoMonto(solicitud.monto)} · {quedan ? "Presenta este token en caja" : "Tu token venció"}
                        </p>
                        <p className={`font-mono text-4xl font-bold tracking-[0.25em] ${quedan ? "text-white" : "text-slate-500 line-through"}`}>
                            {tk.slice(0, 3)} {tk.slice(3)}
                        </p>
                        <p className="text-xs text-slate-400">
                            {quedan ? `Vence en ${quedan} (${formatoFechaHora(solicitud.tokenExpira)})` : `Venció el ${formatoFechaHora(solicitud.tokenExpira)}`}
                        </p>
                    </div>
                </div>
                {!quedan && (
                    <button onClick={onRegenerar} disabled={regenerando} className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 font-semibold text-white transition hover:bg-orange-500 disabled:opacity-60">
                        <FaSyncAlt className={regenerando ? "animate-spin" : ""} /> {regenerando ? "Generando..." : "Generar token nuevo"}
                    </button>
                )}
            </div>
        </div>
    );
}
