"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaPlus, FaSearch } from "react-icons/fa";

import Cargando from "../../../components/ui/Cargando";
import TipoBadge from "../../../components/peticiones/TipoBadge";
import AvancePlan from "../../../components/planes/AvancePlan";
import EstadoPlanBadge from "../../../components/planes/EstadoPlanBadge";
import { claseInput } from "../../../components/ui/estilos";
import { alertaError } from "../../../components/ui/alertas";

import { useAuth } from "../../../context/AuthContext";
import { obtenerPlanes } from "../../../services/planes.service";
import { INFO_ESTADO_PLAN } from "../../../utils/planes";
import { formatoMonto, mensajeError } from "../../../utils/formato";

export default function PlanesPage() {
    const router = useRouter();
    const { userData } = useAuth();
    const [filtros, setFiltros] = useState({ estado: "ABIERTO", q: "" });
    const [planes, setPlanes] = useState(null);

    const cargar = useCallback(async () => {
        setPlanes(null);
        try {
            const { data } = await obtenerPlanes(filtros);
            setPlanes(data.data);
        } catch (e) {
            setPlanes([]);
            alertaError(mensajeError(e, "No se pudieron cargar los planes."));
        }
    }, [filtros]);

    useEffect(() => {
        const t = setTimeout(cargar, filtros.q ? 350 : 0);
        return () => clearTimeout(t);
    }, [cargar, filtros.q]);

    const cambiar = (e) => setFiltros((f) => ({ ...f, [e.target.name]: e.target.value }));

    return (
        <div className="bg-slate-800/35 backdrop-blur-xl ring-1 ring-white/15 rounded-2xl shadow-lg">
            <div className="flex flex-col gap-4 border-b p-6 md:flex-row md:items-end md:justify-between">
                <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="relative md:col-span-2">
                        <label htmlFor="q" className="text-sm font-medium text-slate-300">Buscar</label>
                        <FaSearch className="absolute left-3 top-[2.9rem] text-slate-400" />
                        <input id="q" name="q" value={filtros.q} onChange={cambiar} placeholder="Número, proveedor, Orden ELM..." className={`${claseInput} pl-9`} />
                    </div>
                    <div>
                        <label htmlFor="estado" className="text-sm font-medium text-slate-300">Estado</label>
                        <select id="estado" name="estado" value={filtros.estado} onChange={cambiar} className={claseInput}>
                            <option value="">Todos</option>
                            {Object.entries(INFO_ESTADO_PLAN).map(([k, v]) => <option key={k} value={k}>{v.etiqueta}</option>)}
                        </select>
                    </div>
                </div>
                {userData?.esCompras && (
                    <Link href="/planes/nuevo" className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-900/50 transition hover:from-blue-400 hover:to-blue-600">
                        <FaPlus /> Nuevo plan
                    </Link>
                )}
            </div>

            {planes === null ? (
                <Cargando />
            ) : planes.length === 0 ? (
                <p className="p-10 text-center text-slate-300">No hay planes con estos filtros.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-white/5 text-left text-slate-300">
                            <tr>
                                <th className="px-6 py-4 font-semibold">Número</th>
                                <th className="px-6 py-4 font-semibold">Proveedor</th>
                                <th className="px-6 py-4 font-semibold">Orden ELM</th>
                                <th className="px-6 py-4 font-semibold">Cuotas</th>
                                <th className="px-6 py-4 font-semibold text-right">Total</th>
                                <th className="px-6 py-4 font-semibold text-right">Saldo</th>
                                <th className="w-48 px-6 py-4 font-semibold">Avance</th>
                                <th className="px-6 py-4 font-semibold">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/10">
                            {planes.map((p) => {
                                const pagadas = p.cuotas.filter((c) => c.estadoPeticion === "PAGADA").length;
                                return (
                                    <tr
                                        key={p.id}
                                        tabIndex={0}
                                        onClick={() => router.push(`/planes/${p.id}`)}
                                        onKeyDown={(e) => e.key === "Enter" && router.push(`/planes/${p.id}`)}
                                        className="cursor-pointer hover:bg-white/5 focus:bg-white/10"
                                    >
                                        <td className="whitespace-nowrap px-6 py-4 font-semibold text-white">{p.numero}</td>
                                        <td className="px-6 py-4 text-slate-200">
                                            {p.proveedorNombre} <TipoBadge tipo={p.tipo} className="ml-1" />
                                        </td>
                                        <td className="px-6 py-4 text-slate-400">{p.ordenELM || "—"}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-slate-300">{pagadas} de {p.cuotas.length} pagadas</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right text-slate-200">{formatoMonto(p.montoTotal, p.moneda)}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right font-semibold text-white">{formatoMonto(p.resumen.saldo, p.moneda)}</td>
                                        <td className="px-6 py-4"><AvancePlan plan={p} compacto /></td>
                                        <td className="px-6 py-4"><EstadoPlanBadge estado={p.estado} /></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
