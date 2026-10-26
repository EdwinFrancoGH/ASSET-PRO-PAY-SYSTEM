"use client";

import { FaPlus, FaTrash, FaLock } from "react-icons/fa";
import { claseInput } from "../ui/estilos";
import { formatoMonto } from "../../utils/formato";
import { PLANTILLAS, cuotaVacia, recalcularMontos, sumaCuotas, r2 } from "../../utils/planes";

const MAX_CUOTAS = 10;

// Tabla editable de cuotas. Se escribe el % o el monto (uno calcula el
// otro). Las cuotas que ya tienen petición se muestran bloqueadas.
export default function CuotasEditor({ cuotas, montoTotal, moneda, onChange, mostrarPlantillas = true }) {
    const total = Number(montoTotal) || 0;
    const hayBloqueadas = cuotas.some((c) => c.peticionId);

    const cambiar = (i, campo, valor) => {
        const lista = cuotas.map((c, j) => {
            if (j !== i) return c;
            const nueva = { ...c, [campo]: valor };
            if (campo === "porcentaje" && total) nueva.monto = valor === "" ? "" : r2((total * Number(valor)) / 100);
            if (campo === "monto" && total) nueva.porcentaje = valor === "" ? "" : r2((Number(valor) / total) * 100);
            return nueva;
        });
        onChange(lista);
    };

    const aplicarPlantilla = (p) => onChange(recalcularMontos(p.cuotas.map(([nombre, pct]) => cuotaVacia(nombre, pct)), total));

    const suma = sumaCuotas(cuotas);
    // % sobre el total actual (no el % escrito), para que cuadre con los montos.
    const sumaPct = total ? r2((suma / total) * 100) : 0;
    const diferencia = r2(total - suma);
    const cuadra = total > 0 && Math.abs(diferencia) < 0.01;

    return (
        <div className="space-y-4">
            {mostrarPlantillas && !hayBloqueadas && (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-slate-400">Plantillas:</span>
                    {PLANTILLAS.map((p) => (
                        <button key={p.nombre} type="button" onClick={() => aplicarPlantilla(p)} className="rounded-full px-3 py-1 text-slate-200 ring-1 ring-white/20 hover:bg-white/10">
                            {p.nombre}
                        </button>
                    ))}
                </div>
            )}

            <div className="relative overflow-x-auto">
                <table className="w-full min-w-[820px] text-sm">
                    <thead className="text-left text-slate-400">
                        <tr>
                            <th className="w-10 px-2 py-2">#</th>
                            <th className="px-2 py-2">Cuota</th>
                            <th className="w-28 px-2 py-2">%</th>
                            <th className="w-40 px-2 py-2">Monto</th>
                            <th className="px-2 py-2">Condición</th>
                            <th className="w-44 px-2 py-2">Fecha estimada</th>
                            <th className="w-10 px-2 py-2"><span className="sr-only">Quitar</span></th>
                        </tr>
                    </thead>
                    <tbody>
                        {cuotas.map((c, i) => {
                            const bloqueada = Boolean(c.peticionId);
                            const campo = (nombre, props = {}) => (
                                <input
                                    value={c[nombre] ?? ""}
                                    onChange={(e) => cambiar(i, nombre, e.target.value)}
                                    disabled={bloqueada}
                                    aria-label={`${nombre} de la cuota ${i + 1}`}
                                    className={`${claseInput} !mt-0 !p-2`}
                                    {...props}
                                />
                            );
                            return (
                                <tr key={c.id || i} className="align-top">
                                    <td className="px-2 py-2 pt-4 text-slate-400">{i + 1}</td>
                                    <td className="px-2 py-2">
                                        {campo("nombre", { placeholder: "Ej. Primer anticipo", maxLength: 80 })}
                                        {bloqueada && (
                                            <span className="mt-1 flex items-center gap-1 text-xs text-amber-200">
                                                <FaLock /> Petición {c.peticionNumero}: no se puede modificar
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-2 py-2">{campo("porcentaje", { type: "number", min: "0", max: "100", step: "0.01" })}</td>
                                    <td className="px-2 py-2">{campo("monto", { type: "number", min: "0", step: "0.01" })}</td>
                                    <td className="px-2 py-2">{campo("condicion", { placeholder: "Ej. Antes del embarque", maxLength: 200 })}</td>
                                    <td className="px-2 py-2">{campo("fechaEstimada", { type: "date" })}</td>
                                    <td className="px-2 py-2 pt-4">
                                        {!bloqueada && cuotas.length > 1 && (
                                            <button type="button" onClick={() => onChange(cuotas.filter((_, j) => j !== i))} className="text-slate-400 hover:text-red-400" aria-label={`Quitar cuota ${i + 1}`}>
                                                <FaTrash />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                    type="button"
                    disabled={cuotas.length >= MAX_CUOTAS}
                    onClick={() => onChange([...cuotas, cuotaVacia()])}
                    className="inline-flex items-center gap-2 text-sm font-medium text-blue-300 hover:underline disabled:opacity-50"
                >
                    <FaPlus /> Agregar cuota
                </button>
                <p className={`text-sm font-semibold ${cuadra ? "text-emerald-300" : "text-amber-200"}`}>
                    Suma: {sumaPct}% · {formatoMonto(suma, moneda)} de {formatoMonto(total, moneda)}
                    {!cuadra && total > 0 && ` · ${diferencia > 0 ? "faltan" : "sobran"} ${formatoMonto(Math.abs(diferencia), moneda)}`}
                </p>
            </div>
        </div>
    );
}
