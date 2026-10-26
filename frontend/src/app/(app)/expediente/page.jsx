"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaFileExcel, FaSearch } from "react-icons/fa";

import EncabezadoPagina from "../../../components/ui/EncabezadoPagina";
import Cargando from "../../../components/ui/Cargando";
import TipoBadge from "../../../components/peticiones/TipoBadge";
import EstadoExpedienteBadge from "../../../components/expedientes/EstadoExpedienteBadge";
import ResumenExpediente from "../../../components/expedientes/ResumenExpediente";
import { claseInput } from "../../../components/ui/estilos";
import { alertaError, toastExito } from "../../../components/ui/alertas";

import { obtenerExpedientes, exportarExpedientes } from "../../../services/expedientes.service";
import { INFO_ESTADO_EXPEDIENTE } from "../../../utils/expedientes";
import { descargarBlob } from "../../../utils/descargas";
import { formatoMonto, formatoFecha, mensajeError } from "../../../utils/formato";

const FILTROS_VACIOS = { estado: "", q: "" };

export default function ExpedientePage() {
    const router = useRouter();
    const [filtros, setFiltros] = useState(FILTROS_VACIOS);
    const [datos, setDatos] = useState(null); // { resumen, lista }
    const [exportando, setExportando] = useState(false);

    const cargar = useCallback(async () => {
        try {
            const { data } = await obtenerExpedientes(filtros);
            setDatos(data.data);
        } catch (e) {
            setDatos({ resumen: null, lista: [] });
            alertaError(mensajeError(e, "No se pudo cargar el expediente."));
        }
    }, [filtros]);

    useEffect(() => {
        const t = setTimeout(cargar, filtros.q ? 350 : 0);
        return () => clearTimeout(t);
    }, [cargar, filtros.q]);

    const cambiar = (e) => setFiltros((f) => ({ ...f, [e.target.name]: e.target.value }));

    const exportar = async () => {
        setExportando(true);
        try {
            descargarBlob(await exportarExpedientes(filtros), "expediente-anticipos.xlsx");
            toastExito("Excel descargado.");
        } catch {
            alertaError("No se pudo generar el Excel.");
        } finally {
            setExportando(false);
        }
    };

    const lista = datos?.lista;
    const hayFiltros = Object.values(filtros).some(Boolean);

    return (
        <>
            <EncabezadoPagina
                titulo="Expediente de anticipos"
                descripcion="Todos los anticipos: los que van en proceso de pago y los pagados, con las facturas que los compensan y el saldo pendiente de liquidar."
            >
                <button onClick={exportar} disabled={exportando || !lista?.length} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-emerald-700 disabled:opacity-60">
                    <FaFileExcel /> {exportando ? "Generando..." : "Descargar Excel"}
                </button>
            </EncabezadoPagina>

            {datos?.resumen && <ResumenExpediente resumen={datos.resumen} estado={filtros.estado} onFiltrar={(estado) => setFiltros((f) => ({ ...f, estado }))} />}

            <div className="rounded-2xl bg-slate-800/35 shadow-lg ring-1 ring-white/15 backdrop-blur-xl">
                <div className="grid grid-cols-1 gap-4 border-b p-6 md:grid-cols-3">
                    <div className="relative md:col-span-2">
                        <label htmlFor="q" className="text-sm font-medium text-slate-300">Buscar</label>
                        <FaSearch className="absolute left-3 top-[2.9rem] text-slate-400" />
                        <input id="q" name="q" value={filtros.q} onChange={cambiar} placeholder="Número, proveedor, solicitante, N° de factura..." className={`${claseInput} pl-9`} />
                    </div>
                    <div>
                        <label htmlFor="estado" className="text-sm font-medium text-slate-300">Estado</label>
                        <select id="estado" name="estado" value={filtros.estado} onChange={cambiar} className={claseInput}>
                            <option value="">Todos</option>
                            {Object.entries(INFO_ESTADO_EXPEDIENTE).map(([k, v]) => <option key={k} value={k}>{v.etiqueta}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 text-sm text-slate-300">
                    <span>{lista ? `${lista.length} ${lista.length === 1 ? "anticipo" : "anticipos"}` : "Buscando..."}</span>
                    {hayFiltros && <button onClick={() => setFiltros(FILTROS_VACIOS)} className="text-blue-400 hover:underline">Limpiar filtros</button>}
                </div>

                {!lista ? (
                    <Cargando />
                ) : lista.length === 0 ? (
                    <p className="p-10 text-center text-slate-300">
                        {hayFiltros ? "Ningún anticipo coincide con los filtros." : "Aún no hay anticipos. Aparecen aquí cuando se envía una petición con término Anticipo; se pueden compensar cuando queda Pagada."}
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-white/5 text-left text-slate-300">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Número</th>
                                    <th className="px-6 py-4 font-semibold">Fecha de pago</th>
                                    <th className="px-6 py-4 font-semibold">Solicitante</th>
                                    <th className="px-6 py-4 font-semibold">Proveedor</th>
                                    <th className="px-6 py-4 font-semibold">Tipo</th>
                                    <th className="px-6 py-4 text-right font-semibold">Anticipo</th>
                                    <th className="px-6 py-4 text-right font-semibold">Compensado</th>
                                    <th className="px-6 py-4 text-right font-semibold">Saldo</th>
                                    <th className="px-6 py-4 font-semibold">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {lista.map((e) => (
                                    <tr
                                        key={e.id}
                                        tabIndex={0}
                                        onClick={() => router.push(`/expediente/${e.id}`)}
                                        onKeyDown={(ev) => ev.key === "Enter" && router.push(`/expediente/${e.id}`)}
                                        className="cursor-pointer hover:bg-white/5 focus:bg-white/10"
                                    >
                                        <td className="whitespace-nowrap px-6 py-4 font-semibold text-white">{e.numero}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-slate-400">{e.pagada ? formatoFecha(e.fechaPago) : <span className="text-sky-300">Sin pagar</span>}</td>
                                        <td className="px-6 py-4 text-slate-200">{e.solicitanteNombre}</td>
                                        <td className="px-6 py-4 text-slate-200">{e.proveedorNombre}</td>
                                        <td className="px-6 py-4"><TipoBadge tipo={e.tipo} /></td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right text-slate-200">{formatoMonto(e.montoAnticipo, e.moneda)}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right text-slate-300">{formatoMonto(e.compensado, e.moneda)}</td>
                                        <td className={`whitespace-nowrap px-6 py-4 text-right font-semibold ${e.saldo > 0 ? "text-orange-200" : e.excedente > 0 ? "text-violet-300" : "text-white"}`}>
                                            {!e.pagada ? <span className="font-normal text-slate-500">—</span> : e.excedente > 0 ? `+${formatoMonto(e.excedente, e.moneda)}` : formatoMonto(e.saldo, e.moneda)}
                                        </td>
                                        <td className="px-6 py-4"><EstadoExpedienteBadge estado={e.estado} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
