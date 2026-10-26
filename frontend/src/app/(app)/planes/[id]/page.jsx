"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FaArrowLeft, FaEdit, FaBan, FaPaperPlane, FaLock } from "react-icons/fa";

import Seccion from "../../../../components/ui/Seccion";
import Cargando from "../../../../components/ui/Cargando";
import Modal from "../../../../components/ui/Modal";
import Campo from "../../../../components/ui/Campo";
import Dato from "../../../../components/peticiones/Dato";
import EstadoBadge from "../../../../components/peticiones/EstadoBadge";
import TipoBadge from "../../../../components/peticiones/TipoBadge";
import AvancePlan from "../../../../components/planes/AvancePlan";
import EstadoPlanBadge from "../../../../components/planes/EstadoPlanBadge";
import CuotasEditor from "../../../../components/planes/CuotasEditor";
import { claseInput, botonPrimario, botonSecundario, botonPeligro } from "../../../../components/ui/estilos";
import { alertaError, toastExito } from "../../../../components/ui/alertas";

import { useAuth } from "../../../../context/AuthContext";
import { obtenerPlan, modificarPlan, cancelarPlan } from "../../../../services/planes.service";
import { ACCIONES_PLAN, recalcularMontos, sumaCuotas } from "../../../../utils/planes";
import { formatoMonto, formatoFecha, formatoFechaHora, mensajeError } from "../../../../utils/formato";

