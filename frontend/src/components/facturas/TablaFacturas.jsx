"use client";

import { Fragment, useMemo, useRef, useState } from "react";
import { FaSort, FaSortUp, FaSortDown, FaLayerGroup, FaChevronDown, FaChevronRight, FaEdit, FaTrash, FaLock, FaCopy } from "react-icons/fa";

import { EstadoFacturaBadge, TipoFacturaBadge } from "./EtiquetaFactura";
import { ESTADOS_FACTURA, TIPOS_FACTURA, diaSV, fechaLarga, totales } from "../../utils/facturas";
import { formatoMonto, formatoFecha, formatoFechaHora } from "../../utils/formato";

const comparar = (a, b) => String(a ?? "").localeCompare(String(b ?? ""), "es", { numeric: true, sensitivity: "base" });

// Columnas: "orden" da el valor para ordenar; "grupo" (si existe) da la
// clave y la etiqueta para agrupar con doble clic.
const COLUMNAS = [
    {
        id: "tipo", titulo: "Tipo",
        orden: (f) => TIPOS_FACTURA[f.tipo]?.etiqueta,
        grupo: (f) => ({ clave: f.tipo, etiqueta: <TipoFacturaBadge tipo={f.tipo} /> }),
        celda: (f) => <TipoFacturaBadge tipo={f.tipo} />
    },
    {
        id: "numeroFactura", titulo: "N° factura",
        orden: (f) => f.numeroFactura,
        celda: (f) => <span className={`whitespace-nowrap font-semibold ${f.estado === "ELIMINADA" ? "text-slate-500 line-through" : "text-white"}`}>{f.numeroFactura}</span>
    },
    {
        id: "proveedor", titulo: "Proveedor",
        orden: (f) => f.proveedorNombre,
        grupo: (f) => ({ clave: f.proveedorId, etiqueta: f.proveedorNombre }),
        celda: (f) => (
            <span className="text-slate-200">
                {f.proveedorNombre}
                {f.codigoSAP && <span className="block text-xs text-slate-400">SAP {f.codigoSAP}</span>}
            </span>
        )
    },
    {
        id: "montoOC", titulo: "Monto OC", derecha: true,
        orden: (f) => Number(f.montoOC),
        celda: (f) => <span className={`whitespace-nowrap font-semibold ${f.estado === "ELIMINADA" ? "text-slate-500 line-through" : "text-white"}`}>{formatoMonto(f.montoOC)}</span>
    },
    {
        id: "fechaFactura", titulo: "Fecha factura",
        orden: (f) => f.fechaFactura,
        grupo: (f) => ({ clave: f.fechaFactura, etiqueta: formatoFecha(f.fechaFactura) }),
        celda: (f) => <span className="whitespace-nowrap text-slate-300">{formatoFecha(f.fechaFactura)}</span>
    },
    {
        id: "fechaEntrega", titulo: "Entregada",
        orden: (f) => f.fechaEntrega,
        grupo: (f) => ({ clave: diaSV(f.fechaEntrega), etiqueta: fechaLarga(diaSV(f.fechaEntrega)) }),
        celda: (f) => (
            <span className="text-slate-300">
                <span className="block whitespace-nowrap">{formatoFechaHora(f.fechaEntrega)}</span>
                <span className="block text-xs text-slate-400">{f.entregadoPorNombre}</span>
            </span>
        )
    },
    {
        id: "estado", titulo: "Estado",
        orden: (f) => Object.keys(ESTADOS_FACTURA).indexOf(f.estado),
        grupo: (f) => ({ clave: f.estado, etiqueta: <EstadoFacturaBadge estado={f.estado} /> }),
        celda: (f) => <EstadoFacturaBadge estado={f.estado} />
    }
];

const PUEDE_MODIFICARSE = ["ENTREGADA", "DEVUELTA"];

