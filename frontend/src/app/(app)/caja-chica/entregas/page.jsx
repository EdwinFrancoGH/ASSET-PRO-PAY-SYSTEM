"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaSearch, FaCheckCircle, FaTimesCircle, FaCashRegister, FaExclamationTriangle } from "react-icons/fa";

import EncabezadoPagina from "../../../../components/ui/EncabezadoPagina";
import Cargando from "../../../../components/ui/Cargando";
import RequireRole from "../../../../components/auth/RequireRole";
import EstadoCajaChicaBadge from "../../../../components/cajaChica/EstadoCajaChicaBadge";
import RechazarCCModal from "../../../../components/cajaChica/RechazarCCModal";
import { botonExito, botonSecundario } from "../../../../components/ui/estilos";
import { alertaError, toastExito, confirmar } from "../../../../components/ui/alertas";

import { buscarPorTokenCC, entregarCC, rechazarEnCajaCC, obtenerMovimientosCajaCC } from "../../../../services/cajaChica.service";
import { ROLES } from "../../../../utils/roles";
import { formatoMonto, formatoFechaHora, mensajeError } from "../../../../utils/formato";

const Dato = ({ etiqueta, children }) => (
    <div>
        <p className="text-xs text-slate-400">{etiqueta}</p>
        <p className="font-medium text-slate-100">{children}</p>
    </div>
);

const hora = (iso) => (iso ? new Date(iso).toLocaleTimeString("es-SV", { hour: "2-digit", minute: "2-digit" }) : "—");