export default function DetallePlanPage() {
    const { id } = useParams();
    const { userData } = useAuth();
    const [plan, setPlan] = useState(null);
    const [error, setError] = useState("");
    const [edicion, setEdicion] = useState(null); // { montoTotal, cuotas, motivo }
    const [cancelando, setCancelando] = useState(null); // motivo
    const [ocupado, setOcupado] = useState(false);

    const cargar = useCallback(async () => {
        try {
            const { data } = await obtenerPlan(id);
            setPlan(data.data);
        } catch (e) {
            setError(mensajeError(e, "No se pudo cargar el plan."));
        }
    }, [id]);

    useEffect(() => { cargar(); }, [cargar]);

    if (error) {
        return (
            <div className="rounded-2xl bg-slate-800/35 p-10 text-center shadow-lg ring-1 ring-white/15 backdrop-blur-xl">
                <p className="text-slate-200">{error}</p>
                <Link href="/planes" className="mt-4 inline-block text-blue-400 hover:underline">Volver a planes</Link>
            </div>
        );
    }
    if (!plan) return <Cargando />;

    const p = plan;
    const puedeEditar = userData?.esCompras && p.estado === "ABIERTO";

    const abrirEdicion = () =>
        setEdicion({
            montoTotal: String(p.montoTotal),
            motivo: "",
            cuotas: p.cuotas.map(({ id: cid, nombre, porcentaje, monto, condicion, fechaEstimada, peticionId, peticionNumero }) => ({
                id: cid, nombre, porcentaje, monto, condicion, fechaEstimada: fechaEstimada || "", peticionId, peticionNumero
            }))
        });

    const guardarEdicion = async () => {
        const total = Number(edicion.montoTotal);
        if (!edicion.motivo.trim()) return alertaError("Indica el motivo del cambio. Queda en el historial.");
        if (Math.abs(sumaCuotas(edicion.cuotas) - total) >= 0.01) return alertaError("Las cuotas deben sumar el monto total.");
        setOcupado(true);
        try {
            const { data } = await modificarPlan(p.id, {
                montoTotal: total,
                motivo: edicion.motivo,
                cuotas: edicion.cuotas.map((c) => ({ ...c, monto: Number(c.monto), fechaEstimada: c.fechaEstimada || null }))
            });
            setPlan(data.data);
            setEdicion(null);
            toastExito(data.message);
        } catch (e) {
            alertaError(mensajeError(e, "No se pudieron guardar los cambios."));
        } finally {
            setOcupado(false);
        }
    };

    const confirmarCancelacion = async () => {
        if (!cancelando?.trim()) return alertaError("Indica el motivo de la cancelación.");
        setOcupado(true);
        try {
            const { data } = await cancelarPlan(p.id, cancelando);
            setPlan(data.data);
            setCancelando(null);
            toastExito(data.message);
        } catch (e) {
            alertaError(mensajeError(e, "No se pudo cancelar el plan."));
        } finally {
            setOcupado(false);
        }
    };

    return (
        <div className="space-y-8">
            <Link href="/planes" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white">
                <FaArrowLeft /> Planes de pago
            </Link>

            {/* Encabezado */}
            <div className="rounded-3xl border border-white/15 bg-slate-800/35 p-5 sm:p-8 text-white shadow-2xl shadow-black/40 backdrop-blur-xl">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="break-words text-2xl font-bold sm:text-3xl">{p.numero}</h1>
                            <EstadoPlanBadge estado={p.estado} />
                            <TipoBadge tipo={p.tipo} />
                            <span className="text-xs text-slate-400">Versión {p.version}</span>
                        </div>
                        <p className="mt-2 text-slate-300">
                            {p.proveedorNombre}{p.ordenELM ? ` · Orden ELM ${p.ordenELM}` : ""} · Creado por {p.creadoPorNombre} el {formatoFecha(p.fechaCreacion)}
                        </p>
                    </div>
                    <div className="md:text-right">
                        <p className="text-sm text-slate-300">Monto total</p>
                        <p className="text-2xl font-bold sm:text-3xl">{formatoMonto(p.montoTotal, p.moneda)}</p>
                    </div>
                </div>
                <div className="mt-6"><AvancePlan plan={p} /></div>
                <p className="mt-4 whitespace-pre-line text-sm text-slate-300">{p.concepto}</p>
                {puedeEditar && !edicion && (
                    <div className="mt-6 flex flex-wrap gap-3">
                        <button onClick={abrirEdicion} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-2.5 font-semibold ring-1 ring-white/15 hover:bg-white/20">
                            <FaEdit /> Modificar términos
                        </button>
                        <button onClick={() => setCancelando("")} className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 font-semibold text-red-300 ring-1 ring-red-400/30 hover:bg-red-500/10">
                            <FaBan /> Cancelar plan
                        </button>
                    </div>
                )}
            </div>

            {/* Cuotas */}
            {edicion ? (
                <Seccion titulo="Modificar términos">
                    <p className="mb-4 text-sm text-slate-300">
                        Las cuotas con petición <FaLock className="inline" /> no se pueden cambiar. El total y las cuotas pendientes sí; el cambio queda en el historial con la versión anterior.
                    </p>
                    <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-3">
                        <Campo etiqueta={`Monto total (${p.moneda})`} htmlFor="montoTotal" requerido>
                            <input
                                id="montoTotal" type="number" min="0" step="0.01" value={edicion.montoTotal}
                                onChange={(e) => setEdicion((x) => ({ ...x, montoTotal: e.target.value, cuotas: recalcularMontos(x.cuotas, e.target.value) }))}
                                className={claseInput}
                            />
                        </Campo>
                        <Campo etiqueta="Motivo del cambio" htmlFor="motivo" requerido className="md:col-span-2">
                            <input id="motivo" maxLength={500} placeholder="Ej. El proveedor confirmó menos unidades por disponibilidad" value={edicion.motivo} onChange={(e) => setEdicion((x) => ({ ...x, motivo: e.target.value }))} className={claseInput} />
                        </Campo>
                    </div>
                    <CuotasEditor cuotas={edicion.cuotas} montoTotal={edicion.montoTotal} moneda={p.moneda} onChange={(cuotas) => setEdicion((x) => ({ ...x, cuotas }))} />
                    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button onClick={() => setEdicion(null)} disabled={ocupado} className={botonSecundario}>Descartar</button>
                        <button onClick={guardarEdicion} disabled={ocupado} className={botonPrimario}>{ocupado ? "Guardando..." : "Guardar nueva versión"}</button>
                    </div>
                </Seccion>
            ) : (
                <Seccion titulo="Cuotas">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[820px] text-sm">
                            <thead className="text-left text-slate-400">
                                <tr>
                                    <th className="px-3 py-2">#</th>
                                    <th className="px-3 py-2">Cuota</th>
                                    <th className="px-3 py-2 text-right">%</th>
                                    <th className="px-3 py-2 text-right">Monto</th>
                                    <th className="px-3 py-2">Condición</th>
                                    <th className="px-3 py-2">Fecha estimada</th>
                                    <th className="px-3 py-2">Petición</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {p.cuotas.map((c) => (
                                    <tr key={c.id} className={c.habilitada ? "bg-blue-500/10" : ""}>
                                        <td className="px-3 py-3 text-slate-400">{c.numero}</td>
                                        <td className="px-3 py-3 font-medium text-white">{c.nombre}</td>
                                        <td className="px-3 py-3 text-right text-slate-300">{c.porcentaje}%</td>
                                        <td className="whitespace-nowrap px-3 py-3 text-right font-semibold text-white">{formatoMonto(c.monto, p.moneda)}</td>
                                        <td className="px-3 py-3 text-slate-300">{c.condicion || "—"}</td>
                                        <td className="whitespace-nowrap px-3 py-3 text-slate-300">{c.fechaEstimada ? formatoFecha(c.fechaEstimada) : "—"}</td>
                                        <td className="px-3 py-3">
                                            {c.peticionId ? (
                                                <Link href={`/peticiones/${c.peticionId}`} className="flex flex-wrap items-center gap-2 text-blue-300 hover:underline">
                                                    {c.peticionNumero} <EstadoBadge estado={c.estadoPeticion} />
                                                </Link>
                                            ) : c.habilitada && userData?.esCompras ? (
                                                <Link
                                                    href={`/peticiones/nueva?plan=${p.id}&cuota=${c.id}`}
                                                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-700 px-4 py-2 font-semibold text-white hover:from-blue-400 hover:to-blue-600"
                                                >
                                                    <FaPaperPlane /> Solicitar pago
                                                </Link>
                                            ) : (
                                                <span className="text-slate-400">{p.estado === "CANCELADO" ? "—" : "Pendiente (en orden)"}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Seccion>
            )}

            {/* Historial */}
            <Seccion titulo="Historial y versiones">
                <ol className="space-y-5">
                    {[...(p.historial || [])].reverse().map((h, i) => (
                        <li key={i} className="border-l-2 border-white/15 pl-4">
                            <p className="text-sm text-slate-400">{formatoFechaHora(h.fecha)} · {h.usuarioNombre}{h.version ? ` · v${h.version}` : ""}</p>
                            <p className="font-semibold text-white">{ACCIONES_PLAN[h.accion] || h.accion}{h.detalle ? `: ${h.detalle}` : ""}</p>
                            {h.motivo && <p className="text-sm text-slate-300">Motivo: {h.motivo}</p>}
                            {h.accion === "MODIFICADO" && h.antes && h.despues && <Comparacion antes={h.antes} despues={h.despues} moneda={p.moneda} />}
                        </li>
                    ))}
                </ol>
            </Seccion>

            <Modal abierto={cancelando !== null} titulo={`Cancelar ${p.numero}`} onCerrar={() => !ocupado && setCancelando(null)}>
                <p className="text-sm text-slate-300">Las cuotas pendientes ya no se podrán solicitar. Las pagadas se conservan en el historial.</p>
                <Campo etiqueta="Motivo" htmlFor="motivoCancelacion" requerido className="mt-4">
                    <textarea id="motivoCancelacion" rows={3} maxLength={500} value={cancelando || ""} onChange={(e) => setCancelando(e.target.value)} className={claseInput} />
                </Campo>
                <div className="mt-5 flex justify-end gap-3">
                    <button onClick={() => setCancelando(null)} disabled={ocupado} className={botonSecundario}>Volver</button>
                    <button onClick={confirmarCancelacion} disabled={ocupado} className={botonPeligro}>{ocupado ? "Cancelando..." : "Cancelar plan"}</button>
                </div>
            </Modal>
        </div>
    );
}

// Tabla antes / después de una modificación de términos.
function Comparacion({ antes, despues, moneda }) {
    const filas = Math.max(antes.cuotas.length, despues.cuotas.length);
    const celda = (c) => (c ? `${c.nombre}: ${formatoMonto(c.monto, moneda)} (${c.porcentaje}%)` : "—");
    return (
        <div className="mt-2 overflow-x-auto">
            <table className="text-xs">
                <thead className="text-left text-slate-400">
                    <tr><th className="pr-6 py-1">Antes</th><th className="py-1">Después</th></tr>
                </thead>
                <tbody className="text-slate-300">
                    <tr className={antes.montoTotal !== despues.montoTotal ? "text-amber-200" : ""}>
                        <td className="pr-6 py-0.5">Total: {formatoMonto(antes.montoTotal, moneda)}</td>
                        <td className="py-0.5">Total: {formatoMonto(despues.montoTotal, moneda)}</td>
                    </tr>
                    {Array.from({ length: filas }, (_, i) => {
                        const a = antes.cuotas[i];
                        const d = despues.cuotas[i];
                        const cambio = celda(a) !== celda(d);
                        return (
                            <tr key={i} className={cambio ? "text-amber-200" : ""}>
                                <td className="pr-6 py-0.5">{celda(a)}</td>
                                <td className="py-0.5">{celda(d)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
