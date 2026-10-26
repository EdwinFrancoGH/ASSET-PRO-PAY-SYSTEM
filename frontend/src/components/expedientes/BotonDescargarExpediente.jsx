"use client";

import { useState } from "react";
import { FaFileArchive, FaSpinner } from "react-icons/fa";
import { descargarExpedienteZip } from "../../services/expedientes.service";
import { descargarBlob } from "../../utils/descargas";
import { alertaError } from "../ui/alertas";

// Descarga el expediente completo en ZIP: solicitud (PDF), documentos de
// soporte, comprobante de pago y facturas. Solo para peticiones Pagadas.
export default function BotonDescargarExpediente({ peticionId, numero, className = "" }) {
    const [descargando, setDescargando] = useState(false);

    const descargar = async () => {
        setDescargando(true);
        try {
            descargarBlob(await descargarExpedienteZip(peticionId), `Expediente_${numero || peticionId}.zip`);
        } catch (e) {
            // La respuesta de error llega como Blob: se lee el mensaje del backend.
            let mensaje = "No se pudo descargar el expediente.";
            try {
                mensaje = JSON.parse(await e.response?.data?.text())?.message || mensaje;
            } catch {
                // Sin mensaje del backend: se deja el genérico.
            }
            alertaError(mensaje);
        } finally {
            setDescargando(false);
        }
    };

    return (
        <button
            type="button"
            onClick={descargar}
            disabled={descargando}
            className={`inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-blue-700 disabled:opacity-60 ${className}`}
        >
            {descargando ? <FaSpinner className="animate-spin" /> : <FaFileArchive />}
            {descargando ? "Preparando ZIP..." : "Descargar expediente (ZIP)"}
        </button>
    );
}
