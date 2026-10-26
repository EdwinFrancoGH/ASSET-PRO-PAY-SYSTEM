"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { FaChevronDown, FaChevronRight, FaFileExcel, FaSearch } from "react-icons/fa";

import Cargando from "../../../components/ui/Cargando";
import Seccion from "../../../components/ui/Seccion";
import TablaFacturas from "../../../components/facturas/TablaFacturas";
import DetalleFacturaModal from "../../../components/facturas/DetalleFacturaModal";
import { claseInput } from "../../../components/ui/estilos";
import { alertaError } from "../../../components/ui/alertas";

import { useAuth } from "../../../context/AuthContext";
import { obtenerFacturas, exportarFacturas } from "../../../services/facturas.service";
import { diaSV, fechaLarga, totales } from "../../../utils/facturas";
import { ROLES } from "../../../utils/roles";
import { descargarBlob } from "../../../utils/descargas";
import { formatoMonto, mensajeError } from "../../../utils/formato";

// Por qué fecha se agrupan las facturas recibidas.
const AGRUPAR = {
    entrega: { etiqueta: "Fecha de entrega", campo: "fechaEntrega", filtro: "diaEntrega" },
    recepcion: { etiqueta: "Fecha de recepción", campo: "fechaRecepcion", filtro: "diaRecepcion" }
};

