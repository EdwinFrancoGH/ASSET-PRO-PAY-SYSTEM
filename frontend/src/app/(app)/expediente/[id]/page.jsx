"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FaArrowLeft, FaPaperclip, FaDownload, FaBan, FaExternalLinkAlt, FaPrint } from "react-icons/fa";

import Seccion from "../../../../components/ui/Seccion";
import Campo from "../../../../components/ui/Campo";
import Cargando from "../../../../components/ui/Cargando";
import Modal from "../../../../components/ui/Modal";
import TipoBadge from "../../../../components/peticiones/TipoBadge";
import EstadoExpedienteBadge from "../../../../components/expedientes/EstadoExpedienteBadge";
import DocumentosExpediente from "../../../../components/expedientes/DocumentosExpediente";
import BotonDescargarExpediente from "../../../../components/expedientes/BotonDescargarExpediente";
import { claseInput, botonPrimario, botonSecundario, botonPeligro } from "../../../../components/ui/estilos";
import { alertaError, toastExito } from "../../../../components/ui/alertas";

import {
    obtenerExpediente, obtenerHistorialExpediente, compensarAnticipo, anularCompensacion, descargarFacturaCompensacion
} from "../../../../services/expedientes.service";
import { ACCIONES_EXPEDIENTE } from "../../../../utils/expedientes";
import { descargarBlob } from "../../../../utils/descargas";
import { formatoMonto, formatoFecha, formatoFechaHora, formatoTamano, hoyISO, mensajeError } from "../../../../utils/formato";

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const MAX_MB = 10;
const formularioVacio = (saldo) => ({ numeroFactura: "", fechaFactura: hoyISO(), valor: saldo ? String(saldo) : "", comentario: "", archivo: null });

