"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FaArrowLeft, FaPrint } from "react-icons/fa";

import Seccion from "../../../../components/ui/Seccion";
import Cargando from "../../../../components/ui/Cargando";
import EstadoBadge from "../../../../components/peticiones/EstadoBadge";
import BarraProgreso from "../../../../components/peticiones/BarraProgreso";
import HistorialTimeline from "../../../../components/peticiones/HistorialTimeline";
import PanelAcciones from "../../../../components/peticiones/PanelAcciones";
import AdjuntosLista from "../../../../components/peticiones/AdjuntosLista";
import Dato from "../../../../components/peticiones/Dato";
import TipoBadge from "../../../../components/peticiones/TipoBadge";
import DatosCuenta from "../../../../components/peticiones/DatosCuenta";

import { obtenerPeticion } from "../../../../services/peticiones.service";
import { formatoMonto, formatoFecha, formatoFechaHora, mensajeError } from "../../../../utils/formato";
import { licitacionOCProyecto, etiquetaTipoCliente } from "../../../../utils/peticion";
import { tipoDePeticion, ORIGENES } from "../../../../utils/bancario";
import { montoFinal } from "../../../../utils/impuestos";
import CalculoPago from "../../../../components/peticiones/CalculoPago";
import DocumentosExpediente from "../../../../components/expedientes/DocumentosExpediente";
import { obtenerExpediente } from "../../../../services/expedientes.service";
import BotonDescargarExpediente from "../../../../components/expedientes/BotonDescargarExpediente";

