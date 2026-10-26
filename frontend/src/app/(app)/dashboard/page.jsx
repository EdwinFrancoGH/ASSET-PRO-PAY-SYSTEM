"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FiClock, FiXCircle, FiEdit3, FiCheckCircle } from "react-icons/fi";

import EncabezadoPagina from "../../../components/ui/EncabezadoPagina";
import Cargando from "../../../components/ui/Cargando";
import TablaPeticiones from "../../../components/peticiones/TablaPeticiones";
import ResumenGastos from "../../../components/dashboard/ResumenGastos";
import { alertaError } from "../../../components/ui/alertas";

import { useAuth } from "../../../context/AuthContext";
import { obtenerPeticiones, obtenerPendientes } from "../../../services/peticiones.service";
import { BIENVENIDA_ROLES } from "../../../utils/roles";
import { mensajeError } from "../../../utils/formato";

// Colores pensados para el fondo nocturno (estilo del login).
const GRUPOS = [
    { titulo: "En proceso", estados: ["ENVIADA", "EN_REVISION", "APROBADA_AUTORIZADOR", "APROBADA_CONTABILIDAD"], filtro: "ENVIADA,EN_REVISION,APROBADA_AUTORIZADOR,APROBADA_CONTABILIDAD", color: "text-blue-400", icono: FiClock, fondoIcono: "bg-blue-500/15 text-blue-300" },
    { titulo: "Rechazadas", estados: ["RECHAZADA_AUTORIZADOR", "RECHAZADA_CONTABILIDAD"], color: "text-red-400", icono: FiXCircle, fondoIcono: "bg-red-500/15 text-red-300" },
    { titulo: "Borradores", estados: ["BORRADOR"], color: "text-slate-200", icono: FiEdit3, fondoIcono: "bg-slate-400/15 text-slate-300" },
    { titulo: "Pagadas", estados: ["PAGADA"], color: "text-emerald-400", icono: FiCheckCircle, fondoIcono: "bg-emerald-500/15 text-emerald-300" }
];

// Tarjeta "vidrio" igual a la del login.
const tarjeta = "rounded-3xl border border-white/15 bg-slate-800/35 backdrop-blur-xl shadow-2xl shadow-black/40";

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
            <EncabezadoPagina oscuro titulo={`Hola, ${primerNombre}`} descripcion={BIENVENIDA_ROLES[userData.role]}>
                {/* Antes: botón "Nueva petición" (sigue disponible en el menú lateral). */}
                <ResumenGastos peticiones={todas} cargando={pendientes === null} />
            </EncabezadoPagina>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {GRUPOS.map((g) => {
                    const total = todas.filter((p) => g.estados.includes(p.estado)).length;
                    const Icono = g.icono;
                    return (
                        <Link
                            key={g.titulo}
                            href={`/peticiones?estado=${g.filtro || g.estados.join(",")}`}
                            className={`${tarjeta} flex items-center justify-between gap-3 p-4 sm:p-6 transition hover:border-blue-400/60 hover:bg-slate-800/50`}
                        >
                            <div>
                                <p className="text-sm text-slate-300">{g.titulo}</p>
                                <p className={`mt-1 text-3xl font-bold ${g.color}`}>{pendientes === null ? "…" : total}</p>
                            </div>
                            <span className={`hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${g.fondoIcono}`}>
                                <Icono />
                            </span>
                        </Link>
                    );
                })}
            </div>

            <section className={`${tarjeta} overflow-hidden`}>
                <h2 className="px-5 pt-5 pb-4 text-xl font-semibold text-white border-b border-white/10 sm:px-8 sm:pt-6">Pendientes de tu acción</h2>
                {pendientes === null ? (
                    <Cargando oscuro />
                ) : (
                    <TablaPeticiones
                        oscuro
                        peticiones={pendientes}
                        vacio="No tienes nada pendiente."
                        columnaExtra={{ titulo: "Qué falta", valor: (p) => p.accionPendiente }}
                    />
                )}
            </section>
        </>
    );
}
