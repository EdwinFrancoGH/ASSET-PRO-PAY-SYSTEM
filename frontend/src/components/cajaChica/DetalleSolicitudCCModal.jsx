"use client";

import Modal from "../ui/Modal";
import EstadoCajaChicaBadge from "./EstadoCajaChicaBadge";
import ArchivosLiquidacion from "./ArchivosLiquidacion";
import ResumenCierreCC from "./ResumenCierreCC";
import { textoCierreSolicitante } from "../../utils/cajaChica";
import { ACCIONES_CC } from "../../utils/cajaChica";
import { formatoMonto, formatoFechaHora } from "../../utils/formato";

const Dato = ({ etiqueta, children }) => (
    <div>
        <p className="text-xs text-slate-400">{etiqueta}</p>
        <p className="font-medium text-slate-100">{children}</p>
    </div>
);

const colorPunto = (accion) =>
    accion.startsWith("RECHAZADA") || accion === "ANULADA" ? "bg-red-500" : ["APROBADA", "ENTREGADA", "LIQUIDADA"].includes(accion) ? "bg-emerald-500" : "bg-slate-400";

export default function DetalleSolicitudCCModal({ solicitud, onCerrar }) {
    const s = solicitud;
    return (
        <Modal abierto={Boolean(s)} titulo={`Caja chica ${s?.numero || ""}`} onCerrar={onCerrar} ancho="max-w-2xl">
            {s && (
                <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <EstadoCajaChicaBadge estado={s.estado} />
                        <span className="text-2xl font-bold text-white">{formatoMonto(s.monto)}</span>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Dato etiqueta="Solicitante">{s.solicitanteNombre}</Dato>
                        <Dato etiqueta="Área">{s.areaNombre}</Dato>
                        <Dato etiqueta="Jefe que aprueba">{s.jefeNombre}</Dato>
                        <Dato etiqueta="Fecha">{formatoFechaHora(s.fechaCreacion)}</Dato>
                        {s.aprobadoPorNombre && <Dato etiqueta="Aprobada por">{s.aprobadoPorNombre} · {formatoFechaHora(s.fechaAprobacion)}</Dato>}
                        {s.entregadoPorNombre && <Dato etiqueta="Entregada por">{s.entregadoPorNombre} · {formatoFechaHora(s.fechaEntrega)}</Dato>}
                        {s.liquidarAntes && s.estado === "ENTREGADA" && <Dato etiqueta="Liquidar antes de">{formatoFechaHora(s.liquidarAntes)}</Dato>}
                        {s.token && <Dato etiqueta="Token para cobrar"><span className="font-mono tracking-widest">{s.token.slice(0, 3)} {s.token.slice(3)}</span> <span className="text-xs text-slate-400">(vence {formatoFechaHora(s.tokenExpira)})</span></Dato>}
                    </div>

                    {s.motivoRechazo && (
                        <div className="rounded-lg bg-red-500/10 p-3 text-red-200 ring-1 ring-red-400/30">
                            <p className="text-xs font-semibold uppercase tracking-wide">Motivo del rechazo</p>
                            <p className="mt-1">{s.motivoRechazo}</p>
                        </div>
                    )}

                    <div>
                        <p className="text-xs text-slate-400">Concepto</p>
                        <p className="mt-1 whitespace-pre-wrap rounded-lg bg-white/5 p-3 text-slate-100">{s.concepto}</p>
                    </div>

                    {s.liquidacion && (
                        <div className="space-y-3">
                            <h3 className="font-semibold text-slate-200">Liquidación · factura {s.liquidacion.numeroFactura}</h3>
                            {s.liquidacion.motivoDevolucion && s.estado === "LIQUIDACION_DEVUELTA" && (
                                <p className="rounded-lg bg-orange-500/10 p-3 text-sm text-orange-200 ring-1 ring-orange-400/30">Devuelta por caja: {s.liquidacion.motivoDevolucion}</p>
                            )}
                            <ArchivosLiquidacion solicitudId={s.id} archivos={s.liquidacion.archivos} />
                            <ResumenCierreCC entregado={s.monto} cierre={s.liquidacion} textoMovimiento={textoCierreSolicitante(s.liquidacion)} />
                            {s.liquidacion.cerradaPorNombre && <p className="text-xs text-slate-400">Cerrada por {s.liquidacion.cerradaPorNombre} · {formatoFechaHora(s.liquidacion.fechaCierre)}</p>}
                        </div>
                    )}

                    <div>
                        <h3 className="mb-3 font-semibold text-slate-200">Historial</h3>
                        <ol className="relative ml-2 space-y-5 border-l-2 border-white/10">
                            {[...(s.historial || [])].reverse().map((h, i) => (
                                <li key={`${h.fecha}-${i}`} className="ml-6">
                                    <span className={`absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full ring-4 ring-slate-900 ${colorPunto(h.accion)}`} />
                                    <p className="font-semibold text-slate-100">{ACCIONES_CC[h.accion] || h.accion}</p>
                                    <p className="text-sm text-slate-300">{h.usuarioNombre} <span className="text-slate-400">({h.usuarioRol})</span></p>
                                    <p className="text-xs text-slate-400">{formatoFechaHora(h.fecha)}</p>
                                    {h.comentario && <p className="mt-2 rounded-lg bg-white/5 p-3 text-sm text-slate-200">{h.comentario}</p>}
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            )}
        </Modal>
    );
}
