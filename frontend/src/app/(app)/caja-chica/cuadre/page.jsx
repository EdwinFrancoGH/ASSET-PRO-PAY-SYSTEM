"use client";

import { useCallback, useEffect, useState } from "react";
import { FaFileExcel, FaCut, FaCheckCircle, FaExclamationTriangle, FaLockOpen } from "react-icons/fa";

import EncabezadoPagina from "../../../../components/ui/EncabezadoPagina";
import Cargando from "../../../../components/ui/Cargando";
import RequireRole from "../../../../components/auth/RequireRole";
import FondoCajaCC from "../../../../components/cajaChica/FondoCajaCC";
import CorteCajaModal from "../../../../components/cajaChica/CorteCajaModal";
import ReabrirCajaModal from "../../../../components/cajaChica/ReabrirCajaModal";
import { claseInput } from "../../../../components/ui/estilos";
import { alertaError } from "../../../../components/ui/alertas";

import { obtenerCuadreCC, exportarCuadreCC, obtenerCortesCC } from "../../../../services/cajaChica.service";
import { useAuth } from "../../../../context/AuthContext";
import { ROLES } from "../../../../utils/roles";
import { descargarBlob } from "../../../../utils/descargas";
import { formatoMonto, formatoFecha, formatoFechaHora, mensajeError } from "../../../../utils/formato";

const hoySV = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/El_Salvador" });
const hora = (iso) => new Date(iso).toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" });

