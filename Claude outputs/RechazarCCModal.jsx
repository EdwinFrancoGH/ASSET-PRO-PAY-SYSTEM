"use client";

import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import Campo from "../ui/Campo";
import { claseInput, botonSecundario, botonPeligro } from "../ui/estilos";
import { formatoMonto } from "../../utils/formato";

// Pide el motivo del rechazo (obligatorio). onConfirmar(motivo) debe
// devolver una promesa.
export default function RechazarCCModal({ solicitud, onCerrar, onConfirmar }) {
    const [motivo, setMotivo] = useState("");
    const [enviando, setEnviando] = useState(false);

    useEffect(() => setMotivo(""), [solicitud]);

    const enviar = async (e) => {
        e.preventDefault();
        setEnviando(true);
        try {
            await onConfirmar(motivo);
        } finally {
            setEnviando(false);
        }
    };

    return (
        <Modal abierto={Boolean(solicitud)} titulo={`Rechazar ${solicitud?.numero || ""}`} onCerrar={() => !enviando && onCerrar()}>
            {solicitud && (
                <form onSubmit={enviar} className="space-y-5">
                    <p className="text-slate-300">
                        {solicitud.solicitanteNombre} pide <b className="text-white">{formatoMonto(solicitud.monto)}</b>: {solicitud.concepto}
                    </p>
                    <Campo etiqueta="Motivo del rechazo" htmlFor="motivoRechazoCC" requerido ayuda="El solicitante lo verá en su solicitud y en la notificación.">
                        <textarea id="motivoRechazoCC" required minLength={3} maxLength={300} rows={3} autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value)} className={claseInput} />
                    </Campo>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onCerrar} disabled={enviando} className={botonSecundario}>Cancelar</button>
                        <button type="submit" disabled={enviando} className={botonPeligro}>{enviando ? "Rechazando..." : "Rechazar"}</button>
                    </div>
                </form>
            )}
        </Modal>
    );
}
