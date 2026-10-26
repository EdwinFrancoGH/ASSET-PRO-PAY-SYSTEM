"use client";

import { useMemo, useState } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { formatoMonto } from "../../utils/formato";
import { montoFinal } from "../../utils/impuestos";

// Resumen de gastos pagados por mes (encabezado del panel principal).
// Usa las mismas peticiones que ya carga el panel, así que respeta lo que
// cada rol puede ver: Empleado/Autorizador las suyas, Contabilidad/Admin todas.
// Gasto = petición PAGADA, por fecha de pago, con el pago efectivo al proveedor.
//
// Dos vistas de la mini gráfica (doble clic en una barra cambia entre ellas):
//   "meses" → los 6 meses que terminan en el mes elegido (clic = ver ese mes).
//   "top"   → los 5 gastos más altos del mes elegido, de menor a mayor de
//             izquierda a derecha (el más alto queda a la derecha).
const MESES_CORTOS = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_GRAFICA = 6;
const TOP = 5;

// "2026-10" del mes actual en El Salvador.
const mesActual = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/El_Salvador" }).slice(0, 7);

const moverMes = (mes, delta) => {
    const [a, m] = mes.split("-").map(Number);
    const d = new Date(Date.UTC(a, m - 1 + delta, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

const nombreMes = (mes) => {
    const [a, m] = mes.split("-").map(Number);
    return `${MESES[m - 1]} ${a}`;
};

const fechaPago = (p) => p.pago?.fechaPago || p.fechaPago || "";

export default function ResumenGastos({ peticiones = [], cargando = false }) {
    const hoy = mesActual();
    const [mes, setMes] = useState(hoy);
    const [vista, setVista] = useState("meses"); // "meses" | "top"
    const [encima, setEncima] = useState(null); // barra con el cursor encima

    // { "2026-10": { cantidad, porMoneda: { USD: 1200 }, pagos: [{ id, numero, proveedor, valor }] } }
    const porMes = useMemo(() => {
        const acc = {};
        for (const p of peticiones) {
            if (p.estado !== "PAGADA") continue;
            const clave = String(fechaPago(p)).slice(0, 7);
            if (!/^\d{4}-\d{2}$/.test(clave)) continue;
            const valor = Number(montoFinal(p)) || 0;
            const moneda = p.moneda || "USD";
            acc[clave] ||= { cantidad: 0, porMoneda: {}, pagos: [] };
            acc[clave].cantidad += 1;
            acc[clave].porMoneda[moneda] = (acc[clave].porMoneda[moneda] || 0) + valor;
            if (moneda === "USD") acc[clave].pagos.push({ id: p.id, numero: p.numero, proveedor: p.proveedorNombre || "Sin proveedor", valor });
        }
        return acc;
    }, [peticiones]);

    const datos = porMes[mes] || { cantidad: 0, porMoneda: {}, pagos: [] };
    const usd = datos.porMoneda.USD || 0;
    const otras = Object.entries(datos.porMoneda).filter(([m, v]) => m !== "USD" && v > 0);
    const anterior = porMes[moverMes(mes, -1)]?.porMoneda.USD || 0;
    const variacion = anterior > 0 ? ((usd - anterior) / anterior) * 100 : null;

    // Barras de la vista actual (solo USD). Cada una: { clave, etiqueta, valor, detalle }
    const barras =
        vista === "top"
            ? [...datos.pagos]
                  .sort((a, b) => b.valor - a.valor)
                  .slice(0, TOP)
                  .reverse() // el más alto a la derecha
                  .map((g) => ({
                      clave: g.id,
                      etiqueta: g.proveedor,
                      valor: g.valor,
                      detalle: `${g.numero || "—"} · ${g.proveedor}`,
                      activa: false
                  }))
                  // Si hay menos de 5, se dejan espacios vacíos a la izquierda
                  // para que las barras mantengan el mismo ancho.
                  .reduce((acc, b, _, lista) => (acc.length ? [...acc, b] : [...Array.from({ length: TOP - lista.length }, (_, i) => ({ clave: `vacio-${i}`, vacio: true, valor: 0, etiqueta: "" })), b]), [])
            : Array.from({ length: MESES_GRAFICA }, (_, i) => {
                  const clave = moverMes(mes, i - (MESES_GRAFICA - 1));
                  const cantidad = porMes[clave]?.cantidad || 0;
                  return {
                      clave,
                      etiqueta: MESES_CORTOS[Number(clave.slice(5)) - 1],
                      valor: porMes[clave]?.porMoneda.USD || 0,
                      detalle: `${nombreMes(clave)} · ${cantidad} pagadas`,
                      activa: clave === mes,
                      futuro: clave > hoy
                  };
              });
    const maximo = Math.max(...barras.map((b) => b.valor), 1);
    const resaltada = vista === "top" ? barras[barras.length - 1]?.clave : null; // el gasto más alto
    const hayBarras = barras.some((b) => !b.vacio);
    const detalle = encima ? barras.find((b) => b.clave === encima) : null;

    const alternarVista = (barra) => {
        setEncima(null);
        if (vista === "meses") {
            if (barra.futuro) return;
            setMes(barra.clave);
            setVista("top");
        } else {
            setVista("meses");
        }
    };

    return (
        <div className="w-full rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 md:w-[23rem]">
            {/* Selector de mes */}
            <div className="flex items-center justify-between gap-2">
                <p className="whitespace-nowrap text-xs font-semibold uppercase tracking-wider text-slate-400">Gastos pagados</p>
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setMes((m) => moverMes(m, -1))}
                        className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10"
                        aria-label="Mes anterior"
                    >
                        <FaChevronLeft className="text-xs" />
                    </button>
                    <span className="min-w-[7rem] text-center text-sm font-semibold capitalize text-slate-100 sm:min-w-[8.5rem]">{nombreMes(mes)}</span>
                    <button
                        type="button"
                        onClick={() => setMes((m) => moverMes(m, 1))}
                        disabled={mes >= hoy}
                        className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                        aria-label="Mes siguiente"
                    >
                        <FaChevronRight className="text-xs" />
                    </button>
                </div>
            </div>

            {/* Total del mes */}
            <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="text-3xl font-bold tabular-nums text-white">{cargando ? "…" : formatoMonto(usd, "USD")}</p>
                {!cargando && variacion !== null && (
                    <span className="text-sm text-slate-300" title={`Mes anterior: ${formatoMonto(anterior, "USD")}`}>
                        {variacion >= 0 ? "▲" : "▼"} {Math.abs(variacion).toFixed(0)}% vs {MESES[Number(moverMes(mes, -1).slice(5)) - 1]}
                    </span>
                )}
            </div>
            <p className="text-xs text-slate-400">
                {cargando ? "Cargando…" : `${datos.cantidad} ${datos.cantidad === 1 ? "petición pagada" : "peticiones pagadas"}`}
                {otras.map(([m, v]) => ` · además ${formatoMonto(v, m)}`).join("")}
            </p>

            {/* Título de la vista + botón (para pantallas táctiles, donde el doble clic no siempre funciona) */}
            <div className="mt-3 flex items-center justify-between gap-2 text-[11px]">
                <span className="text-slate-400">
                    {vista === "top"
                        ? datos.pagos.length === 1 ? "Único gasto del mes" : `${Math.min(TOP, datos.pagos.length) || ""} gastos más altos del mes`.trim()
                        : "Últimos 6 meses"}
                </span>
                <button
                    type="button"
                    onClick={() => { setEncima(null); setVista((v) => (v === "top" ? "meses" : "top")); }}
                    className="rounded-md px-1.5 py-0.5 font-semibold text-blue-300 hover:bg-white/10"
                    title="También puedes dar doble clic sobre una barra"
                >
                    {vista === "top" ? "← Por mes" : "Top 5 del mes →"}
                </button>
            </div>

            {/* Mini gráfica */}
            <div className="relative mt-1">
                {!hayBarras ? (
                    <div className="flex h-14 items-center justify-center rounded-lg border border-dashed border-white/15 text-xs text-slate-400" onDoubleClick={() => setVista("meses")}>
                        Sin pagos en USD este mes
                    </div>
                ) : (
                    <div className="flex h-14 items-end gap-1.5" role="list" aria-label={vista === "top" ? "Gastos más altos del mes en USD" : "Gastos pagados en USD, últimos 6 meses"}>
                        {barras.map((b) => {
                            if (b.vacio) return <div key={b.clave} className="flex-1" aria-hidden="true" />;
                            const fuerte = b.activa || b.clave === resaltada;
                            const alto = b.valor > 0 ? Math.max(6, (b.valor / maximo) * 100) : 0;
                            return (
                                <button
                                    key={b.clave}
                                    type="button"
                                    role="listitem"
                                    onClick={() => vista === "meses" && !b.futuro && setMes(b.clave)}
                                    onDoubleClick={() => alternarVista(b)}
                                    onMouseEnter={() => setEncima(b.clave)}
                                    onMouseLeave={() => setEncima(null)}
                                    onFocus={() => setEncima(b.clave)}
                                    onBlur={() => setEncima(null)}
                                    disabled={b.futuro}
                                    className="group flex h-full flex-1 select-none items-end rounded-t focus-visible:outline-offset-1 disabled:cursor-default"
                                    aria-label={`${b.detalle}: ${formatoMonto(b.valor, "USD")}`}
                                >
                                    {alto > 0 ? (
                                        <span
                                            className={`block w-full rounded-t ${fuerte ? "bg-blue-400" : "bg-blue-400/35 group-hover:bg-blue-400/60"}`}
                                            style={{ height: `${alto}%` }}
                                        />
                                    ) : (
                                        <span className="block h-0.5 w-full rounded bg-white/15" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
                {hayBarras && (
                    <div className="mt-1 flex gap-1.5">
                        {barras.map((b) => (
                            <span
                                key={b.clave}
                                className={`min-w-0 flex-1 truncate text-center text-[10px] ${b.activa || b.clave === resaltada ? "font-bold text-slate-100" : "text-slate-400"}`}
                                title={vista === "top" ? b.etiqueta : undefined}
                            >
                                {b.etiqueta}
                            </span>
                        ))}
                    </div>
                )}

                {/* Detalle al pasar el cursor */}
                {detalle && (
                    <div className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 max-w-[22rem] -translate-x-1/2 truncate whitespace-nowrap rounded-lg bg-slate-900/95 px-2.5 py-1 text-xs text-slate-100 shadow-lg ring-1 ring-white/15">
                        <span className={vista === "meses" ? "capitalize" : ""}>{detalle.detalle}</span>: <strong>{formatoMonto(detalle.valor, "USD")}</strong>
                    </div>
                )}
            </div>
        </div>
    );
}
