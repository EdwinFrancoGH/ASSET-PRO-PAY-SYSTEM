"use client";

import { useState } from "react";
import { FaFilePdf, FaFileImage, FaEye, FaDownload } from "react-icons/fa";
import { descargarArchivoCC } from "../../services/cajaChica.service";
import { descargarBlob, abrirBlob } from "../../utils/descargas";
import { formatoTamano, mensajeError } from "../../utils/formato";
import { alertaError } from "../ui/alertas";

// Facturas adjuntas a la liquidación (ver o descargar).
export default function ArchivosLiquidacion({ solicitudId, archivos = [] }) {
    const [ocupado, setOcupado] = useState(null);

    const obtener = async (a, accion) => {
        setOcupado(a.id);
        try {
            const r = await descargarArchivoCC(solicitudId, a.id);
            accion === "ver" ? abrirBlob(r) : descargarBlob(r, a.nombre);
        } catch (e) {
            alertaError(mensajeError(e, "No se pudo abrir el archivo."));
        } finally {
            setOcupado(null);
        }
    };

    if (!archivos.length) return <p className="text-sm text-slate-400">Sin archivos.</p>;

    return (
        <ul className="divide-y divide-white/10 rounded-lg bg-white/5">
            {archivos.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <span className="flex min-w-0 items-center gap-2 text-sm text-slate-200">
                        {a.tipo?.includes("pdf") ? <FaFilePdf className="flex-none text-red-400" /> : <FaFileImage className="flex-none text-sky-400" />}
                        <span className="truncate">{a.nombre}</span>
                        <span className="flex-none text-xs text-slate-400">{formatoTamano(a.tamano)}</span>
                    </span>
                    <span className="flex flex-none gap-1">
                        <button type="button" onClick={() => obtener(a, "ver")} disabled={ocupado === a.id} className="rounded-lg p-2 text-blue-300 hover:bg-blue-500/10" title="Ver"><FaEye /></button>
                        <button type="button" onClick={() => obtener(a, "descargar")} disabled={ocupado === a.id} className="rounded-lg p-2 text-blue-300 hover:bg-blue-500/10" title="Descargar"><FaDownload /></button>
                    </span>
                </li>
            ))}
        </ul>
    );
}