// Pantalla del Cajero: ingresa el token de 6 dígitos que le da el
// solicitante, revisa la solicitud y entrega el efectivo (o la rechaza).
function Entregas() {
    const [token, setToken] = useState("");
    const [buscando, setBuscando] = useState(false);
    const [solicitud, setSolicitud] = useState(null);
    const [error, setError] = useState("");
    const [entregando, setEntregando] = useState(false);
    const [aRechazar, setARechazar] = useState(null);
    const [movimientos, setMovimientos] = useState(null);
    const inputRef = useRef(null);

    const cargarMovimientos = useCallback(() => {
        obtenerMovimientosCajaCC()
            .then(({ data }) => setMovimientos(data.data))
            .catch(() => setMovimientos([]));
    }, []);

    useEffect(() => { cargarMovimientos(); }, [cargarMovimientos]);

    const limpiar = () => {
        setToken("");
        setSolicitud(null);
        setError("");
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const buscar = async (e) => {
        e.preventDefault();
        setBuscando(true);
        setError("");
        setSolicitud(null);
        try {
            const { data } = await buscarPorTokenCC(token);
            setSolicitud(data.data);
        } catch (err) {
            setError(mensajeError(err));
        } finally {
            setBuscando(false);
        }
    };

    const entregar = async () => {
        const ok = await confirmar({
            titulo: `Entregar ${formatoMonto(solicitud.monto)}`,
            texto: `Confirma que entregas ${formatoMonto(solicitud.monto)} en efectivo a ${solicitud.solicitanteNombre} (${solicitud.numero}). El token quedará usado.`,
            confirmar: "Registrar entrega"
        });
        if (!ok) return;
        setEntregando(true);
        try {
            const { data } = await entregarCC(solicitud.id, token);
            toastExito(data.message);
            limpiar();
            cargarMovimientos();
        } catch (err) {
            alertaError(mensajeError(err));
        } finally {
            setEntregando(false);
        }
    };

    const rechazar = async (motivo) => {
        try {
            const { data } = await rechazarEnCajaCC(aRechazar.id, token, motivo);
            toastExito(data.message);
            setARechazar(null);
            limpiar();
            cargarMovimientos();
        } catch (err) {
            alertaError(mensajeError(err));
        }
    };

    const entregadas = (movimientos || []).filter((m) => m.fechaEntrega);
    const totalHoy = entregadas.reduce((a, m) => a + Number(m.monto || 0), 0);

    return (
        <>
            <EncabezadoPagina titulo="Entregas de caja chica" descripcion="Pide al solicitante su token de 6 dígitos, revisa la solicitud y registra la entrega del efectivo." />

            {/* Buscar token */}
            <form onSubmit={buscar} className="mb-6 rounded-2xl bg-slate-800/35 p-6 shadow-lg ring-1 ring-white/15 backdrop-blur-xl">
                <label htmlFor="tokenCC" className="text-sm font-medium text-slate-300">Token de la solicitud</label>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                    <input
                        id="tokenCC"
                        ref={inputRef}
                        autoFocus
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={6}
                        value={token}
                        onChange={(e) => {
                            setToken(e.target.value.replace(/\D/g, "").slice(0, 6));
                            setSolicitud(null);
                            setError("");
                        }}
                        placeholder="000000"
                        className="w-full rounded-xl border border-white/15 bg-slate-900/40 p-4 text-center font-mono text-4xl font-bold tracking-[0.5em] text-white placeholder:text-slate-600 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 sm:w-80"
                    />
                    <button type="submit" disabled={token.length !== 6 || buscando} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-900/50 transition hover:from-blue-400 hover:to-blue-600 disabled:cursor-not-allowed disabled:opacity-50">
                        <FaSearch /> {buscando ? "Buscando..." : "Buscar"}
                    </button>
                </div>
                {error && <p className="mt-3 rounded-lg bg-red-500/10 p-3 text-red-200 ring-1 ring-red-400/30">{error}</p>}
            </form>

            {/* Solicitud encontrada */}
            {solicitud && (
                <div className="mb-6 rounded-2xl bg-emerald-500/5 p-6 shadow-lg ring-1 ring-emerald-400/30">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <FaCheckCircle className="text-2xl text-emerald-400" />
                            <div>
                                <p className="text-lg font-bold text-white">{solicitud.numero}</p>
                                <EstadoCajaChicaBadge estado={solicitud.estado} />
                            </div>
                        </div>
                        <p className="text-4xl font-bold text-white">{formatoMonto(solicitud.monto)}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Dato etiqueta="Entregar a">{solicitud.solicitanteNombre}</Dato>
                        <Dato etiqueta="Área">{solicitud.areaNombre}</Dato>
                        <Dato etiqueta="Aprobada por">{solicitud.aprobadoPorNombre}</Dato>
                        <Dato etiqueta="Aprobada el">{formatoFechaHora(solicitud.fechaAprobacion)}</Dato>
                    </div>
                    {solicitud.fondoDisponible !== undefined && (
                        <p className={`mt-4 rounded-lg p-3 text-sm ring-1 ${solicitud.fondoDisponible >= solicitud.monto ? "bg-white/5 text-slate-300 ring-white/10" : "bg-red-500/10 text-red-200 ring-red-400/30"}`}>
                            Fondo disponible en caja: <b className="text-white">{formatoMonto(solicitud.fondoDisponible)}</b> de {formatoMonto(solicitud.fondoAsignado)}
                            {solicitud.fondoDisponible < solicitud.monto && " — fondo insuficiente para esta entrega."}
                        </p>
                    )}
                    {solicitud.bloqueoArea && (
                        <div className="mt-4 flex items-start gap-3 rounded-lg bg-red-500/10 p-3 text-red-200 ring-1 ring-red-400/30">
                            <FaExclamationTriangle className="mt-0.5 flex-none" />
                            <div>
                                <p className="font-semibold">No se puede entregar: política de {solicitud.bloqueoArea.maximo} personas por área</p>
                                <p className="mt-1 text-sm">
                                    {solicitud.areaNombre} ya tiene efectivo sin liquidar de:{" "}
                                    {solicitud.bloqueoArea.pendientes.map((p) => `${p.solicitanteNombre} (${p.numero}, ${formatoMonto(p.monto)})`).join(", ")}. Puedes rechazar o esperar a que alguien liquide.
                                </p>
                            </div>
                        </div>
                    )}
                    <div className="mt-4">
                        <p className="text-xs text-slate-400">Concepto</p>
                        <p className="mt-1 whitespace-pre-wrap rounded-lg bg-white/5 p-3 text-slate-100">{solicitud.concepto}</p>
                    </div>
                    <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button type="button" onClick={limpiar} className={botonSecundario}>Cancelar</button>
                        <button type="button" onClick={() => setARechazar(solicitud)} disabled={entregando} className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-red-300 ring-1 ring-red-400/40 transition hover:bg-red-500/15 disabled:opacity-60">
                            <FaTimesCircle /> Rechazar
                        </button>
                        <button type="button" onClick={entregar} disabled={entregando || Boolean(solicitud.bloqueoArea) || (solicitud.fondoDisponible !== undefined && solicitud.fondoDisponible < solicitud.monto)} className={`${botonExito} inline-flex items-center justify-center gap-2`}>
                            <FaCashRegister /> {entregando ? "Registrando..." : `Registrar entrega de ${formatoMonto(solicitud.monto)}`}
                        </button>
                    </div>
                </div>
            )}

            {/* Movimientos de hoy */}
            <div className="overflow-hidden rounded-2xl bg-slate-800/35 shadow-lg ring-1 ring-white/15 backdrop-blur-xl">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-6 py-4">
                    <h2 className="font-semibold text-slate-100">Movimientos de hoy</h2>
                    <p className="text-sm text-slate-300">
                        {entregadas.length} entrega(s) · <b className="text-white">{formatoMonto(totalHoy)}</b>
                    </p>
                </div>
                {movimientos === null ? (
                    <Cargando />
                ) : movimientos.length === 0 ? (
                    <p className="p-8 text-center text-slate-400">Aún no hay entregas hoy.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-white/5 text-left text-slate-300">
                                <tr>
                                    <th className="px-6 py-3 font-semibold">Hora</th>
                                    <th className="px-6 py-3 font-semibold">N°</th>
                                    <th className="px-6 py-3 font-semibold">Solicitante</th>
                                    <th className="px-6 py-3 font-semibold">Área</th>
                                    <th className="px-6 py-3 text-right font-semibold">Monto</th>
                                    <th className="px-6 py-3 font-semibold">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {movimientos.map((m) => (
                                    <tr key={m.id} className="hover:bg-white/5">
                                        <td className="whitespace-nowrap px-6 py-3 text-slate-300">{hora(m.fechaEntrega || m.fechaRechazoCaja)}</td>
                                        <td className="whitespace-nowrap px-6 py-3 font-medium text-white">{m.numero}</td>
                                        <td className="whitespace-nowrap px-6 py-3 text-slate-200">{m.solicitanteNombre}</td>
                                        <td className="whitespace-nowrap px-6 py-3 text-slate-300">{m.areaNombre}</td>
                                        <td className={`whitespace-nowrap px-6 py-3 text-right font-semibold ${m.fechaEntrega ? "text-slate-100" : "text-slate-500 line-through"}`}>{formatoMonto(m.monto)}</td>
                                        <td className="px-6 py-3"><EstadoCajaChicaBadge estado={m.estado} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <RechazarCCModal solicitud={aRechazar} onCerrar={() => setARechazar(null)} onConfirmar={rechazar} />
        </>
    );
}

export default function EntregasCajaChicaPage() {
    return (
        <RequireRole roles={[ROLES.CAJERO, ROLES.ADMIN]}>
            <Entregas />
        </RequireRole>
    );
}