// Tabla de facturas.
//   Clic en un encabezado: ordena (asc → desc).  Doble clic: agrupa por esa
//   columna (otro doble clic quita el grupo). Clic en un grupo: lo pliega.
//   seleccionable: casillas en las pendientes (Contabilidad).
//   onEditar / onEliminar: botones por fila (Compras), solo antes de recibir.
//   onDuplicar: crea una nueva con los mismos datos (cualquier estado).
export default function TablaFacturas({ facturas, onAbrir, seleccionable = false, seleccion, onAlternar, onAlternarTodas, onEditar, onEliminar, onDuplicar, ordenInicial = { col: "fechaEntrega", dir: "desc" }, ocultar = [] }) {
    const [orden, setOrden] = useState(ordenInicial);
    const [grupo, setGrupo] = useState(null);
    const [plegados, setPlegados] = useState(new Set());
    const temporizador = useRef(null);

    const columnas = COLUMNAS.filter((c) => !ocultar.includes(c.id));
    const conAcciones = !!(onEditar || onEliminar || onDuplicar);
    const totalColumnas = columnas.length + (seleccionable ? 1 : 0) + (conAcciones ? 1 : 0);

    // El doble clic dispara antes dos clics: se espera un momento para no
    // ordenar cuando en realidad se quería agrupar.
    const alClic = (col) => {
        clearTimeout(temporizador.current);
        temporizador.current = setTimeout(() => {
            setOrden((o) => ({ col: col.id, dir: o.col === col.id && o.dir === "asc" ? "desc" : "asc" }));
        }, 230);
    };
    const alDobleClic = (col) => {
        clearTimeout(temporizador.current);
        if (!col.grupo) return;
        setGrupo((g) => (g === col.id ? null : col.id));
        setPlegados(new Set());
    };

    const ordenadas = useMemo(() => {
        const col = COLUMNAS.find((c) => c.id === orden.col) || COLUMNAS[0];
        const signo = orden.dir === "asc" ? 1 : -1;
        return [...facturas].sort((a, b) => {
            const va = col.orden(a), vb = col.orden(b);
            return signo * (typeof va === "number" && typeof vb === "number" ? va - vb : comparar(va, vb));
        });
    }, [facturas, orden]);

    // Grupos en el orden en que aparecen (respetan el orden elegido).
    const grupos = useMemo(() => {
        const col = COLUMNAS.find((c) => c.id === grupo);
        if (!col) return null;
        const mapa = new Map();
        ordenadas.forEach((f) => {
            const { clave, etiqueta } = col.grupo(f);
            if (!mapa.has(clave)) mapa.set(clave, { clave, etiqueta, filas: [] });
            mapa.get(clave).filas.push(f);
        });
        return [...mapa.values()];
    }, [ordenadas, grupo]);

    const pendientes = facturas.filter((f) => f.estado === "ENTREGADA");
    const todasMarcadas = pendientes.length > 0 && pendientes.every((f) => seleccion?.has(f.id));
    const plegar = (clave) => setPlegados((s) => { const n = new Set(s); n.has(clave) ? n.delete(clave) : n.add(clave); return n; });
    const tot = totales(facturas);

    const fila = (f) => (
        <tr
            key={f.id}
            tabIndex={0}
            onClick={() => onAbrir?.(f)}
            onKeyDown={(e) => e.key === "Enter" && onAbrir?.(f)}
            className={`cursor-pointer hover:bg-white/5 focus:bg-white/10 ${f.estado === "ELIMINADA" ? "opacity-60" : ""}`}
        >
            {seleccionable && (
                <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    {f.estado === "ENTREGADA" && (
                        <input type="checkbox" aria-label={`Seleccionar ${f.numeroFactura}`} checked={seleccion?.has(f.id) || false} onChange={() => onAlternar(f.id)} className="h-4 w-4 accent-emerald-500" />
                    )}
                </td>
            )}
            {columnas.map((c) => (
                <td key={c.id} className={`px-4 py-4 ${c.derecha ? "text-right" : ""}`}>{c.celda(f)}</td>
            ))}
            {conAcciones && (
                <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                    {onDuplicar && (
                        <button type="button" onClick={() => onDuplicar(f)} title="Duplicar (sin N° de factura)" aria-label={`Duplicar ${f.numeroFactura}`} className="rounded-lg p-2 text-slate-300 hover:bg-blue-500/20 hover:text-blue-200">
                            <FaCopy />
                        </button>
                    )}
                    {PUEDE_MODIFICARSE.includes(f.estado) ? (
                        <>
                            {onEditar && (
                                <button type="button" onClick={() => onEditar(f)} title={f.estado === "DEVUELTA" ? "Corregir y reenviar" : "Corregir"} aria-label={`Corregir ${f.numeroFactura}`} className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white">
                                    <FaEdit />
                                </button>
                            )}
                            {onEliminar && (
                                <button type="button" onClick={() => onEliminar(f)} title="Eliminar" aria-label={`Eliminar ${f.numeroFactura}`} className="rounded-lg p-2 text-slate-300 hover:bg-red-500/20 hover:text-red-300">
                                    <FaTrash />
                                </button>
                            )}
                        </>
                    ) : f.estado === "RECIBIDA" && (onEditar || onEliminar) ? (
                        <span className="p-2 text-slate-500" title="Ya recibida: no se puede modificar ni eliminar"><FaLock /></span>
                    ) : null}
                    </div>
                </td>
            )}
        </tr>
    );

    return (
        <div className="overflow-x-auto">
            <p className="px-6 pt-3 text-xs text-slate-400">
                Clic en un encabezado para ordenar · Doble clic para agrupar
                {grupo && (
                    <button type="button" onClick={() => setGrupo(null)} className="ml-3 rounded-full bg-blue-500/20 px-3 py-0.5 text-blue-200 hover:bg-blue-500/30">
                        Agrupado por {COLUMNAS.find((c) => c.id === grupo)?.titulo} ✕
                    </button>
                )}
            </p>
            <table className="mt-2 w-full text-sm">
                <thead className="bg-white/5 text-left text-slate-300">
                    <tr>
                        {seleccionable && (
                            <th className="w-10 px-4 py-4">
                                <input type="checkbox" aria-label="Seleccionar todas las pendientes" checked={todasMarcadas} onChange={() => onAlternarTodas(pendientes)} disabled={!pendientes.length} className="h-4 w-4 accent-emerald-500" />
                            </th>
                        )}
                        {columnas.map((c) => {
                            const activa = orden.col === c.id;
                            const Icono = activa ? (orden.dir === "asc" ? FaSortUp : FaSortDown) : FaSort;
                            return (
                                <th
                                    key={c.id}
                                    onClick={() => alClic(c)}
                                    onDoubleClick={() => alDobleClic(c)}
                                    aria-sort={activa ? (orden.dir === "asc" ? "ascending" : "descending") : "none"}
                                    title={c.grupo ? "Clic: ordenar · Doble clic: agrupar" : "Clic: ordenar"}
                                    className={`cursor-pointer select-none px-4 py-4 font-semibold hover:text-white ${c.derecha ? "text-right" : ""} ${grupo === c.id ? "text-blue-300" : ""}`}
                                >
                                    <span className={`inline-flex items-center gap-1.5 ${c.derecha ? "flex-row-reverse" : ""}`}>
                                        {c.titulo}
                                        {grupo === c.id ? <FaLayerGroup className="text-xs" /> : <Icono className={`text-xs ${activa ? "text-blue-300" : "text-slate-500"}`} />}
                                    </span>
                                </th>
                            );
                        })}
                        {conAcciones && <th className="px-4 py-4 text-right font-semibold">Acciones</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                    {grupos
                        ? grupos.map((g) => {
                              const t = totales(g.filas);
                              const plegado = plegados.has(g.clave);
                              return (
                                  <Fragment key={g.clave || "sin"}>
                                      <tr onClick={() => plegar(g.clave)} className="cursor-pointer bg-blue-500/10 hover:bg-blue-500/15">
                                          <td colSpan={totalColumnas} className="px-4 py-3">
                                              <div className="flex flex-wrap items-center gap-3">
                                                  {plegado ? <FaChevronRight className="text-slate-400" /> : <FaChevronDown className="text-slate-400" />}
                                                  <span className="font-semibold capitalize text-white">{g.etiqueta || "—"}</span>
                                                  <span className="text-xs text-slate-300">{g.filas.length} factura(s)</span>
                                                  <span className="ml-auto text-sm font-semibold text-white">{formatoMonto(t.total)}</span>
                                              </div>
                                          </td>
                                      </tr>
                                      {!plegado && g.filas.map(fila)}
                                  </Fragment>
                              );
                          })
                        : ordenadas.map(fila)}
                </tbody>
                <tfoot className="bg-white/5 text-slate-200">
                    <tr>
                        <td colSpan={totalColumnas} className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                                <span className="font-semibold">Total ({tot.n})</span>
                                <span className="text-sm text-slate-300">Crédito: {formatoMonto(tot.credito.total)}</span>
                                <span className="text-sm text-slate-300">Contado: {formatoMonto(tot.contado.total)}</span>
                                <span className="ml-auto font-bold text-white">{formatoMonto(tot.total)}</span>
                            </div>
                            {facturas.length > tot.n && <p className="mt-1 text-xs text-slate-400">Las eliminadas no suman en los totales.</p>}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
