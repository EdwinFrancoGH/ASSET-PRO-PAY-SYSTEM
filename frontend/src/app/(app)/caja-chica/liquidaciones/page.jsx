"use client";

import { useCallback, useEffect, useState } from "react";
import { FaExclamationTriangle } from "react-icons/fa";

import EncabezadoPagina from "../../../../components/ui/EncabezadoPagina";
import Cargando from "../../../../components/ui/Cargando";
import Modal from "../../../../components/ui/Modal";
import RequireRole from "../../../../components/auth/RequireRole";
import EstadoCajaChicaBadge from "../../../../components/cajaChica/EstadoCajaChicaBadge";
import RechazarCCModal from "../../../../components/cajaChica/RechazarCCModal";
import ArchivosLiquidacion from "../../../../components/cajaChica/ArchivosLiquidacion";
import ResumenCierreCC from "../../../../components/cajaChica/ResumenCierreCC";
import { botonExito, botonSecundario } from "../../../../components/ui/estilos";
import { alertaError, toastExito, confirmar } from "../../../../components/ui/alertas";

import { obtenerLiquidacionesCC, cerrarLiquidacionCC, devolverLiquidacionCC } from "../../../../services/cajaChica.service";
import { textoCierreCajero } from "../../../../utils/cajaChica";
import { ROLES } from "../../../../utils/roles";
import { formatoMonto, formatoFechaHora, mensajeError } from "../../../../utils/formato";

const Atrasada = () => <span className="ml-2 rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-semibold text-red-300">Atrasada</span>;

