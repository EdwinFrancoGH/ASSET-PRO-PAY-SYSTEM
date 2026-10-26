"use client";

import { FaCalculator, FaExclamationTriangle } from "react-icons/fa";
import { claseInput } from "../ui/estilos";
import AyudaClasificacion from "../ui/AyudaClasificacion";
import { formatoMonto } from "../../utils/formato";
import {
    CLASIFICACIONES, DOCUMENTOS, ETIQUETA_CLASIFICACION, ETIQUETA_DOCUMENTO, MINIMO_RETENCION_IVA
} from "../../utils/impuestos";

// Desglose del pago a un proveedor local: subtotal sin IVA, IVA 13%,
// retención IVA 1%, retención Renta 10% y pago efectivo al proveedor.
//   editable = true  → en el formulario (documento y casilla de Renta)
//   editable = false → en el detalle (solo lectura)
// onClasificar(valor): si el proveedor no tiene clasificación, se pide aquí una sola vez.
export default function CalculoPago({ calculo, clasificacion, documento, aplicaRetencionRenta, moneda, editable = false, onCambiar, onClasificar }) {
    const noInscrito = clasificacion === CLASIFICACIONES.NO_INSCRITO || documento === DOCUMENTOS.SUJETO_EXCLUIDO;
    const consumidorFinal = documento === DOCUMENTOS.CONSUMIDOR_FINAL;
    const esPequenoMediano = [CLASIFICACIONES.MEDIANO, CLASIFICACIONES.PEQUENO].includes(clasificacion);

    const fila = (etiqueta, valor, { signo = "", nota, fuerte = false } = {}) => (
        <div className={`flex items-baseline justify-between gap-4 py-2 ${fuerte ? "border-t border-white/15 pt-3 text-lg font-bold text-white" : "text-slate-200"}`}>
            <span>
                {etiqueta}
                {nota && <span className="block text-xs font-normal text-slate-400">{nota}</span>}
            </span>
            <span className="whitespace-nowrap tabular-nums">{signo}{formatoMonto(valor || 0, moneda)}</span>
        </div>
    );

    return (
        <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-semibold text-slate-200"><FaCalculator /> Cálculo del pago</h3>
                <span className="text-xs text-slate-400">{clasificacion ? ETIQUETA_CLASIFICACION[clasificacion] : "Clasificación no definida"}</span>
            </div>

            {!clasificacion && (editable && onClasificar ? (
                <div className="mb-4 space-y-3">
                    <label className="block text-sm font-medium text-slate-300">
                        Clasificación del contribuyente <span className="text-red-500">*</span>
                        <select defaultValue="" onChange={(e) => e.target.value && onClasificar(e.target.value)} className={claseInput}>
                            <option value="">Seleccionar...</option>
                            {Object.entries(ETIQUETA_CLASIFICACION).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                        </select>
                        <span className="mt-1 block text-xs font-normal text-slate-400">Se guarda en el proveedor y no se vuelve a preguntar.</span>
                    </label>
                    <AyudaClasificacion />
                </div>
            ) : (
                <p className="mb-4 flex gap-2 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-100 ring-1 ring-amber-400/30">
                    <FaExclamationTriangle className="mt-0.5 flex-none" />
                    El proveedor no tiene clasificación de contribuyente en Catálogos; no se calcula la retención del 1%.
                </p>
            ))}

            {editable && (
                <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium text-slate-300">
                        Documento
                        {/* Persona natural no inscrita en IVA: siempre Sujeto excluido. */}
                        <select
                            value={documento}
                            onChange={(e) => onCambiar("documentoFiscal", e.target.value)}
                            disabled={noInscrito}
                            className={claseInput}
                        >
                            {(noInscrito ? [DOCUMENTOS.SUJETO_EXCLUIDO] : [DOCUMENTOS.CCF, DOCUMENTOS.CONSUMIDOR_FINAL]).map((d) => (
                                <option key={d} value={d}>{ETIQUETA_DOCUMENTO[d]}</option>
                            ))}
                        </select>
                        {noInscrito && <span className="mt-1 block text-xs font-normal text-slate-400">Persona natural sin CCF: sin IVA, solo retención Renta 10%.</span>}
                    </label>
                    {!consumidorFinal && (
                        <label className="flex items-center gap-3 self-end pb-3 text-sm text-slate-200">
                            <input type="checkbox" checked={aplicaRetencionRenta} onChange={(e) => onCambiar("aplicaRetencionRenta", e.target.checked)} className="h-4 w-4" />
                            Servicio de persona natural (retención Renta 10%)
                        </label>
                    )}
                </div>
            )}

            {!calculo ? (
                <p className="text-sm text-slate-400">Escribe el monto sin IVA para ver el cálculo.</p>
            ) : consumidorFinal ? (
                <>
                    {fila("Monto a pagar", calculo.subtotal, { nota: "Consumidor final: los impuestos ya van incluidos, no se calculan." })}
                    {fila("Pago efectivo al proveedor", calculo.pagoEfectivo, { fuerte: true })}
                </>
            ) : (
                <>
                    {fila("Subtotal sin IVA", calculo.subtotal)}
                    {!noInscrito && fila("IVA 13%", calculo.iva, { signo: "+ " })}
                    {esPequenoMediano &&
                        fila("Retención IVA 1%", calculo.retencionIva, {
                            signo: "− ",
                            nota: calculo.retencionIva ? undefined : `No aplica: el monto sin IVA es menor a ${formatoMonto(MINIMO_RETENCION_IVA, moneda)}.`
                        })}
                    {calculo.retencionRenta > 0 && fila("Retención Renta 10%", calculo.retencionRenta, { signo: "− " })}
                    {fila("Pago efectivo al proveedor", calculo.pagoEfectivo, { fuerte: true })}
                </>
            )}
            {!editable && calculo && !consumidorFinal && (
                <p className="mt-2 text-xs text-slate-400">Documento: {ETIQUETA_DOCUMENTO[documento] || "—"}</p>
            )}
        </div>
    );
}
