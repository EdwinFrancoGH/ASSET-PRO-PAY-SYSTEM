"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FaArrowLeft } from "react-icons/fa";

import Seccion from "../../../../components/ui/Seccion";
import Cargando from "../../../../components/ui/Cargando";
import EstadoBadge from "../../../../components/peticiones/EstadoBadge";
import BarraProgreso from "../../../../components/peticiones/BarraProgreso";
import HistorialTimeline from "../../../../components/peticiones/HistorialTimeline";
import PanelAcciones from "../../../../components/peticiones/PanelAcciones";
import AdjuntosLista from "../../../../components/peticiones/AdjuntosLista";
import Dato from "../../../../components/peticiones/Dato";

import { obtenerPeticion } from "../../../../services/peticiones.service";
import { formatoMonto, formatoFecha, formatoFechaHora, mensajeError } from "../../../../utils/formato";

export default function DetallePeticionPage() {
    const { id } = useParams();
    const [peticion, setPeticion] = useState(null);
    const [error, setError] = useState("");

    const cargar = useCallback(async () => {
        try {
            const { data } = await obtenerPeticion(id);
            setPeticion(data.data);
        } catch (e) {
            setError(mensajeError(e, "No se pudo cargar la petición."));
        }
    }, [id]);

    useEffect(() => { cargar(); }, [cargar]);

    if (error) {
        return (
            <div className="rounded-2xl bg-white p-10 text-center shadow-lg">
                <p className="text-slate-700">{error}</p>
                <Link href="/peticiones" className="mt-4 inline-block text-blue-600 hover:underline">Volver a peticiones</Link>
            </div>
        );
    }
    if (!peticion) return <Cargando />;

    const p = peticion;
    const soporte = (p.adjuntos || []).filter((a) => a.categoria === "SOPORTE");
    const comprobantes = (p.adjuntos || []).filter((a) => a.categoria === "COMPROBANTE");
    const cuenta = p.cuentaBancaria;

    return (
        <div className="space-y-8">
            <Link href="/peticiones" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
                <FaArrowLeft /> Peticiones
            </Link>

            <div className="bg-gradient-to-r from-slate-900 to-slate-700 rounded-2xl p-8 text-white shadow-xl">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                        <div className="flex flex-wrap items-center gap-3">
                            <h1 className="text-3xl font-bold">{p.numero}</h1>
                            <EstadoBadge estado={p.estado} />
                        </div>
                        <p className="text-slate-300 mt-2">
                            {p.proveedorNombre || "Sin proveedor"}. Solicitada por {p.solicitanteNombre} el {formatoFecha(p.fechaSolicitud)}.
                        </p>
                    </div>
                    <div className="md:text-right">
                        <p className="text-sm text-slate-300">Monto a pagar</p>
                        <p className="text-3xl font-bold">{formatoMonto(p.montoPagar, p.moneda)}</p>
                    </div>
                </div>
                <div className="mt-8 rounded-xl bg-white p-4">
                    <BarraProgreso estado={p.estado} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                        <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                            <Dato etiqueta="Fecha Solicitud">{formatoFecha(p.fechaSolicitud)}</Dato>
                            <Dato etiqueta="Área">{p.areaNombre}</Dato>
                            <Dato etiqueta="Orden ELM">{p.ordenELM}</Dato>
                            <Dato etiqueta="Ticket Compromiso">{p.ticketCompromiso}</Dato>
                        </dl>
                    </Seccion>

                    <Seccion titulo="Información del Proveedor">
                        <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            <Dato etiqueta="Proveedor">{p.proveedorNombre}</Dato>
                            <Dato etiqueta="Código SAP">{p.codigoSAP}</Dato>
                            <Dato etiqueta="Solicitante">{p.solicitanteNombre}</Dato>
                            <Dato etiqueta="Proforma">{p.proforma}</Dato>
                            <Dato etiqueta="Términos de Pago">{p.terminoPagoNombre}</Dato>
                            <Dato etiqueta="Monto Compra">{formatoMonto(p.montoCompra, p.moneda)}</Dato>
                            <Dato etiqueta="Razón del Pago" largo className="md:col-span-2 lg:col-span-3">{p.razonPago}</Dato>
                        </dl>
                    </Seccion>

                    <Seccion titulo="Información del Cliente">
                        <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                            <Dato etiqueta="Cliente">{p.cliente}</Dato>
                            <Dato etiqueta="Licitación / OC">{p.licitacionOC}</Dato>
                            <Dato etiqueta="Fecha Entrega">{p.fechaEntrega ? formatoFecha(p.fechaEntrega) : ""}</Dato>
                            <Dato etiqueta="Proyecto">{p.proyecto}</Dato>
                        </dl>
                    </Seccion>

                    <Seccion titulo="Información del Pago">
                        <dl className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                            <Dato etiqueta="%">{p.porcentaje !== null && p.porcentaje !== undefined ? `${p.porcentaje}%` : ""}</Dato>
                            <Dato etiqueta="Monto">{formatoMonto(p.monto, p.moneda)}</Dato>
                            <Dato etiqueta="Moneda">{p.moneda}</Dato>
                            <Dato etiqueta="Autoriza">{p.autorizadorNombre}</Dato>
                            <Dato etiqueta="Monto a Pagar"><strong>{formatoMonto(p.montoPagar, p.moneda)}</strong></Dato>
                            <Dato etiqueta="Concepto de Compra" largo className="md:col-span-2 lg:col-span-5">{p.conceptoCompra}</Dato>
                        </dl>
                    </Seccion>

                    <Seccion titulo="Datos Bancarios">
                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <Dato etiqueta="¿Pagar a una cuenta diferente?">{p.pagarCuentaDiferente ? "Sí" : "No"}</Dato>
                            {p.pagarCuentaDiferente ? (
                                <Dato etiqueta="Nueva Cuenta Bancaria" largo>{p.nuevaCuentaBancaria}</Dato>
                            ) : (
                                <Dato etiqueta="Cuenta Registrada">
                                    {cuenta && (
                                        <>
                                            {cuenta.banco}, {cuenta.tipoCuenta} {cuenta.numeroCuenta} ({cuenta.moneda})
                                            {cuenta.titular && <><br />Titular: {cuenta.titular}</>}
                                            {cuenta.swift && <><br />SWIFT: {cuenta.swift}</>}
                                        </>
                                    )}
                                </Dato>
                            )}
                        </dl>
                    </Seccion>

                    <Seccion titulo="Documentos de Soporte">
                        <AdjuntosLista peticionId={p.id} adjuntos={soporte} />
                    </Seccion>

                    <Seccion titulo="Observaciones">
                        <p className={`whitespace-pre-line ${p.observaciones ? "text-slate-800" : "text-slate-400"}`}>{p.observaciones || "Sin observaciones."}</p>
                    </Seccion>
                </div>

                <aside className="space-y-8">
                    <PanelAcciones peticion={p} onActualizada={setPeticion} />

                    <div className="bg-white rounded-2xl shadow-lg p-6">
                        <h2 className="text-lg font-semibold text-slate-700 mb-6">Historial</h2>
                        <HistorialTimeline historial={p.historial} />
                        <p className="mt-6 text-xs text-slate-400">Última actualización: {formatoFechaHora(p.fechaActualizacion)}</p>
                    </div>
                </aside>
            </div>
        </div>
    );
}
