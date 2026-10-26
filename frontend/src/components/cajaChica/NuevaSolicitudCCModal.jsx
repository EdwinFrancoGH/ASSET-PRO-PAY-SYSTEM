"use client";

import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import Campo from "../ui/Campo";
import { claseInput, botonPrimario, botonSecundario } from "../ui/estilos";
import { alertaError, toastExito } from "../ui/alertas";
import { crearSolicitudCC } from "../../services/cajaChica.service";
import { mensajeError } from "../../utils/formato";

// Formulario de nueva solicitud: monto (máx. tope) y concepto. El área y el
// jefe vienen del contexto (no se eligen).
export default function NuevaSolicitudCCModal({ abierto, contexto, onCerrar, onCreada }) {
    const [monto, setMonto] = useState("");
    const [concepto, setConcepto] = useState("");
    const [guardando, setGuardando] = useState(false);
    const tope = contexto?.tope || 50;

    useEffect(() => {
        if (abierto) {
            setMonto("");
            setConcepto("");
        }
    }, [abierto]);

    const excede = Number(monto) > tope;

    const guardar = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            const { data } = await crearSolicitudCC({ monto: Number(monto), concepto });
            toastExito(data.message);
            onCreada(data.data);
        } catch (err) {
            alertaError(mensajeError(err));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal abierto={abierto} titulo="Nueva solicitud de caja chica" onCerrar={() => !guardando && onCerrar()}>
            <form onSubmit={guardar} className="space-y-5">
                <div className="grid grid-cols-1 gap-3 rounded-xl bg-white/5 p-4 text-sm sm:grid-cols-2">
                    <div>
                        <p className="text-slate-400">Área</p>
                        <p className="font-semibold text-slate-100">{contexto?.areaNombre || "—"}</p>
                    </div>
                    <div>
                        <p className="text-slate-400">{contexto?.porFinanzas ? "La aprueba Finanzas (cualquiera de)" : "La aprueba"}</p>
                        <p className="font-semibold text-slate-100">{contexto?.jefeNombre || "—"}</p>
                    </div>
                </div>

                <Campo etiqueta="Monto (USD)" htmlFor="montoCC" requerido error={excede ? `El máximo de caja chica es $${tope.toFixed(2)}.` : null} ayuda={`Máximo $${tope.toFixed(2)} por solicitud.`}>
                    <input id="montoCC" type="number" required min="0.01" max={tope} step="0.01" autoFocus value={monto} onChange={(e) => setMonto(e.target.value)} className={claseInput} placeholder="0.00" />
                </Campo>

                <Campo etiqueta="Concepto" htmlFor="conceptoCC" requerido ayuda={`${concepto.length}/300 — ¿en qué se usará el efectivo?`}>
                    <textarea id="conceptoCC" required minLength={3} maxLength={300} rows={3} value={concepto} onChange={(e) => setConcepto(e.target.value)} className={claseInput} placeholder="Ej. Compra de materiales de limpieza para bodega" />
                </Campo>

                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={onCerrar} disabled={guardando} className={botonSecundario}>Cancelar</button>
                    <button type="submit" disabled={guardando || excede} className={botonPrimario}>{guardando ? "Enviando..." : "Enviar al jefe"}</button>
                </div>
            </form>
        </Modal>
    );
}