// Recepciones: facturas ya recibidas por Contabilidad, agrupadas por día.
// Cada fila es un día; al hacer clic muestra solo las facturas de ese día.
export default function RecepcionesPage() {
    const { userData, userRole } = useAuth();
    const tieneAcceso = !!userData?.esCompras || [ROLES.ADMIN, ROLES.CONTABILIDAD].includes(userRole);

    const [por, setPor] = useState("entrega");
    const [filtros, setFiltros] = useState({ q: "", desde: "", hasta: "" });
    const [facturas, setFacturas] = useState(null);
    const [abierto, setAbierto] = useState(null); // día desplegado
    const [detalle, setDetalle] = useState(null);
    const [descargando, setDescargando] = useState(null);

    const cargar = useCallback(async () => {
        try {
            const { data } = await obtenerFacturas({ estado: "RECIBIDA", q: filtros.q });
            setFacturas(data.data);
        } catch (e) {
            setFacturas([]);
            alertaError(mensajeError(e, "No se pudieron cargar las recepciones."));
        }
    }, [filtros.q]);

    useEffect(() => {
        if (!tieneAcceso) return;
        setFacturas(null);
        const t = setTimeout(cargar, filtros.q ? 350 : 0);
        return () => clearTimeout(t);
    }, [cargar, filtros.q, tieneAcceso]);

    const dias = useMemo(() => {
        if (!facturas) return null;
        const campo = AGRUPAR[por].campo;
        const mapa = new Map();
        facturas.forEach((f) => {
            const dia = diaSV(f[campo]);
            if (!dia) return;
            if (filtros.desde && dia < filtros.desde) return;
            if (filtros.hasta && dia > filtros.hasta) return;
            if (!mapa.has(dia)) mapa.set(dia, []);
            mapa.get(dia).push(f);
        });
        return [...mapa.entries()]
            .sort(([a], [b]) => b.localeCompare(a)) // más reciente primero
            .map(([dia, lista]) => ({ dia, facturas: lista, ...totales(lista) }));
    }, [facturas, por, filtros.desde, filtros.hasta]);

    const general = useMemo(() => totales((dias || []).flatMap((d) => d.facturas)), [dias]);

    const cambiar = (e) => setFiltros((f) => ({ ...f, [e.target.name]: e.target.value }));

    const excelDia = async (e, dia) => {
        e.stopPropagation();
        setDescargando(dia);
        try {
            descargarBlob(await exportarFacturas({ estado: "RECIBIDA", q: filtros.q, [AGRUPAR[por].filtro]: dia }), `recepcion-${dia}.xlsx`);
        } catch {
            alertaError("No se pudo generar el Excel.");
        } finally {
            setDescargando(null);
        }
    };

    if (!tieneAcceso) {
        return <Seccion><p className="text-slate-300">Las recepciones son solo para Compras y Contabilidad.</p></Seccion>;
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                    { t: "Días con recepción", v: dias?.length ?? "—" },
                    { t: "Facturas recibidas", v: dias ? general.n : "—" },
                    { t: "Crédito", v: dias ? formatoMonto(general.credito.total) : "—" },
                    { t: "Contado", v: dias ? formatoMonto(general.contado.total) : "—" }
                ].map((c) => (
                    <div key={c.t} className="rounded-2xl bg-slate-800/35 p-5 ring-1 ring-white/15 backdrop-blur-xl">
                        <p className="text-sm text-slate-400">{c.t}</p>
                        <p className="mt-1 break-words text-xl font-bold text-white sm:text-2xl">{c.v}</p>
                    </div>
                ))}
            </div>

            <div className="rounded-2xl bg-slate-800/35 shadow-lg ring-1 ring-white/15 backdrop-blur-xl">
                <div className="grid grid-cols-1 gap-4 border-b p-6 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="relative lg:col-span-2">
                        <label htmlFor="q" className="text-sm font-medium text-slate-300">Buscar</label>
                        <FaSearch className="absolute left-3 top-[2.9rem] text-slate-400" />
                        <input id="q" name="q" value={filtros.q} onChange={cambiar} placeholder="N° factura, proveedor, código SAP..." className={`${claseInput} pl-9`} />
                    </div>
                    <div>
                        <label htmlFor="por" className="text-sm font-medium text-slate-300">Agrupar por</label>
                        <select id="por" value={por} onChange={(e) => { setPor(e.target.value); setAbierto(null); }} className={claseInput}>
                            {Object.entries(AGRUPAR).map(([k, v]) => <option key={k} value={k}>{v.etiqueta}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="desde" className="text-sm font-medium text-slate-300">Desde</label>
                        <input id="desde" name="desde" type="date" value={filtros.desde} onChange={cambiar} className={claseInput} />
                    </div>
                    <div>
                        <label htmlFor="hasta" className="text-sm font-medium text-slate-300">Hasta</label>
                        <input id="hasta" name="hasta" type="date" value={filtros.hasta} onChange={cambiar} className={claseInput} />
                    </div>
                </div>

                {dias === null ? (
                    <Cargando />
                ) : dias.length === 0 ? (
                    <p className="p-10 text-center text-slate-300">No hay facturas recibidas con estos filtros.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-white/5 text-left text-slate-300">
                                <tr>
                                    <th className="w-12 px-4 py-4 font-semibold">#</th>
                                    <th className="px-4 py-4 font-semibold">{AGRUPAR[por].etiqueta}</th>
                                    <th className="px-4 py-4 text-right font-semibold">Facturas</th>
                                    <th className="px-4 py-4 text-right font-semibold">Crédito</th>
                                    <th className="px-4 py-4 text-right font-semibold">Contado</th>
                                    <th className="px-4 py-4 text-right font-semibold">Total</th>
                                    <th className="w-24 px-4 py-4" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {dias.map((d, i) => {
                                    const desplegado = abierto === d.dia;
                                    return (
                                        <Fragment key={d.dia}>
                                            <tr
                                                tabIndex={0}
                                                onClick={() => setAbierto(desplegado ? null : d.dia)}
                                                onKeyDown={(e) => e.key === "Enter" && setAbierto(desplegado ? null : d.dia)}
                                                aria-expanded={desplegado}
                                                className={`cursor-pointer hover:bg-white/5 focus:bg-white/10 ${desplegado ? "bg-blue-500/10" : ""}`}
                                            >
                                                <td className="px-4 py-4 text-slate-400">{i + 1}</td>
                                                <td className="px-4 py-4">
                                                    <span className="inline-flex items-center gap-2 font-semibold capitalize text-white">
                                                        {desplegado ? <FaChevronDown className="text-blue-300" /> : <FaChevronRight className="text-slate-400" />}
                                                        {fechaLarga(d.dia)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-4 text-right text-slate-200">{d.n}</td>
                                                <td className="whitespace-nowrap px-4 py-4 text-right text-slate-300">{formatoMonto(d.credito.total)} <span className="text-xs text-slate-500">({d.credito.n})</span></td>
                                                <td className="whitespace-nowrap px-4 py-4 text-right text-slate-300">{formatoMonto(d.contado.total)} <span className="text-xs text-slate-500">({d.contado.n})</span></td>
                                                <td className="whitespace-nowrap px-4 py-4 text-right font-bold text-white">{formatoMonto(d.total)}</td>
                                                <td className="px-4 py-4 text-right">
                                                    <button type="button" onClick={(e) => excelDia(e, d.dia)} disabled={descargando === d.dia} title="Excel de este día" aria-label={`Excel del ${d.dia}`} className="rounded-lg p-2 text-emerald-400 hover:bg-white/10 disabled:opacity-50">
                                                        <FaFileExcel />
                                                    </button>
                                                </td>
                                            </tr>
                                            {desplegado && (
                                                <tr>
                                                    <td colSpan={7} className="bg-slate-950/30 p-0">
                                                        <TablaFacturas facturas={d.facturas} onAbrir={setDetalle} ordenInicial={{ col: "proveedor", dir: "asc" }} ocultar={["estado"]} />
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-white/5 font-semibold text-slate-200">
                                <tr>
                                    <td colSpan={2} className="px-4 py-3">Total</td>
                                    <td className="px-4 py-3 text-right">{general.n}</td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right">{formatoMonto(general.credito.total)}</td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right">{formatoMonto(general.contado.total)}</td>
                                    <td className="whitespace-nowrap px-4 py-3 text-right font-bold text-white">{formatoMonto(general.total)}</td>
                                    <td />
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            <DetalleFacturaModal factura={detalle} puedeEditar={false} puedeRevisar={false} onCerrar={() => setDetalle(null)} />
        </div>
    );
}
