"use client";

import { useState } from "react";
import { FaPiggyBank, FaEdit, FaRedo } from "react-icons/fa";
import Modal from "../ui/Modal";
import Campo from "../ui/Campo";
import { claseInput, botonPrimario, botonSecundario } from "../ui/estilos";
import { alertaError, toastExito, confirmar } from "../ui/alertas";
import { cambiarFondoCC, reponerFondoCC } from "../../services/cajaChica.service";
import { formatoMonto, mensajeError } from "../../utils/formato";

// Fondo de caja chica: asignado vs. usado vs. disponible. El Administrador
// puede cambiar el monto del fondo o registrar la reposición.
export default function FondoCajaCC({ fondo, esAdmin, onCambio }) {
    const [editando, setEditando] = useState(false);
    const [monto, setMonto] = useState("");
    const [motivo, setMotivo] = useState("");
    const [guardando, setGuardando] = useState(false);

    const asignado = fondo?.montoFondo || 0;
    const usado = Math.max(fondo?.usado || 0, 0);
    const disponible = fondo?.disponible ?? 0;
    const pct = asignado > 0 ? Math.min(100, Math.round((usado / asignado) * 100)) : 0;
    const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500";

    const abrir = () => {
        setMonto(asignado || "");
        setMotivo("");
        setEditando(true);
    };

    const guardar = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            const { data } = await cambiarFondoCC(Number(monto), motivo);
            toastExito(data.message);
            setEditando(false);
            onCambio();
        } catch (err) {
            alertaError(mensajeError(err));
        } finally {
            setGuardando(false);
        }
    };

    const reponer = async () => {
        const ok = await confirmar({
            titulo: "Reponer fondo de caja chica",
            texto: `Registra que Contabilidad repuso ${formatoMonto(usado)} a la caja. El disponible volverá a ${formatoMonto(asignado)}.`,
            confirmar: "Registrar reposición"
        });
        if (!ok) return;
        try {
            const { data } = await reponerFondoCC();
            toastExito(data.message);
            onCambio();
        } catch (err) {
            alertaError(mensajeError(err));
        }
    };

    return (
        <div className="mb-6 rounded-2xl bg-slate-800/35 p-6 shadow-lg ring-1 ring-white/15 backdrop-blur-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 flex-none items-center justify-center rounded-xl bg-emerald-500/15 text-xl text-emerald-300"><FaPiggyBank /></span>
                    <div>
                        <p className="text-sm text-slate-300">Fondo disponible en caja</p>
                        <p className="text-3xl font-bold text-white">
                            {formatoMonto(disponible)} <span className="text-base font-medium text-slate-400">de {formatoMonto(asignado)}</span>
                        </p>
                    </div>
                </div>
                {esAdmin && (
                    <div className="flex flex-wrap gap-2">
                        <button onClick={abrir} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-blue-300 ring-1 ring-blue-400/40 hover:bg-blue-500/10"><FaEdit /> {asignado ? "Cambiar fondo" : "Asignar fondo"}</button>
                        {asignado > 0 && usado > 0 && (
                            <button onClick={reponer} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 font-semibold text-emerald-300 ring-1 ring-emerald-400/40 hover:bg-emerald-500/10"><FaRedo /> Reponer fondo</button>
                        )}
                    </div>
                )}
            </div>

            {asignado > 0 ? (
                <div className="mt-5">
                    <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
                        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm text-slate-300">
                        <span>Usado (salida neta del ciclo): <b className="text-white">{formatoMonto(usado)}</b> · {pct}%</span>
                        <span>Disponible: <b className="text-white">{formatoMonto(disponible)}</b></span>
                    </div>
                </div>
            ) : (
                <p className="mt-4 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-200 ring-1 ring-amber-400/30">
                    La caja chica aún no tiene fondo asignado. {esAdmin ? "Asígnalo para habilitar las entregas." : "El Administrador debe asignarlo para poder entregar efectivo."}
                </p>
            )}

            <Modal abierto={editando} titulo="Fondo de caja chica" onCerrar={() => !guardando && setEditando(false)}>
                <form onSubmit={guardar} className="space-y-5">
                    <Campo etiqueta="Monto del fondo (USD)" htmlFor="montoFondo" requerido ayuda={`Usado actualmente: ${formatoMonto(usado)}. El disponible será el nuevo fondo menos lo usado.`}>
                        <input id="montoFondo" type="number" required min="1" step="0.01" autoFocus value={monto} onChange={(e) => setMonto(e.target.value)} className={claseInput} />
                    </Campo>
                    <Campo etiqueta="Motivo (opcional)" htmlFor="motivoFondo">
                        <input id="motivoFondo" maxLength={200} value={motivo} onChange={(e) => setMotivo(e.target.value)} className={claseInput} placeholder="Ej. Aumento aprobado por Gerencia" />
                    </Campo>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setEditando(false)} disabled={guardando} className={botonSecundario}>Cancelar</button>
                        <button type="submit" disabled={guardando} className={botonPrimario}>{guardando ? "Guardando..." : "Guardar"}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