// Cajero: revisa las liquidaciones (facturas + cálculo) y las cierra o
// devuelve. También ve quién tiene efectivo sin liquidar y las áreas
// bloqueadas por la política de 3 personas.
function Liquidaciones() {
    const [datos, setDatos] = useState(null);
    const [pestana, setPestana] = useState("porRevisar");
    const [revision, setRevision] = useState(null);
    const [aDevolver, setADevolver] = useState(null);
    const [cerrando, setCerrando] = useState(false);

    const cargar = useCallback(async () => {
        try {
            const { data } = await obtenerLiquidacionesCC();
            setDatos(data.data);
        } catch (e) {
            setDatos({ porRevisar: [], pendientes: [], porArea: [] });
            alertaError(mensajeError(e));
        }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const cerrar = async () => {
        const l = revision.liquidacion;
        const ok = await confirmar({
            titulo: `Cerrar ${revision.numero}`,
            texto: `${textoCierreCajero(l)}. La solicitud quedará liquidada y ${revision.solicitanteNombre} podrá pedir caja chica otra vez.`,
            confirmar: "Cerrar liquidación"
        });
        if (!ok) return;
        setCerrando(true);
        try {
            const { data } = await cerrarLiquidacionCC(revision.id);
            toastExito(data.message);
            setRevision(null);
            cargar();
        } catch (e) {
            alertaError(mensajeError(e));
        } finally {
            setCerrando(false);
        }
    };

    const devolver = async (motivo) => {
        try {
            const { data } = await devolverLiquidacionCC(aDevolver.id, motivo);
            toastExito(data.message);
            setADevolver(null);
            setRevision(null);
            cargar();
        } catch (e) {
            alertaError(mensajeError(e));
        }
    };

    const bloqueadas = (datos?.porArea || []).filter((a) => a.bloqueada);
    const lista = datos ? datos[pestana] : [];

    return (
        <>
            <EncabezadoPagina titulo="Liquidaciones de caja chica" descripcion="Revisa las facturas, recibe el vuelto o entrega el reintegro (tope $50) y cierra la liquidación." />

            {bloqueadas.length > 0 && (
                <div className="mb-6 flex items-start gap-3 rounded-2xl bg-red-500/10 p-4 text-red-200 ring-1 ring-red-400/30">
                    <FaExclamationTriangle className="mt-0.5 flex-none" />
                    <p>
                        Áreas bloqueadas (ya tienen {datos.maximoPorArea} personas con efectivo sin liquidar): <b>{bloqueadas.map((a) => a.area).join(", ")}</b>. No se puede entregar caja chica a otra persona de esas áreas hasta que alguien liquide.
                    </p>
                </div>
            )}

            <div className="overflow-hidden rounded-2xl bg-slate-800/35 shadow-lg ring-1 ring-white/15 backdrop-blur-xl">
                <div className="flex gap-1 border-b border-white/10 px-6 pt-4" role="tablist">
                    {[
                        { clave: "porRevisar", titulo: "Por revisar" },
                        { clave: "pendientes", titulo: "Pendientes de liquidar" }
                    ].map((p) => (
                        <button
                            key={p.clave}
                            role="tab"
                            aria-selected={pestana === p.clave}
                            onClick={() => setPestana(p.clave)}
                            className={`-mb-px rounded-t-lg border-b-2 px-4 py-2 font-medium ${pestana === p.clave ? "border-blue-600 text-blue-300" : "border-transparent text-slate-400 hover:text-white"}`}
                        >
                            {p.titulo}
                            {datos?.[p.clave]?.length > 0 && <span className="ml-2 rounded-full bg-blue-500/30 px-2 py-0.5 text-xs text-blue-100">{datos[p.clave].length}</span>}
                        </button>
                    ))}
                </div>

                {datos === null ? (
                    <Cargando />
                ) : lista.length === 0 ? (
                    <p className="p-10 text-center text-slate-400">{pestana === "porRevisar" ? "No hay liquidaciones por revisar." : "Nadie tiene efectivo pendiente de liquidar."}</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-white/5 text-left text-slate-300">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">N°</th>
                                    <th className="px-6 py-4 font-semibold">Solicitante</th>
                                    <th className="px-6 py-4 font-semibold">Área</th>
                                    <th className="px-6 py-4 text-right font-semibold">Entregado</th>
                                    {pestana === "porRevisar" ? (
                                        <>
                                            <th className="px-6 py-4 text-right font-semibold">Gastado</th>
                                            <th className="px-6 py-4 font-semibold">En caja</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-6 py-4 font-semibold">Liquidar antes de</th>
                                            <th className="px-6 py-4 font-semibold">Estado</th>
                                        </>
                                    )}
                                    <th className="px-6 py-4"><span className="sr-only">Acciones</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {lista.map((s) => (
                                    <tr key={s.id} className="hover:bg-white/5">
                                        <td className="whitespace-nowrap px-6 py-4 font-medium text-white">{s.numero}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-slate-200">{s.solicitanteNombre}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-slate-300">{s.areaNombre}</td>
                                        <td className="whitespace-nowrap px-6 py-4 text-right text-slate-100">{formatoMonto(s.monto)}</td>
                                        {pestana === "porRevisar" ? (
                                            <>
                                                <td className="whitespace-nowrap px-6 py-4 text-right font-semibold text-slate-100">{formatoMonto(s.liquidacion.montoGastado)}</td>
                                                <td className="whitespace-nowrap px-6 py-4 text-slate-200">{textoCierreCajero(s.liquidacion)}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="whitespace-nowrap px-6 py-4 text-slate-300">{formatoFechaHora(s.liquidarAntes)}{s.atrasada && <Atrasada />}</td>
                                                <td className="px-6 py-4"><EstadoCajaChicaBadge estado={s.estado} /></td>
                                            </>
                                        )}
                                        <td className="whitespace-nowrap px-6 py-4 text-right">
                                            {pestana === "porRevisar" && (
                                                <button onClick={() => setRevision(s)} className="rounded-lg px-3 py-1.5 font-medium text-blue-300 hover:bg-blue-500/10">Revisar</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal abierto={Boolean(revision)} titulo={`Liquidación ${revision?.numero || ""}`} onCerrar={() => !cerrando && setRevision(null)} ancho="max-w-2xl">
                {revision && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                            <p><span className="text-slate-400">Solicitante:</span> <b className="text-white">{revision.solicitanteNombre}</b></p>
                            <p><span className="text-slate-400">Área:</span> {revision.areaNombre}</p>
                            <p><span className="text-slate-400">N° factura:</span> <b className="text-white">{revision.liquidacion.numeroFactura}</b></p>
                            <p><span className="text-slate-400">Enviada:</span> {formatoFechaHora(revision.liquidacion.fechaEnvio)}</p>
                        </div>
                        <p className="text-sm text-slate-300"><span className="text-slate-400">Concepto:</span> {revision.concepto}</p>
                        {revision.liquidacion.comentario && <p className="rounded-lg bg-white/5 p-3 text-sm text-slate-200">{revision.liquidacion.comentario}</p>}
                        <div>
                            <p className="mb-2 text-sm font-semibold text-slate-200">Facturas</p>
                            <ArchivosLiquidacion solicitudId={revision.id} archivos={revision.liquidacion.archivos} />
                        </div>
                        <ResumenCierreCC entregado={revision.monto} cierre={revision.liquidacion} textoMovimiento={textoCierreCajero(revision.liquidacion)} />
                        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                            <button type="button" onClick={() => setRevision(null)} disabled={cerrando} className={botonSecundario}>Cancelar</button>
                            <button type="button" onClick={() => setADevolver(revision)} disabled={cerrando} className="rounded-xl px-6 py-3 font-semibold text-orange-300 ring-1 ring-orange-400/40 transition hover:bg-orange-500/15">Devolver</button>
                            <button type="button" onClick={cerrar} disabled={cerrando} className={botonExito}>{cerrando ? "Cerrando..." : "Cerrar liquidación"}</button>
                        </div>
                    </div>
                )}
            </Modal>

            <RechazarCCModal solicitud={aDevolver} onCerrar={() => setADevolver(null)} onConfirmar={devolver} titulo="Devolver liquidación" etiqueta="¿Qué debe corregir?" boton="Devolver" />
        </>
    );
}

export default function LiquidacionesCajaChicaPage() {
    return (
        <RequireRole roles={[ROLES.CAJERO, ROLES.ADMIN]}>
            <Liquidaciones />
        </RequireRole>
    );
}
