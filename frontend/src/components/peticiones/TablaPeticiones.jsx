"use client";

import { useRouter } from "next/navigation";
import EstadoBadge from "./EstadoBadge";
import TipoBadge from "./TipoBadge";
import { tipoDePeticion } from "../../utils/bancario";
import { montoFinal } from "../../utils/impuestos";
import { formatoMonto, formatoFecha } from "../../utils/formato";

// columnaExtra: { titulo, valor(p) } para mostrar, por ejemplo, la acción pendiente.
export default function TablaPeticiones({ peticiones, vacio = "No hay peticiones.", columnaExtra, mostrarSolicitante = true, oscuro = true }) {
    const router = useRouter();

    // Clases según el tema (oscuro = estilo nocturno del login, en prueba).
    const c = oscuro
        ? {
              vacio: "text-slate-300",
              thead: "bg-white/5 text-slate-300",
              tbody: "divide-white/10",
              fila: "hover:bg-white/5 focus:bg-white/10",
              fuerte: "text-white",
              extra: "text-blue-300",
              normal: "text-slate-200",
              suave: "text-slate-400",
              tenue: "text-slate-500"
          }
        : {
              vacio: "text-slate-500",
              thead: "bg-slate-50 text-slate-600",
              tbody: "divide-slate-100",
              fila: "hover:bg-blue-50/50 focus:bg-blue-50",
              fuerte: "text-slate-900",
              extra: "text-blue-700",
              normal: "text-slate-700",
              suave: "text-slate-600",
              tenue: "text-slate-400"
          };

    if (!peticiones.length) {
        return <div className={`p-10 text-center ${c.vacio}`}>{vacio}</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className={`text-left ${c.thead}`}>
                    <tr>
                        <th className="px-6 py-4 font-semibold">Número</th>
                        {columnaExtra && <th className="px-6 py-4 font-semibold">{columnaExtra.titulo}</th>}
                        <th className="px-6 py-4 font-semibold">Fecha</th>
                        {mostrarSolicitante && <th className="px-6 py-4 font-semibold">Solicitante</th>}
                        <th className="px-6 py-4 font-semibold">Proveedor</th>
                        <th className="px-6 py-4 font-semibold">Tipo</th>
                        <th className="px-6 py-4 font-semibold">Área</th>
                        <th className="px-6 py-4 font-semibold text-right">Pago efectivo</th>
                        <th className="px-6 py-4 font-semibold">Estado</th>
                    </tr>
                </thead>
                <tbody className={`divide-y ${c.tbody}`}>
                    {peticiones.map((p) => (
                        <tr
                            key={p.id}
                            onClick={() => router.push(`/peticiones/${p.id}`)}
                            onKeyDown={(e) => e.key === "Enter" && router.push(`/peticiones/${p.id}`)}
                            tabIndex={0}
                            className={`cursor-pointer ${c.fila}`}
                        >
                            <td className={`px-6 py-4 font-semibold whitespace-nowrap ${c.fuerte}`}>{p.numero}</td>
                            {columnaExtra && <td className={`px-6 py-4 font-medium whitespace-nowrap ${c.extra}`}>{columnaExtra.valor(p)}</td>}
                            <td className={`px-6 py-4 whitespace-nowrap ${c.suave}`}>{formatoFecha(p.fechaSolicitud)}</td>
                            {mostrarSolicitante && <td className={`px-6 py-4 ${c.normal}`}>{p.solicitanteNombre}</td>}
                            <td className={`px-6 py-4 ${c.normal}`}>{p.proveedorNombre || <span className={c.tenue}>Sin proveedor</span>}</td>
                            <td className="px-6 py-4"><TipoBadge tipo={tipoDePeticion(p)} /></td>
                            <td className={`px-6 py-4 ${c.suave}`}>{p.areaNombre}</td>
                            <td className={`px-6 py-4 text-right font-semibold whitespace-nowrap ${c.fuerte}`}>{formatoMonto(montoFinal(p), p.moneda)}</td>
                            <td className="px-6 py-4"><EstadoBadge estado={p.estado} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
