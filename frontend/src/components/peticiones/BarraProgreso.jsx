import { PASOS_FLUJO, indicePaso } from "../../utils/estados";

// Muestra en qué paso del flujo va la petición. Si fue rechazada, el paso
// donde se rechazó se pinta en rojo.
export default function BarraProgreso({ estado }) {
    const actual = indicePaso(estado);
    const rechazada = estado?.startsWith("RECHAZADA");

    return (
        <ol className="flex items-start overflow-x-auto pb-1">
            {PASOS_FLUJO.map((paso, i) => {
                const completado = i < actual || (i === actual && estado === "PAGADA");
                const esActual = i === actual && estado !== "PAGADA";
                const color = esActual && rechazada
                    ? "bg-red-600 text-white"
                    : completado
                        ? "bg-emerald-600 text-white"
                        : esActual
                            ? "bg-blue-600 text-white ring-4 ring-blue-100"
                            : "bg-slate-200 text-slate-500";

                return (
                    <li key={paso.clave} className="flex flex-1 min-w-24 flex-col items-center relative">
                        {i > 0 && <span className={`absolute top-4 right-1/2 w-full h-0.5 -z-0 ${i <= actual ? "bg-emerald-500" : "bg-slate-200"}`} />}
                        <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${color}`}>
                            {completado ? "✓" : esActual && rechazada ? "✕" : i + 1}
                        </span>
                        <span className={`mt-2 text-center text-xs ${esActual ? "font-semibold text-slate-800" : "text-slate-500"}`}>{paso.etiqueta}</span>
                    </li>
                );
            })}
        </ol>
    );
}
