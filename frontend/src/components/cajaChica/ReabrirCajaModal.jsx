"use client";

import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import Campo from "../ui/Campo";
import { claseInput, botonSecundario, botonPeligro } from "../ui/estilos";
import { alertaError, toastExito } from "../ui/alertas";
import { reabrirCorteCC } from "../../services/cajaChica.service";
import { mensajeError } from "../../utils/formato";

// Admin: reabre la caja de hoy (ya cortada) para una entrega de emergencia.
// La justificación es obligatoria y queda en el historial del corte.
export default function ReabrirCajaModal({ dia, onCerrar, onReabierta }) {
    const [motivo, setMotivo] = useState("");
    const [enviando, setEnviando] = useState(false);

    useEffect(() => setMotivo(""), [dia]);

    const enviar = async (e) => {
        e.preventDefault();
        setEnviando(true);
        try {
            const { data } = await reabrirCorteCC(dia, motivo);
            toastExito(data.message);
            onReabierta();
        } catch (err) {
            alertaError(mensajeError(err));
        } finally {
            setEnviando(false);
        }
    };

    return (
        <Modal abierto={Boolean(dia)} titulo={`Reabrir la caja del ${dia || ""}`} onCerrar={() => !enviando && onCerrar()}>
            <form onSubmit={enviar} className="space-y-5">
                <p className="text-sm text-slate-300">
                    El corte actual queda guardado en el historial. Se avisará al cajero y, al terminar la entrega, deberá volver a hacer el corte de caja.
                </p>
                <Campo etiqueta="Justificación" htmlFor="motivoReabrir" requerido ayuda={`${motivo.trim().length}/10 caracteres mínimo`}>
                    <textarea id="motivoReabrir" required minLength={10} maxLength={300} rows={3} autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value)} className={claseInput} placeholder="Ej. Emergencia: compra urgente de repuesto para equipo en hospital" />
                </Campo>
                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={onCerrar} disabled={enviando} className={botonSecundario}>Cancelar</button>
                    <button type="submit" disabled={enviando || motivo.trim().length < 10} className={botonPeligro}>{enviando ? "Reabriendo..." : "Reabrir caja"}</button>
                </div>
            </form>
        </Modal>
    );
}
