"use client";

import { useCallback, useEffect, useState } from "react";
import { FaPlus, FaInfoCircle } from "react-icons/fa";

import EncabezadoPagina from "../../../../components/ui/EncabezadoPagina";
import Cargando from "../../../../components/ui/Cargando";
import RequireRole from "../../../../components/auth/RequireRole";
import EstadoCajaChicaBadge from "../../../../components/cajaChica/EstadoCajaChicaBadge";
import NuevaSolicitudCCModal from "../../../../components/cajaChica/NuevaSolicitudCCModal";
import DetalleSolicitudCCModal from "../../../../components/cajaChica/DetalleSolicitudCCModal";
import TokenCajaChica from "../../../../components/cajaChica/TokenCajaChica";
import LiquidarCCModal from "../../../../components/cajaChica/LiquidarCCModal";
import { alertaError, toastExito, confirmar } from "../../../../components/ui/alertas";

import { obtenerContextoCajaChica, obtenerMisSolicitudesCC, anularSolicitudCC, regenerarTokenCC } from "../../../../services/cajaChica.service";
import { ESTADOS_ANULABLES_CC, ESTADOS_PARA_LIQUIDAR_CC } from "../../../../utils/cajaChica";
import { ROLES } from "../../../../utils/roles";
import { formatoMonto, formatoFechaHora, mensajeError } from "../../../../utils/formato";

function MisSolicitudes() {
    const [lista, setLista] = useState(null);
    const [contexto, setContexto] = useState(null);
    const [nueva, setNueva] = useState(false);
    const [detalle, setDetalle] = useState(null);
    const [regenerando, setRegenerando] = useState(false);
    const [aLiquidar, setALiquidar] = useState(null);

    const cargar = useCallback(async () => {
        try {
            const [ctx, mias] = await Promise.all([obtenerContextoCajaChica(), obtenerMisSolicitudesCC()]);
            setContexto(ctx.data.data);
            setLista(mias.data.data);
        } catch (e) {
            setLista([]);
            alertaError(mensajeError(e));
        }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    // Solicitud aprobada que aún no se cobra: se muestra su token arriba.
    const aprobada = (lista || []).find((s) => s.estado === "APROBADA" && s.token);

    const regenerar = async () => {
        setRegenerando(true);
        try {
            const { data } = await regenerarTokenCC(aprobada.id);
            toastExito(data.message);
            cargar();
        } catch (e) {
            alertaError(mensajeError(e));
        } finally {
            setRegenerando(false);
        }
    };

    const anular = async (s) => {
        const ok = await confirmar({
            titulo: `Anular ${s.numero}`,
            texto: `Se anulará la solicitud de ${formatoMonto(s.monto)}. Después podrás pedir otra.`,
            confirmar: "Anular",
            peligro: true
        });
        if (!ok) return;
        try {
            const { data } = await anularSolicitudCC(s.id);
            toastExito(data.message);
            cargar();
        } catch (e) {
            alertaError(mensajeError(e));
        }
    };

    return (
        <>
            <EncabezadoPagina titulo="Mis solicitudes de caja chica" descripcion={`Pide efectivo (máximo ${formatoMonto(contexto?.tope ?? 50)}). Tu jefe la aprueba y la cobras en caja con un token.`}>
                <button
                    onClick={() => setNueva(true)}
                    disabled={!contexto?.puedeCrear}
                    title={contexto?.motivo || undefined}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-900/50 transition hover:from-blue-400 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <FaPlus /> Nueva solicitud
                </button>
            </EncabezadoPagina>

            {aprobada && (
                <div className="mb-6">
                    <TokenCajaChica solicitud={aprobada} onRegenerar={regenerar} regenerando={regenerando} />
                </div>
            )}

            {contexto?.motivo && !aprobada && (
                <div className="mb-6 flex items-start gap-3 rounded-2xl bg-amber-500/10 p-4 text-amber-200 ring-1 ring-amber-400/30">
                    <FaInfoCircle className="mt-0.5 flex-none" />
                    <p>{contexto.motivo}</p>
                </div>
            )}

            <div className="overflow-hidden rounded-2xl bg-slate-800/35 shadow-lg ring-1 ring-white/15 backdrop-blur-xl">
                {lista === null ? (
                    <Cargando />
                ) : lista.length === 0 ? (
                    <p className="p-10 text-center text-slate-400">Aún no has pedido caja chica.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-white/5 text-left text-slate-300">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">N°</th>
                                    <th className="px-6 py-4 font-semibold">Fecha</th>
                                    <th className="px-6 py-4 font-semibold">Concepto</th>
                                    <th className="px-6 py-4 text-right font-semibold">Monto</th>
                                    <th className="px-6 py-4 font-semibold">Estado</th>
                                    <th className="px-6 py-4"><span className="sr-only">Acciones</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {lista.map((s) => (
                                    <tr key={s.id} className="hover:bg-white/5">
                                        <td className="whitespace-nowrap px-6 py-4 font-medium text-white">{s.numero}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-slate-300">{formatoFechaHora(s.fechaCreacion)}</td>
                                        <td className="max-w-xs truncate px-6 py-4 text-slate-300" title={s.concepto}>{s.concepto}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right font-semibold text-slate-100">{formatoMonto(s.monto)}</td>
                                        <td className="px-6 py-4">
                                            <EstadoCajaChicaBadge estado={s.estado} />
                                            {ESTADOS_PARA_LIQUIDAR_CC.includes(s.estado) && s.liquidarAntes && s.liquidarAntes < new Date().toISOString() && (
                                                <span className="ml-2 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-300">Atrasada</span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right">
                                            <button onClick={() => setDetalle(s)} className="rounded-lg px-3 py-1.5 font-medium text-blue-300 hover:bg-blue-500/10">Ver</button>
                                            {ESTADOS_PARA_LIQUIDAR_CC.includes(s.estado) && (
                                                <button onClick={() => setALiquidar(s)} className="rounded-lg px-3 py-1.5 font-semibold text-emerald-300 hover:bg-emerald-500/15">Liquidar</button>
                                            )}
                                            {ESTADOS_ANULABLES_CC.includes(s.estado) && (
                                                <button onClick={() => anular(s)} className="rounded-lg px-3 py-1.5 font-medium text-red-400 hover:bg-red-500/15">Anular</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <NuevaSolicitudCCModal
                abierto={nueva}
                contexto={contexto}
                onCerrar={() => setNueva(false)}
                onCreada={() => {
                    setNueva(false);
                    cargar();
                }}
            />
            <DetalleSolicitudCCModal solicitud={detalle} onCerrar={() => setDetalle(null)} />
            <LiquidarCCModal
                solicitud={aLiquidar}
                onCerrar={() => setALiquidar(null)}
                onEnviada={() => {
                    setALiquidar(null);
                    cargar();
                }}
            />
        </>
    );
}

export default function SolicitudesCajaChicaPage() {
    return (
        <RequireRole roles={[ROLES.SOLICITANTE_CC, ROLES.EMPLEADO, ROLES.AUTORIZADOR, ROLES.CONTABILIDAD, ROLES.ADMIN]}>
            <MisSolicitudes />
        </RequireRole>
    );
}