const TIPO = {
    ENTREGA: { etiqueta: "Entrega de efectivo", clase: "bg-sky-500/15 text-sky-300 ring-sky-400/30" },
    REINTEGRO: { etiqueta: "Reintegro entregado", clase: "bg-orange-500/15 text-orange-300 ring-orange-400/30" },
    VUELTO: { etiqueta: "Vuelto recibido", clase: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30" },
    EXACTO: { etiqueta: "Liquidación exacta", clase: "bg-white/10 text-slate-300 ring-white/20" }
};

const Tarjeta = ({ titulo, valor, detalle, destacado }) => (
    <div className={`rounded-2xl p-5 ring-1 ${destacado ? "bg-blue-500/10 ring-blue-400/30" : "bg-slate-800/35 ring-white/15"}`}>
        <p className="text-sm text-slate-300">{titulo}</p>
        <p className="mt-1 text-2xl font-bold text-white">{valor}</p>
        {detalle && <p className="mt-1 text-xs text-slate-400">{detalle}</p>}
    </div>
);

const textoDiferencia = (d) => (d === 0 ? "Cuadra" : `${d > 0 ? "Sobrante" : "Faltante"} ${formatoMonto(Math.abs(d))}`);

// Cuadre diario: fondo disponible, movimientos del día, corte de caja y Excel.
function Cuadre() {
    const { userRole } = useAuth();
    const esAdmin = userRole === ROLES.ADMIN;
    // Finanzas (Autorizador) ve el cuadre en solo lectura: no corta ni cambia el fondo.
    const soloLectura = ![ROLES.CAJERO, ROLES.ADMIN].includes(userRole);
    const [dia, setDia] = useState(hoySV());
    const [cuadre, setCuadre] = useState(null);
    const [cortes, setCortes] = useState([]);
    const [exportando, setExportando] = useState(false);
    const [cortando, setCortando] = useState(false);
    const [reabriendo, setReabriendo] = useState(null);

    const cargar = useCallback(async () => {
        setCuadre(null);
        try {
            const [c, h] = await Promise.all([obtenerCuadreCC(dia), obtenerCortesCC()]);
            setCuadre(c.data.data);
            setCortes(h.data.data);
        } catch (e) {
            setCuadre({ movimientos: [], resumen: {}, fondo: {} });
            alertaError(mensajeError(e));
        }
    }, [dia]);

    useEffect(() => { cargar(); }, [cargar]);

    const exportar = async () => {
        setExportando(true);
        try {
            const r = await exportarCuadreCC(dia);
            descargarBlob(r, `cuadre-caja-chica-${dia}.xlsx`);
        } catch (e) {
            alertaError(mensajeError(e, "No se pudo generar el Excel."));
        } finally {
            setExportando(false);
        }
    };

    const r = cuadre?.resumen || {};
    const f = cuadre?.fondo || {};
    const corteDoc = cuadre?.corte;
    // Corte vigente (si el Admin lo reabrió, la caja vuelve a estar abierta).
    const corte = corteDoc && corteDoc.estado !== "REABIERTA" ? corteDoc : null;
    const reaperturas = corteDoc?.reaperturas || [];
    const pendientes = (cuadre?.cortesPendientes || []).filter((d) => d !== dia);

    return (
        <>
            <EncabezadoPagina titulo={soloLectura ? "Cuadre de caja chica (solo lectura)" : "Cuadre de caja chica"} descripcion="Fondo disponible, movimientos del día y corte de caja. Salida neta = entregas + reintegros − vueltos.">
                <input type="date" value={dia} max={hoySV()} onChange={(e) => e.target.value && setDia(e.target.value)} className={`${claseInput} mt-0 w-auto`} aria-label="Día" />
                <button onClick={exportar} disabled={exportando || !cuadre} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-emerald-500 disabled:opacity-60">
                    <FaFileExcel /> {exportando ? "Generando..." : "Excel"}
                </button>
            </EncabezadoPagina>

            {cuadre === null ? (
                <Cargando />
            ) : (
                <>
                    <FondoCajaCC fondo={f} esAdmin={esAdmin} onCambio={cargar} />

                    {pendientes.length > 0 && (
                        <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-red-500/10 p-4 text-red-200 ring-1 ring-red-400/30 sm:flex-row sm:items-center sm:justify-between">
                            <p className="flex items-start gap-3">
                                <FaExclamationTriangle className="mt-0.5 flex-none" />
                                <span>
                                    <b>Falta el corte de caja</b> de {pendientes.map(formatoFecha).join(", ")}. Hasta registrarlo no se pueden hacer entregas ni cierres de liquidación.
                                </span>
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {pendientes.map((d) => (
                                    <button key={d} onClick={() => setDia(d)} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500">{soloLectura ? "Ver" : "Cortar"} {formatoFecha(d)}</button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Tarjeta titulo="Entregado" valor={formatoMonto(r.entregado)} detalle={`${r.entregas || 0} entrega(s)`} />
                        <Tarjeta titulo="Reintegros entregados" valor={formatoMonto(r.reintegros)} />
                        <Tarjeta titulo="Vueltos recibidos" valor={formatoMonto(r.vueltos)} />
                        <Tarjeta titulo="Salida neta del día" valor={formatoMonto(r.salidaNeta)} detalle={r.excedentesNoReconocidos > 0 ? `Excedentes no reconocidos: ${formatoMonto(r.excedentesNoReconocidos)}` : null} destacado />
                    </div>

                    {/* Corte de caja del día */}
                    <div className={`mb-6 rounded-2xl p-6 ring-1 ${corte ? (corte.diferencia === 0 ? "bg-emerald-500/5 ring-emerald-400/30" : "bg-red-500/5 ring-red-400/30") : "bg-slate-800/35 ring-white/15"}`}>
                        {corte ? (
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex items-start gap-3">
                                    {corte.diferencia === 0 ? <FaCheckCircle className="mt-1 text-2xl text-emerald-400" /> : <FaExclamationTriangle className="mt-1 text-2xl text-red-400" />}
                                    <div>
                                        <p className="text-lg font-bold text-white">
                                            Caja cortada · {textoDiferencia(corte.diferencia)}
                                            {corte.tardio && <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300">Corte tardío</span>}
                                            {corte.numeroCorte > 1 && <span className="ml-2 rounded-full bg-violet-500/20 px-2 py-0.5 text-xs font-semibold text-violet-300">Corte #{corte.numeroCorte}</span>}
                                        </p>
                                        <p className="text-sm text-slate-300">Por {corte.cajeroNombre} · {formatoFechaHora(corte.fecha)}</p>
                                        {corte.observacion && <p className="mt-1 text-sm text-slate-300">“{corte.observacion}”</p>}
                                    </div>
                                </div>
                                <div className="flex flex-col items-start gap-3 lg:items-end">
                                <div className="grid grid-cols-3 gap-4 text-sm">
                                    <div><p className="text-slate-400">Saldo inicial</p><p className="font-semibold text-white">{formatoMonto(corte.saldoInicial)}</p></div>
                                    <div><p className="text-slate-400">Sistema</p><p className="font-semibold text-white">{formatoMonto(corte.saldoTeorico)}</p></div>
                                    <div><p className="text-slate-400">Contado</p><p className="font-semibold text-white">{formatoMonto(corte.efectivoContado)}</p></div>
                                </div>
                                {esAdmin && cuadre.esHoy && (
                                    <button onClick={() => setReabriendo(dia)} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-red-300 ring-1 ring-red-400/40 hover:bg-red-500/10">
                                        <FaLockOpen /> Reabrir caja (emergencia)
                                    </button>
                                )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-lg font-bold text-white">{corteDoc?.estado === "REABIERTA" ? "Caja reabierta · debe volver a cortarse" : "Corte de caja pendiente"}</p>
                                    <p className="text-sm text-slate-300">
                                        Saldo al inicio: <b className="text-white">{formatoMonto(f.saldoInicial)}</b> · Debe haber en caja: <b className="text-white">{formatoMonto(f.saldoFinal)}</b>
                                    </p>
                                </div>
                                {soloLectura ? (
                                    <span className="rounded-xl bg-white/5 px-4 py-2 text-sm text-slate-400 ring-1 ring-white/10">Solo lectura · el corte lo hace el Cajero</span>
                                ) : (
                                <button onClick={() => setCortando(true)} disabled={!f.montoFondo} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-900/50 transition hover:from-blue-400 hover:to-blue-600 disabled:opacity-50">
                                    <FaCut /> Hacer corte de caja
                                </button>
                                )}
                            </div>
                        )}

                        {reaperturas.length > 0 && (
                            <div className="mt-5 border-t border-white/10 pt-4">
                                <p className="mb-2 text-sm font-semibold text-slate-200">Reaperturas de este día</p>
                                <ul className="space-y-2 text-sm">
                                    {reaperturas.map((ra, i) => (
                                        <li key={i} className="rounded-lg bg-white/5 p-3 text-slate-300">
                                            <b className="text-white">{ra.adminNombre}</b> · {formatoFechaHora(ra.fecha)} — “{ra.motivo}”
                                            <span className="block text-xs text-slate-400">
                                                Corte anterior: sistema {formatoMonto(ra.corteAnterior?.saldoTeorico)}, contado {formatoMonto(ra.corteAnterior?.efectivoContado)} ({ra.corteAnterior?.cajeroNombre})
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Movimientos del día */}
                    <div className="mb-6 overflow-hidden rounded-2xl bg-slate-800/35 shadow-lg ring-1 ring-white/15 backdrop-blur-xl">
                        <h2 className="border-b border-white/10 px-6 py-4 font-semibold text-slate-100">Movimientos del {formatoFecha(dia)}</h2>
                        {cuadre.movimientos.length === 0 ? (
                            <p className="p-10 text-center text-slate-400">No hubo movimientos de caja chica este día.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-white/5 text-left text-slate-300">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">Hora</th>
                                            <th className="px-6 py-4 font-semibold">N°</th>
                                            <th className="px-6 py-4 font-semibold">Solicitante</th>
                                            <th className="px-6 py-4 font-semibold">Área</th>
                                            <th className="px-6 py-4 font-semibold">Tipo</th>
                                            <th className="px-6 py-4 text-right font-semibold">Salida</th>
                                            <th className="px-6 py-4 text-right font-semibold">Entrada</th>
                                            <th className="px-6 py-4 font-semibold">Cajero</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/10">
                                        {cuadre.movimientos.map((m, i) => {
                                            const t = TIPO[m.tipo] || { etiqueta: m.tipo, clase: "" };
                                            return (
                                                <tr key={`${m.solicitudId}-${m.tipo}-${i}`} className="hover:bg-white/5">
                                                    <td className="whitespace-nowrap px-6 py-3 text-slate-300">{hora(m.fecha)}</td>
                                                    <td className="whitespace-nowrap px-6 py-3 font-medium text-white">{m.numero}</td>
                                                    <td className="whitespace-nowrap px-6 py-3 text-slate-200">{m.solicitanteNombre}</td>
                                                    <td className="whitespace-nowrap px-6 py-3 text-slate-300">{m.areaNombre}</td>
                                                    <td className="px-6 py-3"><span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${t.clase}`}>{t.etiqueta}</span></td>
                                                    <td className="whitespace-nowrap px-6 py-3 text-right font-semibold text-slate-100">{m.salida ? formatoMonto(m.salida) : "—"}</td>
                                                    <td className="whitespace-nowrap px-6 py-3 text-right font-semibold text-emerald-300">{m.entrada ? formatoMonto(m.entrada) : "—"}</td>
                                                    <td className="whitespace-nowrap px-6 py-3 text-slate-300">{m.cajeroNombre}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Historial de cortes */}
                    <div className="overflow-hidden rounded-2xl bg-slate-800/35 shadow-lg ring-1 ring-white/15 backdrop-blur-xl">
                        <h2 className="border-b border-white/10 px-6 py-4 font-semibold text-slate-100">Cortes de caja anteriores</h2>
                        {cortes.length === 0 ? (
                            <p className="p-8 text-center text-slate-400">Aún no hay cortes registrados.</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-white/5 text-left text-slate-300">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">Día</th>
                                            <th className="px-6 py-3 text-right font-semibold">Saldo inicial</th>
                                            <th className="px-6 py-3 text-right font-semibold">Salida neta</th>
                                            <th className="px-6 py-3 text-right font-semibold">Sistema</th>
                                            <th className="px-6 py-3 text-right font-semibold">Contado</th>
                                            <th className="px-6 py-3 font-semibold">Resultado</th>
                                            <th className="px-6 py-3 font-semibold">Cajero</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/10">
                                        {cortes.map((c) => (
                                            <tr key={c.id} onClick={() => setDia(c.dia)} className="cursor-pointer hover:bg-white/5" title="Ver el cuadre de ese día">
                                                <td className="whitespace-nowrap px-6 py-3 font-medium text-white">{formatoFecha(c.dia)}</td>
                                                <td className="whitespace-nowrap px-6 py-3 text-right text-slate-200">{formatoMonto(c.saldoInicial)}</td>
                                                <td className="whitespace-nowrap px-6 py-3 text-right text-slate-200">{formatoMonto(c.salidaNeta)}</td>
                                                <td className="whitespace-nowrap px-6 py-3 text-right text-slate-200">{formatoMonto(c.saldoTeorico)}</td>
                                                <td className="whitespace-nowrap px-6 py-3 text-right font-semibold text-white">{formatoMonto(c.efectivoContado)}</td>
                                                <td className={`whitespace-nowrap px-6 py-3 font-semibold ${c.estado === "REABIERTA" ? "text-amber-300" : c.diferencia === 0 ? "text-emerald-300" : "text-red-300"}`}>
                                                    {c.estado === "REABIERTA" ? "Reabierta (sin re-cortar)" : textoDiferencia(c.diferencia)}
                                                    {c.tardio && <span className="ml-2 text-xs text-amber-300">tardío</span>}
                                                    {c.reaperturas?.length > 0 && c.estado !== "REABIERTA" && <span className="ml-2 text-xs text-violet-300">{c.reaperturas.length} reapertura(s)</span>}
                                                </td>
                                                <td className="whitespace-nowrap px-6 py-3 text-slate-300">{c.cajeroNombre}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            )}

            <ReabrirCajaModal
                dia={reabriendo}
                onCerrar={() => setReabriendo(null)}
                onReabierta={() => {
                    setReabriendo(null);
                    cargar();
                }}
            />
            <CorteCajaModal
                abierto={cortando}
                cuadre={cuadre}
                onCerrar={() => setCortando(false)}
                onRegistrado={() => {
                    setCortando(false);
                    cargar();
                }}
            />
        </>
    );
}

export default function CuadreCajaChicaPage() {
    return (
        <RequireRole roles={[ROLES.CAJERO, ROLES.ADMIN, ROLES.AUTORIZADOR]}>
            <Cuadre />
        </RequireRole>
    );
}
