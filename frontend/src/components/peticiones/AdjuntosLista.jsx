"use client";

import { useState } from "react";
import { FaFilePdf, FaFileImage, FaFileExcel, FaFileWord, FaFileAlt, FaDownload, FaEye, FaTrash } from "react-icons/fa";
import { descargarAdjunto } from "../../services/peticiones.service";
import { descargarBlob, abrirBlob } from "../../utils/descargas";
import { formatoTamano, formatoFechaHora, mensajeError } from "../../utils/formato";
import { alertaError, confirmar } from "../ui/alertas";

const icono = (tipo = "") => {
    if (tipo.includes("pdf")) return <FaFilePdf className="text-red-500" />;
    if (tipo.startsWith("image/")) return <FaFileImage className="text-sky-400" />;
    if (tipo.includes("sheet") || tipo.includes("excel")) return <FaFileExcel className="text-emerald-400" />;
    if (tipo.includes("word")) return <FaFileWord className="text-blue-400" />;
    return <FaFileAlt className="text-slate-400" />;
};

const sePuedeVer = (tipo = "") => tipo.includes("pdf") || tipo.startsWith("image/");

export default function AdjuntosLista({ peticionId, adjuntos, onEliminar }) {
    const [ocupado, setOcupado] = useState(null);

    const obtener = async (adjunto, accion) => {
        setOcupado(adjunto.id);
        try {
            const respuesta = await descargarAdjunto(peticionId, adjunto.id);
            accion === "ver" ? abrirBlob(respuesta) : descargarBlob(respuesta, adjunto.nombre);
        } catch (e) {
            alertaError(mensajeError(e, "No se pudo abrir el archivo."));
        } finally {
            setOcupado(null);
        }
    };

    const eliminar = async (adjunto) => {
        if (await confirmar({ titulo: "Quitar adjunto", texto: `Se eliminará "${adjunto.nombre}".`, confirmar: "Quitar", peligro: true })) {
            onEliminar(adjunto);
        }
    };

    if (!adjuntos?.length) return <p className="text-sm text-slate-400">Sin archivos.</p>;

    return (
        <ul className="divide-y rounded-xl border border-white/10">
            {adjuntos.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-2xl">{icono(a.tipo)}</span>
                    <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-slate-100">{a.nombre}</p>
                        <p className="text-xs text-slate-400">{formatoTamano(a.tamano)}, {a.subidoPorNombre}, {formatoFechaHora(a.fecha)}</p>
                    </div>
                    <div className="flex gap-1">
                        {sePuedeVer(a.tipo) && (
                            <button type="button" onClick={() => obtener(a, "ver")} disabled={ocupado === a.id} className="rounded-lg p-2 text-slate-300 hover:bg-white/10" aria-label={`Ver ${a.nombre}`} title="Ver">
                                <FaEye />
                            </button>
                        )}
                        <button type="button" onClick={() => obtener(a, "descargar")} disabled={ocupado === a.id} className="rounded-lg p-2 text-slate-300 hover:bg-white/10" aria-label={`Descargar ${a.nombre}`} title="Descargar">
                            <FaDownload />
                        </button>
                        {onEliminar && (
                            <button type="button" onClick={() => eliminar(a)} className="rounded-lg p-2 text-slate-400 hover:bg-red-500/15 hover:text-red-400" aria-label={`Quitar ${a.nombre}`} title="Quitar">
                                <FaTrash />
                            </button>
                        )}
                    </div>
                </li>
            ))}
        </ul>
    );
}
