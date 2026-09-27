"use client";

import { useRouter } from "next/navigation";
import EstadoBadge from "./EstadoBadge";
import { formatoMonto, formatoFecha } from "../../utils/formato";

// columnaExtra: { titulo, valor(p) } para mostrar, por ejemplo, la acción pendiente.
export default function TablaPeticiones({ peticiones, vacio = "No hay peticiones.", columnaExtra, mostrarSolicitante = true }) {
    const router = useRouter();

    if (!peticiones.length) {
        return <div className="p-10 text-center text-slate-500">{vacio}</div>;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                        <th className="px-6 py-4 font-semibold">Número</th>
                        {columnaExtra && <th className="px-6 py-4 font-semibold">{columnaExtra.titulo}</th>}
                        <th className="px-6 py-4 font-semibold">Fecha</th>
                        {mostrarSolicitante && <th className="px-6 py-4 font-semibold">Solicitante</th>}
                        <th className="px-6 py-4 font-semibold">Proveedor</th>
                        <th className="px-6 py-4 font-semibold">Área</th>
                        <th className="px-6 py-4 font-semibold text-right">Monto a pagar</th>
                        <th className="px-6 py-4 font-semibold">Estado</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {peticiones.map((p) => (
                        <tr
                            key={p.id}
                            onClick={() => router.push(`/peticiones/${p.id}`)}
                            onKeyDown={(e) => e.key === "Enter" && router.push(`/peticiones/${p.id}`)}
                            tabIndex={0}
                            className="cursor-pointer hover:bg-blue-50/50 focus:bg-blue-50"
                        >
                            <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">{p.numero}</td>
                            {columnaExtra && <td className="px-6 py-4 font-medium text-blue-700 whitespace-nowrap">{columnaExtra.valor(p)}</td>}
                            <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{formatoFecha(p.fechaSolicitud)}</td>
                            {mostrarSolicitante && <td className="px-6 py-4 text-slate-700">{p.solicitanteNombre}</td>}
                            <td className="px-6 py-4 text-slate-700">{p.proveedorNombre || <span className="text-slate-400">Sin proveedor</span>}</td>
                            <td className="px-6 py-4 text-slate-600">{p.areaNombre}</td>
                            <td className="px-6 py-4 text-right font-semibold text-slate-900 whitespace-nowrap">{formatoMonto(p.montoPagar, p.moneda)}</td>
                            <td className="px-6 py-4"><EstadoBadge estado={p.estado} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
