"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FaPlus, FaSearch, FaFileExcel, FaCheckDouble } from "react-icons/fa";

import Cargando from "../../../components/ui/Cargando";
import Seccion from "../../../components/ui/Seccion";
import FacturaFormModal from "../../../components/facturas/FacturaFormModal";
import DetalleFacturaModal from "../../../components/facturas/DetalleFacturaModal";
import TablaFacturas from "../../../components/facturas/TablaFacturas";
import { confirmarEliminacion } from "../../../components/facturas/eliminarFactura";
import { claseInput, botonExito } from "../../../components/ui/estilos";
import { alertaError, confirmar, toastExito } from "../../../components/ui/alertas";

import { useAuth } from "../../../context/AuthContext";
import { obtenerCatalogo } from "../../../services/catalogos.service";
import { obtenerFacturas, recibirFacturas, exportarFacturas } from "../../../services/facturas.service";
import { ESTADOS_FACTURA, TIPOS_FACTURA, totales } from "../../../utils/facturas";
import { ROLES } from "../../../utils/roles";
import { descargarBlob } from "../../../utils/descargas";
import { formatoMonto, mensajeError } from "../../../utils/formato";

export default function FacturasPage() {
    const { userData, userRole } = useAuth();
    const esCompras = !!userData?.esCompras;
    const esRevisor = [ROLES.ADMIN, ROLES.CONTABILIDAD].includes(userRole);
    const tieneAcceso = esCompras || esRevisor;

    const [filtros, setFiltros] = useState(() => ({ q: "", estado: esRevisor && !esCompras ? "ENTREGADA" : "", tipo: "", desde: "", hasta: "" }));
    const [facturas, setFacturas] = useState(null);
    const [proveedores, setProveedores] = useState([]);
    const [seleccion, setSeleccion] = useState(new Set());
    const [formulario, setFormulario] = useState(null); // { factura?: {...}, plantilla?: {...} }
    const [detalleId, setDetalleId] = useState(null);
    const [ocupado, setOcupado] = useState(false);

    const cargar = useCallback(async () => {
        try {
            const { data } = await obtenerFacturas(filtros);
            setFacturas(data.data);
            setSeleccion(new Set());
        } catch (e) {
            setFacturas([]);
            alertaError(mensajeError(e, "No se pudieron cargar las facturas."));
        }
    }, [filtros]);

    useEffect(() => {
        if (!tieneAcceso) return;
        setFacturas(null);
        const t = setTimeout(cargar, filtros.q ? 350 : 0);
        return () => clearTimeout(t);
    }, [cargar, filtros.q, tieneAcceso]);

    // El catálogo de proveedores solo lo necesita Compras (formulario).
    useEffect(() => {
        if (!esCompras) return;
        obtenerCatalogo("proveedores", true)
            .then(({ data }) => setProveedores(data.data))
            .catch((e) => alertaError(mensajeError(e, "No se pudieron cargar los proveedores.")));
    }, [esCompras]);

    const cambiar = (e) => setFiltros((f) => ({ ...f, [e.target.name]: e.target.value }));

    const resumen = useMemo(() => {
        const lista = facturas || [];
        return {
            ...totales(lista),
            pendientes: lista.filter((f) => f.estado === "ENTREGADA").length,
            devueltas: lista.filter((f) => f.estado === "DEVUELTA").length
        };
    }, [facturas]);

    const alternar = (id) => setSeleccion((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const alternarTodas = (pendientes) =>
        setSeleccion((s) => (pendientes.every((f) => s.has(f.id)) ? new Set() : new Set(pendientes.map((f) => f.id))));

    const eliminar = async (f) => {
        if (await confirmarEliminacion(f)) cargar();
    };

    const recibirSeleccion = async () => {
        const ok = await confirmar({ titulo: `¿Recibir ${seleccion.size} factura(s)?`, texto: "Quedarán como recibidas por Contabilidad.", confirmar: "Recibir" });
        if (!ok) return;
        setOcupado(true);
        try {
            const { data } = await recibirFacturas([...seleccion]);
            toastExito(data.message);
            await cargar();
        } catch (e) {
            alertaError(mensajeError(e, "No se pudieron recibir las facturas."));
        } finally {
            setOcupado(false);
        }
    };

    const exportar = async () => {
        setOcupado(true);
        try {
            descargarBlob(await exportarFacturas(filtros), "entrega-facturas.xlsx");
        } catch (e) {
            alertaError("No se pudo generar el Excel.");
        } finally {
            setOcupado(false);
        }
    };

    if (!tieneAcceso) {
        return <Seccion><p className="text-slate-300">La entrega de facturas es solo para Compras y Contabilidad.</p></Seccion>;
    }

    const detalle = facturas?.find((f) => f.id === detalleId) || null;

    return (
        <div className="space-y-6">
            {/* Resumen */}
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {[
                    { t: "Crédito", v: formatoMonto(resumen.credito.total), s: `${resumen.credito.n} factura(s)` },
                    { t: "Contado", v: formatoMonto(resumen.contado.total), s: `${resumen.contado.n} factura(s)` },
                    { t: "Pendientes de recibir", v: resumen.pendientes, s: "en esta lista" },
                    { t: "Devueltas", v: resumen.devueltas, s: "por corregir" }
                ].map((c) => (
                    <div key={c.t} className="rounded-2xl bg-slate-800/35 p-5 ring-1 ring-white/15 backdrop-blur-xl">
                        <p className="text-sm text-slate-400">{c.t}</p>
                        <p className="mt-1 break-words text-xl font-bold text-white sm:text-2xl">{facturas ? c.v : "—"}</p>
                        <p className="text-xs text-slate-400">{c.s}</p>
                    </div>
                ))}
            </div>

            <div className="rounded-2xl bg-slate-800/35 shadow-lg ring-1 ring-white/15 backdrop-blur-xl">
                {/* Filtros y acciones */}
                <div className="flex flex-col gap-4 border-b p-6 xl:flex-row xl:items-end xl:justify-between">
                    <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        <div className="relative lg:col-span-2">
                            <label htmlFor="q" className="text-sm font-medium text-slate-300">Buscar</label>
                            <FaSearch className="absolute left-3 top-[2.9rem] text-slate-400" />
                            <input id="q" name="q" value={filtros.q} onChange={cambiar} placeholder="N° factura, proveedor, código SAP..." className={`${claseInput} pl-9`} />
                        </div>
                        <div>
                            <label htmlFor="estado" className="text-sm font-medium text-slate-300">Estado</label>
                            <select id="estado" name="estado" value={filtros.estado} onChange={cambiar} className={claseInput}>
                                <option value="">Todos</option>
                                {Object.entries(ESTADOS_FACTURA).map(([k, v]) => <option key={k} value={k}>{v.etiqueta}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="tipo" className="text-sm font-medium text-slate-300">Tipo</label>
                            <select id="tipo" name="tipo" value={filtros.tipo} onChange={cambiar} className={claseInput}>
                                <option value="">Todos</option>
                                {Object.entries(TIPOS_FACTURA).map(([k, v]) => <option key={k} value={k}>{v.etiqueta}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label htmlFor="desde" className="text-sm font-medium text-slate-300">Desde</label>
                                <input id="desde" name="desde" type="date" value={filtros.desde} onChange={cambiar} className={`${claseInput} px-2`} />
                            </div>
                            <div>
                                <label htmlFor="hasta" className="text-sm font-medium text-slate-300">Hasta</label>
                                <input id="hasta" name="hasta" type="date" value={filtros.hasta} onChange={cambiar} className={`${claseInput} px-2`} />
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button type="button" onClick={exportar} disabled={ocupado || !facturas?.length} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 font-semibold text-slate-100 ring-1 ring-white/15 transition hover:bg-white/20 disabled:opacity-50">
                            <FaFileExcel className="text-emerald-400" /> Excel
                        </button>
                        {esCompras && (
                            <button type="button" onClick={() => setFormulario({ factura: null })} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-900/50 transition hover:from-blue-400 hover:to-blue-600">
                                <FaPlus /> Añadir factura
                            </button>
                        )}
                    </div>
                </div>

                {esRevisor && seleccion.size > 0 && (
                    <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-emerald-500/10 px-6 py-3">
                        <span className="text-sm text-emerald-200">{seleccion.size} seleccionada(s)</span>
                        <button type="button" onClick={recibirSeleccion} disabled={ocupado} className={`${botonExito} inline-flex items-center gap-2 !py-2`}>
                            <FaCheckDouble /> Recibir seleccionadas
                        </button>
                    </div>
                )}

                {facturas === null ? (
                    <Cargando />
                ) : facturas.length === 0 ? (
                    <p className="p-10 text-center text-slate-300">No hay facturas con estos filtros.</p>
                ) : (
                    <TablaFacturas
                        facturas={facturas}
                        onAbrir={(f) => setDetalleId(f.id)}
                        seleccionable={esRevisor}
                        seleccion={seleccion}
                        onAlternar={alternar}
                        onAlternarTodas={alternarTodas}
                        onEditar={esCompras ? (f) => setFormulario({ factura: f }) : undefined}
                        onEliminar={esCompras ? eliminar : undefined}
                        onDuplicar={esCompras ? (f) => setFormulario({ plantilla: f }) : undefined}
                    />
                )}
            </div>

            <FacturaFormModal
                abierto={!!formulario}
                factura={formulario?.factura || null}
                plantilla={formulario?.plantilla || null}
                proveedores={proveedores}
                onCerrar={() => setFormulario(null)}
                onGuardada={() => { setFormulario(null); cargar(); }}
            />

            <DetalleFacturaModal
                factura={formulario ? null : detalle}
                puedeEditar={esCompras}
                puedeRevisar={esRevisor}
                onCerrar={() => setDetalleId(null)}
                onEditar={(f) => setFormulario({ factura: f })}
                onDuplicar={(f) => { setDetalleId(null); setFormulario({ plantilla: f }); }}
                onCambio={async () => { await cargar(); setDetalleId(null); }}
            />
        </div>
    );
}
