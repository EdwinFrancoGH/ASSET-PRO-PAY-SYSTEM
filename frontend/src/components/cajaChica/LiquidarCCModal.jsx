"use client";

import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import Campo from "../ui/Campo";
import ResumenCierreCC from "./ResumenCierreCC";
import { claseInput, botonPrimario, botonSecundario } from "../ui/estilos";
import { alertaError, toastExito } from "../ui/alertas";
import { enviarLiquidacionCC } from "../../services/cajaChica.service";
import { calcularCierre, textoCierreSolicitante } from "../../utils/cajaChica";
import { formatoMonto, formatoFechaHora, formatoTamano, mensajeError } from "../../utils/formato";

const MAX_ARCHIVOS = 5;

// El solicitante liquida: N° de factura, monto gastado y foto/PDF de la(s)
// factura(s). Ve en vivo si devuelve vuelto o recibe reintegro.
export default function LiquidarCCModal({ solicitud, onCerrar, onEnviada }) {
    const [numeroFactura, setNumeroFactura] = useState("");
    const [montoGastado, setMontoGastado] = useState("");
    const [comentario, setComentario] = useState("");
    const [archivos, setArchivos] = useState([]);
    const [enviando, setEnviando] = useState(false);

    useEffect(() => {
        if (!solicitud) return;
        setNumeroFactura(solicitud.liquidacion?.numeroFactura || "");
        setMontoGastado(solicitud.liquidacion?.montoGastado ?? "");
        setComentario("");
        setArchivos([]);
    }, [solicitud]);

    const agregar = (e) => {
        const nuevos = [...archivos, ...Array.from(e.target.files || [])].slice(0, MAX_ARCHIVOS);
        setArchivos(nuevos);
        e.target.value = "";
    };

    const cierre = Number(montoGastado) > 0 ? calcularCierre(solicitud?.monto, montoGastado) : null;

    const enviar = async (e) => {
        e.preventDefault();
        if (!archivos.length) return alertaError("Adjunta la foto o el PDF de tu factura.");
        setEnviando(true);
        try {
            const { data } = await enviarLiquidacionCC(solicitud.id, { numeroFactura, montoGastado, comentario, archivos });
            toastExito(data.message);
            onEnviada();
        } catch (err) {
            alertaError(mensajeError(err));
        } finally {
            setEnviando(false);
        }
    };

    const devuelta = solicitud?.estado === "LIQUIDACION_DEVUELTA";

    return (
        <Modal abierto={Boolean(solicitud)} titulo={`Liquidar ${solicitud?.numero || ""}`} onCerrar={() => !enviando && onCerrar()} ancho="max-w-2xl">
            {solicitud && (
                <form onSubmit={enviar} className="space-y-5">
                    <p className="text-slate-300">
                        Recibiste <b className="text-white">{formatoMonto(solicitud.monto)}</b>. Fecha límite para liquidar: <b className="text-white">{formatoFechaHora(solicitud.liquidarAntes)}</b>.
                    </p>

                    {devuelta && solicitud.liquidacion?.motivoDevolucion && (
                        <div className="rounded-lg bg-orange-500/10 p-3 text-orange-200 ring-1 ring-orange-400/30">
                            <p className="text-xs font-semibold uppercase tracking-wide">Caja la devolvió</p>
                            <p className="mt-1">{solicitud.liquidacion.motivoDevolucion}</p>
                            <p className="mt-1 text-xs text-orange-300/80">Vuelve a adjuntar las facturas corregidas.</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Campo etiqueta="N° de factura" htmlFor="numFacturaCC" requerido ayuda="Si son varias, sepáralas con coma.">
                            <input id="numFacturaCC" required maxLength={120} value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} className={claseInput} placeholder="Ej. F-001234" />
                        </Campo>
                        <Campo etiqueta="Monto gastado (USD)" htmlFor="montoGastadoCC" requerido ayuda="Total según la(s) factura(s).">
                            <input id="montoGastadoCC" type="number" required min="0.01" step="0.01" value={montoGastado} onChange={(e) => setMontoGastado(e.target.value)} className={claseInput} placeholder="0.00" />
                        </Campo>
                    </div>

                    <Campo etiqueta={`Factura(s) — foto o PDF (máx. ${MAX_ARCHIVOS})`} htmlFor="archivosCC" requerido>
                        <input id="archivosCC" type="file" multiple accept="application/pdf,image/png,image/jpeg,image/webp" onChange={agregar} disabled={archivos.length >= MAX_ARCHIVOS} className={`${claseInput} file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-white`} />
                    </Campo>
                    {archivos.length > 0 && (
                        <ul className="divide-y divide-white/10 rounded-lg bg-white/5 text-sm">
                            {archivos.map((a, i) => (
                                <li key={`${a.name}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2 text-slate-200">
                                    <span className="truncate">{a.name} <span className="text-xs text-slate-400">{formatoTamano(a.size)}</span></span>
                                    <button type="button" onClick={() => setArchivos(archivos.filter((_, j) => j !== i))} className="text-xs text-red-400 hover:underline">Quitar</button>
                                </li>
                            ))}
                        </ul>
                    )}

                    <Campo etiqueta="Comentario (opcional)" htmlFor="comentarioLiqCC">
                        <textarea id="comentarioLiqCC" rows={2} maxLength={300} value={comentario} onChange={(e) => setComentario(e.target.value)} className={claseInput} />
                    </Campo>

                    {cierre && <ResumenCierreCC entregado={solicitud.monto} cierre={cierre} textoMovimiento={textoCierreSolicitante(cierre)} />}

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onCerrar} disabled={enviando} className={botonSecundario}>Cancelar</button>
                        <button type="submit" disabled={enviando} className={botonPrimario}>{enviando ? "Enviando..." : "Enviar liquidación"}</button>
                    </div>
                </form>
            )}
        </Modal>
    );
}