export default function DetallePeticionPage() {
    const { id } = useParams();
    const [peticion, setPeticion] = useState(null);
    const [error, setError] = useState("");
    // Si es un anticipo pagado: su expediente (facturas que lo compensan).
    const [expediente, setExpediente] = useState(null);

    const cargar = useCallback(async () => {
        try {
            const { data } = await obtenerPeticion(id);
            setPeticion(data.data);
        } catch (e) {
            setError(mensajeError(e, "No se pudo cargar la petición."));
        }
    }, [id]);

    useEffect(() => { cargar(); }, [cargar]);

    // Solo los anticipos tienen expediente; para el resto (o sin permiso) el
    // backend responde 404 y simplemente no se muestra la sección.
    const pagada = peticion?.estado === "PAGADA";
    useEffect(() => {
        if (!pagada) return;
        obtenerExpediente(id).then(({ data }) => setExpediente(data.data)).catch(() => setExpediente(null));
    }, [id, pagada]);

    if (error) {
        return (
            <div className="rounded-2xl bg-slate-800/35 backdrop-blur-xl ring-1 ring-white/15 p-10 text-center shadow-lg">
                <p className="text-slate-200">{error}</p>
                <Link href="/peticiones" className="mt-4 inline-block text-blue-400 hover:underline">Volver a peticiones</Link>
            </div>
        );
    }
    if (!peticion) return <Cargando />;

    const p = peticion;
    const soporte = (p.adjuntos || []).filter((a) => a.categoria === "SOPORTE");
    const comprobantes = (p.adjuntos || []).filter((a) => a.categoria === "COMPROBANTE");
    const cuenta = p.cuentaBancaria;
    const tipo = tipoDePeticion(p);

    return (
        <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <Link href="/peticiones" className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white">
                    <FaArrowLeft /> Peticiones
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                    {/* Expediente completo en ZIP (solo pagadas) */}
                    {p.estado === "PAGADA" && <BotonDescargarExpediente peticionId={p.id} numero={p.numero} />}
                    {/* Hoja de la solicitud para imprimir o guardar como PDF */}
                    <Link
                        href={`/peticiones/${p.id}/imprimir`}
                        target="_blank"
                        className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold text-slate-100 ring-1 ring-white/15 transition hover:bg-white/20"
                    >
                        <FaPrint /> Imprimir solicitud
                    </Link>
                </div>
            </div>

            <div className="rounded-3xl border border-white/15 bg-slate-800/35 backdrop-blur-xl p-5 sm:p-8 text-white shadow-2xl shadow-black/40">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="break-words text-2xl font-bold sm:text-3xl">{p.numero}</h1>
                            <EstadoBadge estado={p.estado} />
                            <TipoBadge tipo={tipo} />
                        </div>
                        <p className="text-slate-300 mt-2">
                            {p.proveedorNombre || "Sin proveedor"}. Solicitada por {p.solicitanteNombre} el {formatoFecha(p.fechaSolicitud)}.
                        </p>
                    </div>
                    <div className="md:text-right">
                        <p className="text-sm text-slate-300">{p.calculo ? "Pago efectivo al proveedor" : "Monto a pagar"}</p>
                        <p className="text-2xl font-bold sm:text-3xl">{formatoMonto(montoFinal(p), p.moneda)}</p>
                    </div>
                </div>
                <div className="mt-8 rounded-xl bg-white/5 ring-1 ring-white/10 p-4">
                    <BarraProgreso estado={p.estado} />
                </div>
            </div>

            {p.planId && (
                <div className="rounded-2xl border border-blue-400/30 bg-blue-500/15 p-5 text-blue-100">
                    Cuota {p.cuotaNumero} de {p.cuotasTotal}: <strong>{p.cuotaNombre}</strong> ·{" "}
                    <Link href={`/planes/${p.planId}`} className="underline hover:text-white">Ver plan {p.planNumero}</Link>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {p.pago && (
                        <Seccion titulo="Pago realizado">
                            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                <Dato etiqueta="Fecha de pago">{formatoFecha(p.pago.fechaPago)}</Dato>
                                <Dato etiqueta="Referencia">{p.pago.referencia}</Dato>
                                <Dato etiqueta="Registrado por">{p.pago.registradoPorNombre}</Dato>
                            </dl>
                            <div className="mt-6">
                                <AdjuntosLista peticionId={p.id} adjuntos={comprobantes} />
                            </div>
                        </Seccion>
                    )}

                    <Seccion titulo="Información General">
                        <dl className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-5">
                            <Dato etiqueta="Fecha Solicitud">{formatoFecha(p.fechaSolicitud)}</Dato>
                            <Dato etiqueta="Área">{p.areaNombre}</Dato>
                            {p.tipoCliente !== "GASTO_OPERATIVO" && <Dato etiqueta="Orden ELM">{p.ordenELM}</Dato>}
                            <Dato etiqueta="Solicitante">{p.solicitanteNombre}</Dato>
                            <Dato etiqueta="Tipo">{etiquetaTipoCliente(p)}</Dato>
                        </dl>
                    </Seccion>

                    <Seccion titulo="Información del Proveedor">
                        <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            <Dato etiqueta="Proveedor">{p.proveedorNombre}</Dato>
                            <Dato etiqueta="Código SAP">{p.codigoSAP}</Dato>
                            {p.terminoPagoNombre && <Dato etiqueta="Términos de Pago">{p.terminoPagoNombre}</Dato>}
                        </dl>
                    </Seccion>

                    {/* Solo aplica cuando el Tipo es "Cliente" (o peticiones antiguas sin tipo) */}
                    {(!p.tipoCliente || p.tipoCliente === "CLIENTE") && (
                        <Seccion titulo="Información del Cliente">
                            <dl className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <Dato etiqueta="Cliente">{p.cliente}</Dato>
                                <Dato etiqueta="Licitación / OC / Proyecto">{licitacionOCProyecto(p)}</Dato>
                            </dl>
                        </Seccion>
                    )}

                    <Seccion titulo="Información del Pago">
                        <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                            <Dato etiqueta="Monto">{formatoMonto(p.monto, p.moneda)}</Dato>
                            <Dato etiqueta="%">{p.porcentaje !== null && p.porcentaje !== undefined ? `${p.porcentaje}%` : ""}</Dato>
                            <Dato etiqueta="Moneda">{p.moneda}</Dato>
                            <Dato etiqueta="Autoriza">{p.autorizadorNombre}</Dato>
                            <Dato etiqueta={p.calculo ? "Monto a Pagar (sin IVA)" : "Monto a Pagar"}><strong>{formatoMonto(p.montoPagar, p.moneda)}</strong></Dato>
                            <Dato etiqueta="Concepto/Detalle o comentario de la compra" largo className="md:col-span-2 lg:col-span-5">{p.conceptoCompra}</Dato>
                        </dl>
                        {tipo === ORIGENES.LOCAL && p.calculo && (
                            <div className="mt-6">
                                <CalculoPago
                                    calculo={p.calculo}
                                    clasificacion={p.clasificacionContribuyente}
                                    documento={p.documentoFiscal}
                                    aplicaRetencionRenta={p.aplicaRetencionRenta}
                                    moneda={p.moneda}
                                />
                            </div>
                        )}
                    </Seccion>

                    <Seccion titulo="Datos Bancarios" acciones={<TipoBadge tipo={tipo} />}>
                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Dato etiqueta="¿Pagar a una cuenta diferente?">{p.pagarCuentaDiferente ? "Sí" : "No"}</Dato>
                            {/* Peticiones antiguas: cuenta diferente escrita como texto libre. */}
                            {p.pagarCuentaDiferente && !cuenta && <Dato etiqueta="Nueva Cuenta Bancaria" largo>{p.nuevaCuentaBancaria}</Dato>}
                        </dl>
                        {(cuenta || !p.pagarCuentaDiferente) && (
                            <div className="mt-5">
                                {cuenta ? <DatosCuenta cuenta={cuenta} tipo={tipo} /> : <p className="text-slate-400">Sin cuenta seleccionada.</p>}
                            </div>
                        )}
                    </Seccion>

                    <Seccion titulo="Documentos de Soporte">
                        <AdjuntosLista peticionId={p.id} adjuntos={soporte} />
                    </Seccion>

                    {expediente && (
                        <Seccion
                            titulo="Facturas del anticipo"
                            acciones={<Link href={`/expediente/${p.id}`} className="text-sm text-blue-300 hover:underline">Ver expediente</Link>}
                        >
                            <DocumentosExpediente expediente={expediente} grupos={["facturas"]} />
                        </Seccion>
                    )}

                    {/* Peticiones antiguas: observaciones (el campo ya no se captura). */}
                    {p.observaciones && (
                        <Seccion titulo="Observaciones">
                            <p className={`whitespace-pre-line ${p.observaciones ? "text-slate-100" : "text-slate-400"}`}>{p.observaciones || "Sin observaciones."}</p>
                        </Seccion>
                    )}
                </div>

                <aside className="space-y-8">
                    <PanelAcciones peticion={p} onActualizada={setPeticion} />

                    <div className="bg-slate-800/35 backdrop-blur-xl ring-1 ring-white/15 rounded-2xl shadow-lg p-6">
                        <h2 className="text-lg font-semibold text-slate-200 mb-6">Historial</h2>
                        <HistorialTimeline historial={p.historial} />
                        <p className="mt-6 text-xs text-slate-400">Última actualización: {formatoFechaHora(p.fechaActualizacion)}</p>
                    </div>
                </aside>
            </div>
        </div>
    );
}
