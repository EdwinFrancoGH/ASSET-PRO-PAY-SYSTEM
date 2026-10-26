"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import EncabezadoPagina from "../../../../components/ui/EncabezadoPagina";
import Cargando from "../../../../components/ui/Cargando";
import RequireRole from "../../../../components/auth/RequireRole";
import EstadoCajaChicaBadge from "../../../../components/cajaChica/EstadoCajaChicaBadge";
import DetalleSolicitudCCModal from "../../../../components/cajaChica/DetalleSolicitudCCModal";
import RechazarCCModal from "../../../../components/cajaChica/RechazarCCModal";
import { alertaError, toastExito, confirmar } from "../../../../components/ui/alertas";

import { obtenerAprobacionesCC, aprobarSolicitudCC, rechazarSolicitudCC } from "../../../../services/cajaChica.service";
import { ROLES } from "../../../../utils/roles";
import { formatoMonto, formatoFechaHora, mensajeError } from "../../../../utils/formato";

const PESTANAS = [
    { clave: "pendientes", titulo: "Pendientes" },
    { clave: "historial", titulo: "Historial" }
];

// Bandeja del jefe: solicitudes de caja chica de sus áreas (Admin: todas).
function Aprobaciones() {
    const [lista, setLista] = useState(null);
    const [pestana, setPestana] = useState("pendientes");
    const [detalle, setDetalle] = useState(null);
    const [aRechazar, setARechazar] = useState(null);
    const [ocupado, setOcupado] = useState(null);

    const cargar = useCallback(async () => {
        try {
            const { data } = await obtenerAprobacionesCC();
            setLista(data.data);
        } catch (e) {
            setLista([]);
            alertaError(mensajeError(e));
        }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const pendientes = useMemo(() => (lista || []).filter((s) => s.estado === "PENDIENTE_APROBACION"), [lista]);
    const visibles = pestana === "pendientes" ? pendientes : (lista || []).filter((s) => s.estado !== "PENDIENTE_APROBACION");

    const aprobar = async (s) => {
        const ok = await confirmar({
            titulo: `Aprobar ${s.numero}`,
            texto: `${s.solicitanteNombre} recibirá un token de 6 dígitos para cobrar ${formatoMonto(s.monto)} en caja (vence en 48 horas).`,
            confirmar: "Aprobar"
        });
        if (!ok) return;
        setOcupado(s.id);
        try {
            const { data } = await aprobarSolicitudCC(s.id);
            toastExito(data.message);
            cargar();
        } catch (e) {
            alertaError(mensajeError(e));
        } finally {
            setOcupado(null);
        }
    };

    const rechazar = async (motivo) => {
        try {
            const { data } = await rechazarSolicitudCC(aRechazar.id, motivo);
            toastExito(data.message);
            setARechazar(null);
            cargar();
        } catch (e) {
            alertaError(mensajeError(e));
        }
    };

    return (
        <>
            <EncabezadoPagina titulo="Aprobaciones de caja chica" descripcion="Al aprobar, el solicitante recibe un token de 6 dígitos para cobrar el efectivo en caja." />

            <div className="overflow-hidden rounded-2xl bg-slate-800/35 shadow-lg ring-1 ring-white/15 backdrop-blur-xl">
                <div className="flex gap-1 border-b border-white/10 px-6 pt-4" role="tablist">
                    {PESTANAS.map((p) => (
                        <button
                            key={p.clave}
                            role="tab"
                            aria-selected={pestana === p.clave}
                            onClick={() => setPestana(p.clave)}
                            className={`-mb-px rounded-t-lg border-b-2 px-4 py-2 font-medium ${pestana === p.clave ? "border-blue-600 text-blue-300" : "border-transparent text-slate-400 hover:text-white"}`}
                        >
                            {p.titulo}
                            {p.clave === "pendientes" && pendientes.length > 0 && (
                                <span className="ml-2 rounded-full bg-blue-500/30 px-2 py-0.5 text-xs text-blue-100">{pendientes.length}</span>
                            )}
                        </button>
                    ))}
                </div>

                {lista === null ? (
                    <Cargando />
                ) : visibles.length === 0 ? (
                    <p className="p-10 text-center text-slate-400">{pestana === "pendientes" ? "No tienes solicitudes pendientes." : "Aún no hay solicitudes decididas."}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-white/5 text-left text-slate-300">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">N°</th>
                                    <th className="px-6 py-4 font-semibold">Fecha</th>
                                    <th className="px-6 py-4 font-semibold">Solicitante</th>
                                    <th className="px-6 py-4 font-semibold">Área</th>
                                    <th className="px-6 py-4 font-semibold">Concepto</th>
                                    <th className="px-6 py-4 text-right font-semibold">Monto</th>
                                    <th className="px-6 py-4 font-semibold">Estado</th>
                                    <th className="px-6 py-4"><span className="sr-only">Acciones</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {visibles.map((s) => (
                                    <tr key={s.id} className="hover:bg-white/5">
                                        <td className="whitespace-nowrap px-6 py-4 font-medium text-white">{s.numero}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-slate-300">{formatoFechaHora(s.fechaCreacion)}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-slate-200">{s.solicitanteNombre}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-slate-300">{s.areaNombre}</td>
                                        <td className="max-w-xs truncate px-6 py-4 text-slate-300" title={s.concepto}>{s.concepto}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right font-semibold text-slate-100">{formatoMonto(s.monto)}</td>
                                        <td className="px-6 py-4"><EstadoCajaChicaBadge estado={s.estado} /></td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right">
                                            <button onClick={() => setDetalle(s)} className="rounded-lg px-3 py-1.5 font-medium text-blue-300 hover:bg-blue-500/10">Ver</button>
                                            {s.estado === "PENDIENTE_APROBACION" && (
                                                <>
                                                    <button onClick={() => aprobar(s)} disabled={ocupado === s.id} className="rounded-lg px-3 py-1.5 font-medium text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-50">
                                                        {ocupado === s.id ? "Aprobando..." : "Aprobar"}
                                                    </button>
                                                    <button onClick={() => setARechazar(s)} className="rounded-lg px-3 py-1.5 font-medium text-red-400 hover:bg-red-500/15">Rechazar</button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <DetalleSolicitudCCModal solicitud={detalle} onCerrar={() => setDetalle(null)} />
            <RechazarCCModal solicitud={aRechazar} onCerrar={() => setARechazar(null)} onConfirmar={rechazar} />
        </>
    );
}

export default function AprobacionesCajaChicaPage() {
    return (
        <RequireRole roles={[ROLES.AUTORIZADOR, ROLES.ADMIN]}>
            <Aprobaciones />
        </RequireRole>
    );
}