export default function DetalleExpedientePage() {
    const { id } = useParams();
    const [exp, setExp] = useState(null);
    const [historial, setHistorial] = useState([]);
    const [error, setError] = useState("");
    const [form, setForm] = useState(null);
    const [guardando, setGuardando] = useState(false);
    const [anulando, setAnulando] = useState(null); // { compensacion, motivo }
    const inputArchivo = useRef(null);

    const cargar = useCallback(async () => {
        try {
            const [{ data }, hist] = await Promise.all([obtenerExpediente(id), obtenerHistorialExpediente(id)]);
            setExp(data.data);
            setHistorial(hist.data.data);
            setForm(formularioVacio(data.data.saldo));
        } catch (e) {
            setError(mensajeError(e, "No se pudo cargar el anticipo."));
        }
    }, [id]);

    useEffect(() => { cargar(); }, [cargar]);

    if (error) {
        return (
            <div className="rounded-2xl bg-slate-800/35 p-10 text-center shadow-lg ring-1 ring-white/15 backdrop-blur-xl">
                <p className="text-slate-200">{error}</p>
                <Link href="/expediente" className="mt-4 inline-block text-blue-400 hover:underline">Volver al expediente</Link>
            </div>
        );
    }
    if (!exp || !form) return <Cargando />;

    const e = exp;
    const abierto = ["PENDIENTE_COMPENSAR", "SALDO_PENDIENTE"].includes(e.estado);
    const saldoActual = r2(e.montoAnticipo - e.compensado);
    const valor = Number(form.valor);
    const despues = form.valor === "" || !Number.isFinite(valor) ? null : r2(saldoActual - valor);
    const pct = e.montoAnticipo ? Math.min(100, (e.compensado / e.montoAnticipo) * 100) : 0;

    const cambiar = (campo, valorCampo) => setForm((f) => ({ ...f, [campo]: valorCampo }));

    const elegirArchivo = (archivo) => {
        if (!archivo) return;
        if (archivo.size > MAX_MB * 1024 * 1024) return alertaError(`La factura supera los ${MAX_MB} MB.`);
        cambiar("archivo", archivo);
    };

    const compensar = async (ev) => {
        ev.preventDefault();
        if (!form.numeroFactura.trim()) return alertaError("Indica el número de factura.");
        if (!form.fechaFactura) return alertaError("Indica la fecha de la factura.");
        if (!(valor > 0)) return alertaError("Indica el valor de la factura.");
        if (!form.archivo) return alertaError("Adjunta la factura (PDF o imagen).");
        setGuardando(true);
        try {
            const { data } = await compensarAnticipo(e.id, form);
            toastExito(data.message);
            if (inputArchivo.current) inputArchivo.current.value = "";
            await cargar();
        } catch (err) {
            alertaError(mensajeError(err, "No se pudo compensar."));
        } finally {
            setGuardando(false);
        }
    };

    const confirmarAnulacion = async () => {
        if (!anulando.motivo.trim()) return alertaError("Indica el motivo de la anulación.");
        setGuardando(true);
        try {
            const { data } = await anularCompensacion(e.id, anulando.compensacion.id, anulando.motivo);
            toastExito(data.message);
            setAnulando(null);
            await cargar();
        } catch (err) {
            alertaError(mensajeError(err, "No se pudo anular."));
        } finally {
            setGuardando(false);
        }
    };

    const descargar = async (c) => {
        try {
            descargarBlob(await descargarFacturaCompensacion(e.id, c.id), c.archivo.nombre);
        } catch (err) {
            alertaError(mensajeError(err, "No se pudo descargar la factura."));
        }
    };

    return (
        <div className="space-y-8">
            <Link href="/expediente" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white">
                <FaArrowLeft /> Expediente
            </Link>

            {/* Encabezado del anticipo */}
            <div className="rounded-3xl border border-white/15 bg-slate-800/35 p-5 sm:p-8 text-white shadow-2xl shadow-black/40 backdrop-blur-xl">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="break-words text-2xl font-bold sm:text-3xl">Anticipo {e.numero}</h1>
                            <EstadoExpedienteBadge estado={e.estado} />
                            <TipoBadge tipo={e.tipo} />
                        </div>
                        <p className="mt-2 text-slate-300">
                            {e.proveedorNombre} · Solicitado por {e.solicitanteNombre} · {e.pagada ? `Pagado el ${formatoFecha(e.fechaPago)}` : "Aún no pagado"}
                            {e.planNumero ? ` · ${e.cuotaNombre} del plan ${e.planNumero}` : ""}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2">
                            <Link href={`/peticiones/${e.peticionId}`} className="inline-flex items-center gap-2 text-sm text-blue-300 hover:underline">
                                <FaExternalLinkAlt /> Ver la petición
                            </Link>
                            <Link href={`/peticiones/${e.peticionId}/imprimir`} target="_blank" className="inline-flex items-center gap-2 text-sm text-blue-300 hover:underline">
                                <FaPrint /> Imprimir solicitud
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                        <p className="text-sm text-slate-400">{e.pagada ? "Anticipo pagado" : "Monto del anticipo"}</p>
                        <p className="text-2xl font-bold">{formatoMonto(e.montoAnticipo, e.moneda)}</p>
                    </div>
                    <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                        <p className="text-sm text-slate-400">Compensado con facturas</p>
                        <p className="text-2xl font-bold text-emerald-300">{formatoMonto(e.compensado, e.moneda)}</p>
                    </div>
                    <div className={`rounded-2xl p-4 ring-1 ${!e.pagada ? "bg-white/5 ring-white/10" : e.excedente > 0 ? "bg-violet-500/10 ring-violet-400/30" : e.saldo > 0 ? "bg-orange-500/10 ring-orange-400/30" : "bg-emerald-500/10 ring-emerald-400/30"}`}>
                        <p className="text-sm text-slate-300">{e.excedente > 0 ? "Excedente" : "Saldo pendiente por compensar"}</p>
                        <p className={`text-2xl font-bold ${e.excedente > 0 ? "text-violet-300" : e.saldo > 0 ? "text-orange-200" : "text-emerald-300"}`}>
                            {e.pagada ? formatoMonto(e.excedente > 0 ? e.excedente : e.saldo, e.moneda) : "—"}
                        </p>
                    </div>
                </div>
                {!e.pagada && (
                    <p className="mt-4 rounded-xl bg-sky-500/10 p-3 text-sm text-sky-200 ring-1 ring-sky-400/30">
                        Este anticipo aún está en el flujo de aprobación/pago. Podrás asociarle facturas cuando Contabilidad lo marque como Pagado.
                    </p>
                )}
                <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/10" role="img" aria-label={`Compensado ${Math.round(pct)}%`}>
                    <div className={e.excedente > 0 ? "h-full bg-violet-400" : "h-full bg-emerald-400"} style={{ width: `${pct}%` }} />
                </div>
            </div>

            {/* Todos los documentos del anticipo, con Ver / Descargar */}
            <Seccion titulo="Documentos del expediente" acciones={e.pagada && <BotonDescargarExpediente peticionId={e.peticionId} numero={e.numero} />}>
                <DocumentosExpediente expediente={e} />
            </Seccion>

            {/* Compensar */}
            {abierto && e.puedeCompensar && (
                <Seccion titulo="Asociar factura">
                    <form onSubmit={compensar} className="space-y-5" noValidate>
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                            <Campo etiqueta="N° de factura" htmlFor="numeroFactura" requerido>
                                <input id="numeroFactura" maxLength={60} value={form.numeroFactura} onChange={(ev) => cambiar("numeroFactura", ev.target.value)} className={claseInput} />
                            </Campo>
                            <Campo etiqueta="Fecha de la factura" htmlFor="fechaFactura" requerido>
                                <input id="fechaFactura" type="date" max={hoyISO()} value={form.fechaFactura} onChange={(ev) => cambiar("fechaFactura", ev.target.value)} className={claseInput} />
                            </Campo>
                            <Campo etiqueta={`Valor de la factura (${e.moneda})`} htmlFor="valor" requerido ayuda="Valor total de la factura (con IVA).">
                                <input id="valor" type="number" min="0" step="0.01" inputMode="decimal" value={form.valor} onChange={(ev) => cambiar("valor", ev.target.value)} className={claseInput} />
                            </Campo>
                        </div>

                        {despues !== null && valor > 0 && (
                            <div className={`rounded-xl p-4 text-sm ring-1 ${despues > 0 ? "bg-orange-500/10 text-orange-100 ring-orange-400/30" : despues < 0 ? "bg-violet-500/10 text-violet-100 ring-violet-400/30" : "bg-emerald-500/10 text-emerald-100 ring-emerald-400/30"}`}>
                                {despues > 0 && <>La factura no cubre todo el anticipo. <strong>Saldo pendiente por compensar: {formatoMonto(despues, e.moneda)}</strong></>}
                                {despues === 0 && <><strong>El anticipo queda compensado por completo.</strong></>}
                                {despues < 0 && <>La factura supera el saldo. <strong>Excedente: {formatoMonto(-despues, e.moneda)}</strong> (quedará registrado en el expediente).</>}
                            </div>
                        )}

                        <Campo etiqueta="Comentario" htmlFor="comentario">
                            <input id="comentario" maxLength={500} value={form.comentario} onChange={(ev) => cambiar("comentario", ev.target.value)} className={claseInput} placeholder="Opcional" />
                        </Campo>

                        <div>
                            <input ref={inputArchivo} type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" className="hidden" onChange={(ev) => elegirArchivo(ev.target.files?.[0])} />
                            <button type="button" onClick={() => inputArchivo.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-slate-200 hover:bg-white/5">
                                <FaPaperclip /> {form.archivo ? "Cambiar archivo" : "Adjuntar factura"} <span className="text-red-500">*</span>
                            </button>
                            {form.archivo && <span className="ml-3 text-sm text-slate-300">{form.archivo.name} ({formatoTamano(form.archivo.size)})</span>}
                            <p className="mt-1 text-xs text-slate-400">PDF o imagen de hasta {MAX_MB} MB.</p>
                        </div>

                        <div className="flex justify-end">
                            <button type="submit" disabled={guardando} className={botonPrimario}>{guardando ? "Compensando..." : "Compensar"}</button>
                        </div>
                    </form>
                </Seccion>
            )}

            {/* Facturas asociadas */}
            <Seccion titulo="Facturas asociadas">
                {e.compensaciones.length === 0 ? (
                    <p className="text-slate-400">Sin facturas: el anticipo está pendiente de compensar.</p>
                ) : (
                    <div className="relative overflow-x-auto">
                        <table className="w-full min-w-[760px] text-sm">
                            <thead className="text-left text-slate-400">
                                <tr>
                                    <th className="px-3 py-2">N° factura</th>
                                    <th className="px-3 py-2">Fecha</th>
                                    <th className="px-3 py-2 text-right">Valor</th>
                                    <th className="px-3 py-2">Cargada por</th>
                                    <th className="px-3 py-2">Archivo</th>
                                    <th className="px-3 py-2"><span className="sr-only">Acciones</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {e.compensaciones.map((c) => (
                                    <tr key={c.id} className={c.anulada ? "opacity-60" : ""}>
                                        <td className="px-3 py-3 font-medium text-white">
                                            <span className={c.anulada ? "line-through" : ""}>{c.numeroFactura}</span>
                                            {c.comentario && <span className="block text-xs text-slate-400">{c.comentario}</span>}
                                            {c.anulada && <span className="block text-xs text-red-300">Anulada por {c.anuladaPorNombre}: {c.motivoAnulacion}</span>}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-3 text-slate-300">{formatoFecha(c.fechaFactura)}</td>
                                        <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-white">{formatoMonto(c.valor, e.moneda)}</td>
                                        <td className="px-3 py-3 text-slate-300">{c.registradoPorNombre}<span className="block text-xs text-slate-400">{formatoFechaHora(c.fecha)}</span></td>
                                        <td className="px-3 py-3">
                                            <button onClick={() => descargar(c)} className="inline-flex items-center gap-2 text-blue-300 hover:underline">
                                                <FaDownload /> {c.archivo.nombre}
                                            </button>
                                        </td>
                                        <td className="px-3 py-3 text-right">
                                            {!c.anulada && (
                                                <button onClick={() => setAnulando({ compensacion: c, motivo: "" })} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-red-300 hover:bg-red-500/15">
                                                    <FaBan /> Anular
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Seccion>

            {/* Historial */}
            {historial.length > 0 && (
                <Seccion titulo="Historial">
                    <ol className="space-y-4">
                        {[...historial].reverse().map((h, i) => (
                            <li key={i} className="border-l-2 border-white/15 pl-4">
                                <p className="text-sm text-slate-400">{formatoFechaHora(h.fecha)} · {h.usuarioNombre}</p>
                                <p className="text-white">{ACCIONES_EXPEDIENTE[h.accion] || h.accion}: <span className="text-slate-300">{h.detalle}</span></p>
                            </li>
                        ))}
                    </ol>
                </Seccion>
            )}

            <Modal abierto={Boolean(anulando)} titulo={`Anular factura ${anulando?.compensacion.numeroFactura || ""}`} onCerrar={() => !guardando && setAnulando(null)}>
                <p className="text-sm text-slate-300">La factura deja de compensar el anticipo, pero queda en el historial. Solo quien la cargó o Contabilidad pueden anularla.</p>
                <Campo etiqueta="Motivo" htmlFor="motivoAnulacion" requerido className="mt-4">
                    <textarea id="motivoAnulacion" rows={3} maxLength={500} value={anulando?.motivo || ""} onChange={(ev) => setAnulando((a) => ({ ...a, motivo: ev.target.value }))} className={claseInput} />
                </Campo>
                <div className="mt-5 flex justify-end gap-3">
                    <button onClick={() => setAnulando(null)} disabled={guardando} className={botonSecundario}>Volver</button>
                    <button onClick={confirmarAnulacion} disabled={guardando} className={botonPeligro}>{guardando ? "Anulando..." : "Anular factura"}</button>
                </div>
            </Modal>
        </div>
    );
}
