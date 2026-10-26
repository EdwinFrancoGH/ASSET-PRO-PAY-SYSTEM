"use client";

import { useEffect, useState } from "react";
import { FaCheck, FaUndo, FaEdit, FaTrash, FaCopy } from "react-icons/fa";

import Modal from "../ui/Modal";
import Campo from "../ui/Campo";
import Dato from "../peticiones/Dato";
import { EstadoFacturaBadge, TipoFacturaBadge } from "./EtiquetaFactura";
import { claseInput, botonSecundario, botonPeligro, botonExito } from "../ui/estilos";
import { alertaError, toastExito } from "../ui/alertas";
import { confirmarEliminacion } from "./eliminarFactura";

import { recibirFacturas, devolverFactura } from "../../services/facturas.service";
import { ACCIONES_FACTURA } from "../../utils/facturas";
import { formatoMonto, formatoFecha, formatoFechaHora, mensajeError } from "../../utils/formato";

const colorPunto = (accion) => (accion === "DEVUELTA" ? "bg-red-500" : accion === "ELIMINADA" ? "bg-slate-600" : accion === "RECIBIDA" ? "bg-emerald-500" : "bg-slate-400");

// Datos, historial y acciones de una factura.
//   puedeEditar:  Compras (corregir / eliminar mientras no esté recibida)
//   puedeRevisar: Contabilidad / Admin (recibir o devolver las pendientes)
export default function DetalleFacturaModal({ factura, puedeEditar, puedeRevisar, onCerrar, onEditar, onDuplicar, onCambio }) {
    const [motivo, setMotivo] = useState(null); // null = no se está devolviendo
    const [ocupado, setOcupado] = useState(false);

    useEffect(() => setMotivo(null), [factura?.id]);

    if (!factura) return null;
    const f = factura;
    const pendiente = f.estado === "ENTREGADA";

    const ejecutar = async (accion, error) => {
        setOcupado(true);
        try {
            const { data } = await accion();
            toastExito(data.message);
            onCambio?.();
        } catch (e) {
            alertaError(mensajeError(e, error));
        } finally {
            setOcupado(false);
        }
    };

    const recibir = () => ejecutar(() => recibirFacturas([f.id]), "No se pudo recibir la factura.");

    const devolver = () => {
        if (!motivo?.trim()) return alertaError("Indica el motivo de la devolución.");
        ejecutar(() => devolverFactura(f.id, motivo.trim()), "No se pudo devolver la factura.");
    };

    const eliminar = async () => {
        setOcupado(true);
        const ok = await confirmarEliminacion(f);
        setOcupado(false);
        if (ok) onCambio?.();
    };

    return (
        <Modal abierto titulo={`Factura ${f.numeroFactura}`} onCerrar={ocupado ? undefined : onCerrar} ancho="max-w-3xl">
            <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                    <TipoFacturaBadge tipo={f.tipo} />
                    <EstadoFacturaBadge estado={f.estado} />
                </div>

                <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <Dato etiqueta="Proveedor">
                        {f.proveedorNombre}
                        {f.codigoSAP && <span className="ml-2 text-xs text-slate-400">SAP {f.codigoSAP}</span>}
                    </Dato>
                    <Dato etiqueta="N° factura">{f.numeroFactura}</Dato>
                    <Dato etiqueta="Monto OC"><span className="font-semibold">{formatoMonto(f.montoOC)}</span></Dato>
                    <Dato etiqueta="Fecha factura">{formatoFecha(f.fechaFactura)}</Dato>
                    <Dato etiqueta="Entregada por">{f.entregadoPorNombre} · {formatoFechaHora(f.fechaEntrega)}</Dato>
                    <Dato etiqueta="Recibida por">{f.recibidoPorNombre ? `${f.recibidoPorNombre} · ${formatoFechaHora(f.fechaRecepcion)}` : ""}</Dato>
                </dl>

                {f.estado === "DEVUELTA" && f.motivoDevolucion && (
                    <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-200 ring-1 ring-red-400/30">
                        <p className="font-semibold">Motivo de la devolución</p>
                        <p className="mt-1 whitespace-pre-line">{f.motivoDevolucion}</p>
                    </div>
                )}

                {f.estado === "ELIMINADA" && (
                    <div className="rounded-xl bg-white/5 p-4 text-sm text-slate-300 ring-1 ring-white/15">
                        <p className="font-semibold">Eliminada por {f.eliminadoPorNombre} · {formatoFechaHora(f.fechaEliminacion)}</p>
                        {f.motivoEliminacion && <p className="mt-1 whitespace-pre-line">{f.motivoEliminacion}</p>}
                    </div>
                )}

                {motivo !== null && (
                    <Campo etiqueta="Motivo de la devolución" htmlFor="motivo" requerido ayuda="Compras lo verá para corregir la factura.">
                        <textarea id="motivo" rows={3} maxLength={1000} autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value)} className={claseInput} />
                    </Campo>
                )}

                {/* Acciones */}
                <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-5">
                    {puedeEditar && onDuplicar && motivo === null && (
                        <button type="button" onClick={() => onDuplicar(f)} disabled={ocupado} className={`${botonSecundario} inline-flex items-center gap-2 !px-5`}>
                            <FaCopy /> Duplicar
                        </button>
                    )}
                    {puedeEditar && ["ENTREGADA", "DEVUELTA"].includes(f.estado) && motivo === null && (
                        <>
                            <button type="button" onClick={eliminar} disabled={ocupado} className={`${botonSecundario} inline-flex items-center gap-2 !px-5`}>
                                <FaTrash /> Eliminar
                            </button>
                            <button type="button" onClick={() => onEditar(f)} disabled={ocupado} className={`${botonSecundario} inline-flex items-center gap-2 !px-5`}>
                                <FaEdit /> {f.estado === "DEVUELTA" ? "Corregir y reenviar" : "Corregir"}
                            </button>
                        </>
                    )}
                    {puedeRevisar && pendiente && (
                        motivo === null ? (
                            <>
                                <button type="button" onClick={() => setMotivo("")} disabled={ocupado} className={`${botonPeligro} inline-flex items-center gap-2`}>
                                    <FaUndo /> Devolver
                                </button>
                                <button type="button" onClick={recibir} disabled={ocupado} className={`${botonExito} inline-flex items-center gap-2`}>
                                    <FaCheck /> Recibir
                                </button>
                            </>
                        ) : (
                            <>
                                <button type="button" onClick={() => setMotivo(null)} disabled={ocupado} className={botonSecundario}>Cancelar</button>
                                <button type="button" onClick={devolver} disabled={ocupado} className={botonPeligro}>{ocupado ? "Devolviendo..." : "Confirmar devolución"}</button>
                            </>
                        )
                    )}
                </div>

                {/* Historial */}
                <div>
                    <h3 className="mb-4 font-semibold text-slate-200">Historial</h3>
                    <ol className="relative ml-2 space-y-5 border-l-2 border-white/10">
                        {[...(f.historial || [])].reverse().map((h, i) => (
                            <li key={`${h.fecha}-${i}`} className="ml-6">
                                <span className={`absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full ring-4 ring-slate-900 ${colorPunto(h.accion)}`} />
                                <p className="font-semibold text-slate-100">{ACCIONES_FACTURA[h.accion] || h.accion}</p>
                                <p className="text-sm text-slate-300">{h.usuarioNombre} {h.usuarioRol && <span className="text-slate-400">({h.usuarioRol})</span>}</p>
                                <p className="text-xs text-slate-400">{formatoFechaHora(h.fecha)}</p>
                                {h.comentario && <p className="mt-2 rounded-lg bg-white/5 p-3 text-sm text-slate-200 whitespace-pre-line">{h.comentario}</p>}
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </Modal>
    );
}
