"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaCheck, FaTimes, FaPen, FaPaperPlane, FaTrash, FaMoneyCheckAlt } from "react-icons/fa";

import Modal from "../ui/Modal";
import Campo from "../ui/Campo";
import { claseInput, botonPrimario, botonSecundario, botonPeligro, botonExito } from "../ui/estilos";
import { alertaError, toastExito, confirmar } from "../ui/alertas";
import { refrescarNotificaciones } from "../layout/NotificacionesBell";

import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../utils/roles";
import { ESTADOS, ESTADOS_EDITABLES } from "../../utils/estados";
import { formatoMonto, hoyISO, mensajeError } from "../../utils/formato";
import {
    enviarPeticion,
    eliminarPeticion,
    decidirAutorizacion,
    decidirContabilidad,
    registrarPago
} from "../../services/peticiones.service";

// Mensaje para quien no tiene nada que hacer en este momento.
const esperando = (p) => ({
    ENVIADA: `Esperando que ${p.autorizadorNombre} la revise.`,
    EN_REVISION: `${p.autorizadorNombre} la está revisando.`,
    APROBADA_AUTORIZADOR: "Esperando la revisión de Contabilidad.",
    APROBADA_CONTABILIDAD: "Aprobada. Contabilidad registrará el pago.",
    RECHAZADA_AUTORIZADOR: `Rechazada. ${p.solicitanteNombre} debe corregirla.`,
    RECHAZADA_CONTABILIDAD: `Rechazada por Contabilidad. ${p.solicitanteNombre} debe corregirla.`,
    PAGADA: "Pago registrado. El proceso terminó.",
    BORRADOR: "Borrador sin enviar."
}[p.estado]);

