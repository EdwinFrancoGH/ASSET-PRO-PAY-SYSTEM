"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FaPlus } from "react-icons/fa";

import EncabezadoPagina from "../../../components/ui/EncabezadoPagina";
import Cargando from "../../../components/ui/Cargando";
import TablaPeticiones from "../../../components/peticiones/TablaPeticiones";
import { alertaError } from "../../../components/ui/alertas";

import { useAuth } from "../../../context/AuthContext";
import { obtenerPeticiones, obtenerPendientes } from "../../../services/peticiones.service";
import { BIENVENIDA_ROLES } from "../../../utils/roles";
import { mensajeError } from "../../../utils/formato";

const GRUPOS = [
    { titulo: "En proceso", estados: ["ENVIADA", "EN_REVISION", "APROBADA_AUTORIZADOR", "APROBADA_CONTABILIDAD"], filtro: "ENVIADA,EN_REVISION,APROBADA_AUTORIZADOR,APROBADA_CONTABILIDAD", color: "text-blue-700" },
    { titulo: "Rechazadas", estados: ["RECHAZADA_AUTORIZADOR", "RECHAZADA_CONTABILIDAD"], color: "text-red-700" },
    { titulo: "Borradores", estados: ["BORRADOR"], color: "text-slate-700" },
    { titulo: "Pagadas", estados: ["PAGADA"], color: "text-emerald-700" }
];

export default function DashboardPage() {
    const { userData } = useAuth();
    const [pendientes, setPendientes] = useState(null);
    const [todas, setTodas] = useState([]);

    useEffect(() => {
        Promise.all([obtenerPendientes(), obtenerPeticiones()])
            .then(([p, t]) => {
                setPendientes(p.data.data);
                setTodas(t.data.data);
            })
            .catch((e) => {
                setPendientes([]);
                alertaError(mensajeError(e, "No se pudo cargar el resumen."));
            });
    }, []);

    const primerNombre = (userData.name || "").split(" ")[0];

    return (
        <>
            <EncabezadoPagina titulo={`Hola, ${primerNombre}`} descripcion={BIENVENIDA_ROLES[userData.role]}>
                <Link href="/peticiones/nueva" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-blue-700">
                    <FaPlus /> Nueva petición
                </Link>
            </EncabezadoPagina>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {GRUPOS.map((g) => {
                    const total = todas.filter((p) => g.estados.includes(p.estado)).length;
                    return (
                        <Link
                            key={g.titulo}
                            href={`/peticiones?estado=${g.filtro || g.estados.join(",")}`}
                            className="rounded-2xl bg-white p-6 shadow-lg hover:ring-2 hover:ring-blue-200 transition"
                        >
                            <p className="text-sm text-slate-500">{g.titulo}</p>
                            <p className={`mt-1 text-3xl font-bold ${g.color}`}>{pendientes === null ? "…" : total}</p>
                        </Link>
                    );
                })}
            </div>

            <section className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <h2 className="px-8 pt-6 pb-4 text-xl font-semibold text-slate-700 border-b">Pendientes de tu acción</h2>
                {pendientes === null ? (
                    <Cargando />
                ) : (
                    <TablaPeticiones
                        peticiones={pendientes}
                        vacio="No tienes nada pendiente."
                        columnaExtra={{ titulo: "Qué falta", valor: (p) => p.accionPendiente }}
                    />
                )}
            </section>
        </>
    );
}
