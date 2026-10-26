"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { FaSearch, FaTimes } from "react-icons/fa";
import { claseInput } from "../ui/estilos";
import TipoBadge from "./TipoBadge";
import { origenDeProveedor } from "../../utils/bancario";

const MAX_RESULTADOS = 50;

// Minúsculas y sin tildes, para que "vidri" encuentre "Almacenes Vidrí".
const normalizar = (v) =>
    String(v || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

// Campo de búsqueda de proveedor (autocompletar). Busca por nombre o
// código SAP en lugar de mostrar una lista de cientos de opciones.
//   proveedores:  lista permitida para el usuario
//   seleccionado: proveedor elegido (se muestra aunque no esté en la lista)
//   mostrarTipo:  muestra la etiqueta Local/Exterior (usuarios de Compras)
// onNuevo(texto): si se pasa, la lista ofrece "Registrar proveedor nuevo".
export default function BuscadorProveedor({ id = "proveedorId", proveedores, seleccionado, onSeleccionar, mostrarTipo = false, error = false, onNuevo }) {
    const [texto, setTexto] = useState("");
    const [abierto, setAbierto] = useState(false);
    const [activo, setActivo] = useState(0);
    const contenedor = useRef(null);
    const lista = useRef(null);
    const idLista = useId();

    // Cuando no se está escribiendo, el campo muestra el proveedor elegido.
    useEffect(() => {
        if (!abierto) setTexto(seleccionado?.nombre || "");
    }, [seleccionado, abierto]);

    // Cierra al hacer clic fuera.
    useEffect(() => {
        const alClic = (e) => {
            if (contenedor.current && !contenedor.current.contains(e.target)) setAbierto(false);
        };
        document.addEventListener("mousedown", alClic);
        return () => document.removeEventListener("mousedown", alClic);
    }, []);

    const busqueda = abierto && texto !== (seleccionado?.nombre || "") ? normalizar(texto.trim()) : "";

    const { resultados, total } = useMemo(() => {
        const coinciden = busqueda
            ? proveedores.filter((p) => normalizar(p.nombre).includes(busqueda) || normalizar(p.codigoSAP).includes(busqueda))
            : proveedores;
        // Primero los que empiezan con lo escrito.
        const ordenados = busqueda
            ? [...coinciden].sort((a, b) => Number(!normalizar(a.nombre).startsWith(busqueda)) - Number(!normalizar(b.nombre).startsWith(busqueda)))
            : coinciden;
        return { resultados: ordenados.slice(0, MAX_RESULTADOS), total: coinciden.length };
    }, [proveedores, busqueda]);

    useEffect(() => setActivo(0), [busqueda]);

    // Mantiene visible la opción marcada con el teclado.
    useEffect(() => {
        lista.current?.querySelector(`[data-indice="${activo}"]`)?.scrollIntoView({ block: "nearest" });
    }, [activo]);

    const elegir = (p) => {
        onSeleccionar(p.id);
        setTexto(p.nombre);
        setAbierto(false);
    };

    const limpiar = () => {
        onSeleccionar("");
        setTexto("");
        setAbierto(true);
        contenedor.current?.querySelector("input")?.focus();
    };

    const alTeclear = (e) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!abierto) return setAbierto(true);
            setActivo((i) => Math.min(i + 1, resultados.length - 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActivo((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
            if (abierto && resultados[activo]) {
                e.preventDefault();
                elegir(resultados[activo]);
            }
        } else if (e.key === "Escape") {
            setAbierto(false);
        }
    };

    return (
        <div ref={contenedor} className="relative">
            <FaSearch className="pointer-events-none absolute left-3 top-[1.55rem] text-slate-400" aria-hidden />
            <input
                id={id}
                name="proveedorId"
                type="text"
                role="combobox"
                aria-expanded={abierto}
                aria-controls={idLista}
                aria-autocomplete="list"
                aria-activedescendant={abierto && resultados[activo] ? `${idLista}-${activo}` : undefined}
                autoComplete="off"
                placeholder="Escribe el nombre o código SAP..."
                value={texto}
                onChange={(e) => { setTexto(e.target.value); setAbierto(true); }}
                onFocus={(e) => { setAbierto(true); e.target.select(); }}
                onKeyDown={alTeclear}
                className={`${claseInput} pl-9 pr-9 ${error ? "border-red-400 ring-2 ring-red-500/30" : ""}`}
            />
            {seleccionado && (
                <button type="button" onClick={limpiar} className="absolute right-3 top-[1.4rem] text-slate-400 hover:text-white" aria-label="Quitar proveedor">
                    <FaTimes />
                </button>
            )}

            {abierto && (
                <ul
                    ref={lista}
                    id={idLista}
                    role="listbox"
                    className="absolute z-30 mt-1 max-h-72 w-full min-w-[18rem] overflow-y-auto rounded-lg bg-slate-900 py-1 shadow-2xl ring-1 ring-white/15"
                >
                    {resultados.length === 0 ? (
                        <li className="px-4 py-3 text-sm text-slate-400">No se encontró ningún proveedor con “{texto.trim()}”.</li>
                    ) : (
                        resultados.map((p, i) => (
                            <li
                                key={p.id}
                                id={`${idLista}-${i}`}
                                data-indice={i}
                                role="option"
                                aria-selected={p.id === seleccionado?.id}
                                onMouseDown={(e) => { e.preventDefault(); elegir(p); }}
                                onMouseEnter={() => setActivo(i)}
                                className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-2 text-sm ${i === activo ? "bg-blue-500/25" : ""} ${p.id === seleccionado?.id ? "font-semibold text-white" : "text-slate-200"}`}
                            >
                                <span className="min-w-0">
                                    <span className="block truncate">{p.nombre}</span>
                                    {p.codigoSAP && <span className="block text-xs text-slate-400">SAP {p.codigoSAP}</span>}
                                </span>
                                {mostrarTipo && <TipoBadge tipo={origenDeProveedor(p)} className="flex-none" />}
                            </li>
                        ))
                    )}
                    {onNuevo && (
                        <li className="border-t border-white/10">
                            <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); setAbierto(false); onNuevo(texto.trim() && texto !== seleccionado?.nombre ? texto.trim() : ""); }}
                                className="w-full px-4 py-2.5 text-left text-sm font-medium text-blue-300 hover:bg-blue-500/15"
                            >
                                + Registrar proveedor nuevo{texto.trim() && texto !== seleccionado?.nombre ? ` “${texto.trim()}”` : ""}
                            </button>
                        </li>
                    )}
                    {total > resultados.length && (
                        <li className="border-t border-white/10 px-4 py-2 text-xs text-slate-400">
                            Mostrando {resultados.length} de {total}. Sigue escribiendo para afinar la búsqueda.
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
}