export default function PanelAcciones({ peticion: p, onActualizada }) {
    const router = useRouter();
    const { userData } = useAuth();
    const [decision, setDecision] = useState(null); // { etapa: "autorizador"|"contabilidad", tipo: "aprobar"|"rechazar" }
    const [comentario, setComentario] = useState("");
    const [pagoAbierto, setPagoAbierto] = useState(false);
    const [pago, setPago] = useState({ fechaPago: hoyISO(), referencia: "", comentario: "", comprobante: null });
    const [ocupado, setOcupado] = useState(false);

    const esSolicitante = p.solicitanteId === userData.uid;
    const puedeEditar = esSolicitante && ESTADOS_EDITABLES.includes(p.estado);
    const puedeAutorizar = userData.role === ROLES.AUTORIZADOR && p.autorizadorId === userData.uid && [ESTADOS.ENVIADA, ESTADOS.EN_REVISION].includes(p.estado);
    const puedeRevisarContable = userData.role === ROLES.CONTABILIDAD && p.estado === ESTADOS.APROBADA_AUTORIZADOR;
    const puedePagar = userData.role === ROLES.CONTABILIDAD && p.estado === ESTADOS.APROBADA_CONTABILIDAD;

    const terminar = (data, mensaje) => {
        toastExito(mensaje);
        onActualizada(data);
        refrescarNotificaciones();
    };

    const enviar = async () => {
        setOcupado(true);
        try {
            const { data } = await enviarPeticion(p.id);
            terminar(data.data, data.message);
        } catch (e) {
            alertaError(mensajeError(e));
        } finally {
            setOcupado(false);
        }
    };

    const eliminar = async () => {
        if (!(await confirmar({ titulo: "Eliminar borrador", texto: `Se eliminará ${p.numero} y sus adjuntos.`, confirmar: "Eliminar", peligro: true }))) return;
        try {
            await eliminarPeticion(p.id);
            toastExito("Borrador eliminado.");
            router.replace("/peticiones");
        } catch (e) {
            alertaError(mensajeError(e));
        }
    };

    const abrirDecision = (etapa, tipo) => {
        setComentario("");
        setDecision({ etapa, tipo });
    };

    const confirmarDecision = async () => {
        if (decision.tipo === "rechazar" && !comentario.trim()) return alertaError("Escribe el motivo del rechazo.");
        setOcupado(true);
        try {
            const fn = decision.etapa === "autorizador" ? decidirAutorizacion : decidirContabilidad;
            const { data } = await fn(p.id, decision.tipo, comentario.trim());
            setDecision(null);
            terminar(data.data, data.message);
        } catch (e) {
            alertaError(mensajeError(e));
        } finally {
            setOcupado(false);
        }
    };

    const confirmarPago = async () => {
        if (!pago.fechaPago) return alertaError("Indica la fecha del pago.");
        if (!pago.comprobante) return alertaError("Adjunta la captura o el PDF del comprobante.");
        if (pago.comprobante.size > 10 * 1024 * 1024) return alertaError("El comprobante supera los 10 MB.");
        setOcupado(true);
        try {
            const { data } = await registrarPago(p.id, pago);
            setPagoAbierto(false);
            terminar(data.data, data.message);
        } catch (e) {
            alertaError(mensajeError(e));
        } finally {
            setOcupado(false);
        }
    };

    const hayAcciones = puedeEditar || puedeAutorizar || puedeRevisarContable || puedePagar;

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">Acciones</h2>

            {!hayAcciones && <p className="text-slate-600">{esperando(p)}</p>}

            <div className="flex flex-col gap-3">
                {puedeEditar && (
                    <>
                        <button onClick={enviar} disabled={ocupado} className={`${botonPrimario} flex items-center justify-center gap-2`}>
                            <FaPaperPlane /> {p.estado === ESTADOS.BORRADOR ? "Enviar a autorización" : "Reenviar a autorización"}
                        </button>
                        <Link href={`/peticiones/${p.id}/editar`} className={`${botonSecundario} flex items-center justify-center gap-2`}>
                            <FaPen /> Editar
                        </Link>
                        {p.estado === ESTADOS.BORRADOR && (
                            <button onClick={eliminar} className="flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-red-600 hover:bg-red-50">
                                <FaTrash /> Eliminar borrador
                            </button>
                        )}
                    </>
                )}

                {(puedeAutorizar || puedeRevisarContable) && (
                    <>
                        <p className="text-sm text-slate-600">
                            {puedeAutorizar ? "Esta petición espera tu autorización." : "Autorizada por " + p.autorizadorNombre + ". Revisa y decide."}
                        </p>
                        <button onClick={() => abrirDecision(puedeAutorizar ? "autorizador" : "contabilidad", "aprobar")} disabled={ocupado} className={`${botonExito} flex items-center justify-center gap-2`}>
                            <FaCheck /> Aprobar
                        </button>
                        <button onClick={() => abrirDecision(puedeAutorizar ? "autorizador" : "contabilidad", "rechazar")} disabled={ocupado} className={`${botonPeligro} flex items-center justify-center gap-2`}>
                            <FaTimes /> Rechazar
                        </button>
                    </>
                )}

                {puedePagar && (
                    <>
                        <p className="text-sm text-slate-600">
                            Monto a pagar: <strong className="text-slate-900">{formatoMonto(p.montoPagar, p.moneda)}</strong>
                        </p>
                        <p className="text-sm text-slate-600">
                            En la transferencia, escribe <strong className="text-slate-900">{p.numero}</strong> en la referencia o descripción.
                        </p>
                        <button onClick={() => setPagoAbierto(true)} className={`${botonExito} flex items-center justify-center gap-2`}>
                            <FaMoneyCheckAlt /> Registrar pago
                        </button>
                    </>
                )}
            </div>

            {/* Aprobar / Rechazar */}
            <Modal
                abierto={Boolean(decision)}
                titulo={decision?.tipo === "aprobar" ? `Aprobar ${p.numero}` : `Rechazar ${p.numero}`}
                onCerrar={() => !ocupado && setDecision(null)}
            >
                <p className="text-slate-600">
                    {decision?.tipo === "aprobar"
                        ? decision?.etapa === "autorizador"
                            ? "La petición pasará a revisión de Contabilidad."
                            : "La petición quedará lista para registrar el pago."
                        : `La petición volverá a ${p.solicitanteNombre} para que la corrija.`}
                </p>
                <Campo etiqueta={decision?.tipo === "rechazar" ? "Motivo del rechazo" : "Comentario (opcional)"} htmlFor="comentario" requerido={decision?.tipo === "rechazar"} className="mt-4">
                    <textarea id="comentario" rows={4} maxLength={1000} autoFocus value={comentario} onChange={(e) => setComentario(e.target.value)} className={claseInput} />
                </Campo>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={() => setDecision(null)} disabled={ocupado} className={botonSecundario}>Cancelar</button>
                    <button onClick={confirmarDecision} disabled={ocupado} className={decision?.tipo === "aprobar" ? botonExito : botonPeligro}>
                        {ocupado ? "Guardando..." : decision?.tipo === "aprobar" ? "Aprobar" : "Rechazar"}
                    </button>
                </div>
            </Modal>

            {/* Registrar pago */}
            <Modal abierto={pagoAbierto} titulo={`Registrar pago de ${p.numero}`} onCerrar={() => !ocupado && setPagoAbierto(false)}>
                <div className="space-y-4">
                    <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
                        <p><strong>{formatoMonto(p.montoPagar, p.moneda)}</strong> a {p.proveedorNombre}</p>
                        <p className="mt-1">
                            {p.pagarCuentaDiferente
                                ? <span className="whitespace-pre-line">{p.nuevaCuentaBancaria}</span>
                                : p.cuentaBancaria && `${p.cuentaBancaria.banco} ${p.cuentaBancaria.tipoCuenta} ${p.cuentaBancaria.numeroCuenta}`}
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Campo etiqueta="Fecha de pago" htmlFor="fechaPago" requerido>
                            <input id="fechaPago" type="date" value={pago.fechaPago} onChange={(e) => setPago({ ...pago, fechaPago: e.target.value })} className={claseInput} />
                        </Campo>
                        <Campo etiqueta="Referencia bancaria" htmlFor="referencia">
                            <input id="referencia" maxLength={120} value={pago.referencia} onChange={(e) => setPago({ ...pago, referencia: e.target.value })} className={claseInput} />
                        </Campo>
                    </div>
                    <Campo etiqueta="Comprobante (captura o PDF)" htmlFor="comprobante" requerido ayuda="PDF o imagen de hasta 10 MB.">
                        <input
                            id="comprobante"
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.webp"
                            onChange={(e) => setPago({ ...pago, comprobante: e.target.files?.[0] || null })}
                            className="mt-2 block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                        />
                    </Campo>
                    <Campo etiqueta="Comentario (opcional)" htmlFor="comentarioPago">
                        <textarea id="comentarioPago" rows={2} maxLength={1000} value={pago.comentario} onChange={(e) => setPago({ ...pago, comentario: e.target.value })} className={claseInput} />
                    </Campo>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={() => setPagoAbierto(false)} disabled={ocupado} className={botonSecundario}>Cancelar</button>
                    <button onClick={confirmarPago} disabled={ocupado} className={botonExito}>{ocupado ? "Registrando..." : "Registrar pago"}</button>
                </div>
            </Modal>
        </div>
    );
}
