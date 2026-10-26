"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FaArrowLeft, FaPrint } from "react-icons/fa";

import SolicitudImprimible from "../../../../../components/impresion/SolicitudImprimible";
import { obtenerPeticion } from "../../../../../services/peticiones.service";
import { obtenerSolicitudExpediente } from "../../../../../services/expedientes.service";
import { useAuth } from "../../../../../context/AuthContext";
import { mensajeError } from "../../../../../utils/formato";

// /peticiones/[id]/imprimir — Solicitud de pago lista para imprimir o
// guardar como PDF (Ctrl+P → "Guardar como PDF"). Solo lectura.
export default function ImprimirSolicitudPage() {
    const { id } = useParams();
    const { userData } = useAuth();
    const [peticion, setPeticion] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        // Si no puede ver la petición (ej. Compras con un anticipo), se
        // intenta con los permisos del expediente.
        obtenerPeticion(id)
            .catch(() => obtenerSolicitudExpediente(id))
            .then(({ data }) => setPeticion(data.data))
            .catch((e) => setError(mensajeError(e, "No se pudo cargar la petición.")));
    }, [id]);

    // Nombre sugerido del PDF al guardar: "Solicitud PP-2026-00006"
    useEffect(() => {
        if (!peticion) return;
        const anterior = document.title;
        document.title = `Solicitud ${peticion.numero || ""}`.trim();
        return () => { document.title = anterior; };
    }, [peticion]);

    return (
        <div className="px-3 py-4 sm:px-6 sm:py-8 print:p-0">
            {/* Barra de acciones: no sale en la impresión */}
            <div className="mx-auto mb-4 flex max-w-[816px] flex-wrap items-center justify-between gap-3 print:hidden">
                <Link href={`/peticiones/${id}`} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow hover:bg-slate-50">
                    <FaArrowLeft /> Volver a la petición
                </Link>
                <button
                    type="button"
                    onClick={() => window.print()}
                    disabled={!peticion}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700 disabled:opacity-60"
                >
                    <FaPrint /> Imprimir / Guardar PDF
                </button>
            </div>

            {error ? (
                <p className="mx-auto max-w-[816px] rounded-xl bg-white p-8 text-center text-slate-700 shadow">{error}</p>
            ) : !peticion ? (
                <p className="mx-auto max-w-[816px] rounded-xl bg-white p-8 text-center text-slate-500 shadow">Cargando solicitud…</p>
            ) : (
                <SolicitudImprimible peticion={peticion} generadoPor={userData?.name || userData?.email} />
            )}
        </div>
    );
}
