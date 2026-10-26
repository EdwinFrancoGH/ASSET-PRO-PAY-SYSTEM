import LogoAssetPro from "../auth/LogoAssetPro";
import { INFO_ESTADO } from "../../utils/estados";
import { formatoMonto, formatoFecha, formatoFechaHora } from "../../utils/formato";
import { licitacionOCProyecto, etiquetaTipoCliente } from "../../utils/peticion";
import { tipoDePeticion, filasCuenta, ORIGENES, ETIQUETA_ORIGEN } from "../../utils/bancario";
import { montoFinal, CLASIFICACIONES, DOCUMENTOS, ETIQUETA_CLASIFICACION, ETIQUETA_DOCUMENTO } from "../../utils/impuestos";

// Hoja "Solicitud de pago" para imprimir o guardar como PDF (tamaño carta).
// Solo muestra datos: no modifica la petición.
// Colores fijos (blanco y azul) para que salga igual en modo día y noche.

// Último registro del historial con alguna de las acciones indicadas.
const ultimo = (historial = [], acciones) => [...historial].reverse().find((h) => acciones.includes(h.accion));

function Titulo({ children }) {
    return (
        <h2 className="mb-2 mt-5 border-b border-slate-200 pb-1 text-[11px] print:mb-1.5 print:mt-3 font-bold uppercase tracking-wider text-blue-700">
            {children}
        </h2>
    );
}

function Campo({ etiqueta, children, className = "" }) {
    return (
        <div className={className}>
            <dt className="text-[9px] uppercase tracking-wide text-slate-500">{etiqueta}</dt>
            <dd className="font-semibold text-slate-900">{children || "—"}</dd>
        </div>
    );
}

function Firma({ rol, registro, pendiente }) {
    return (
        <div className="text-center">
            <div className="mt-10 border-t border-slate-900 pt-1 font-bold print:mt-8 text-slate-900">{registro?.usuarioNombre || pendiente?.nombre || " "}</div>
            <div className="text-[10px] text-slate-500">{rol}</div>
            {registro ? (
                <div className="mt-0.5 text-[9.5px] text-emerald-700">✔ {pendiente?.verbo} {formatoFechaHora(registro.fecha)}</div>
            ) : (
                <div className="mt-0.5 text-[9.5px] text-slate-400">Pendiente</div>
            )}
        </div>
    );
}

// Filas del cálculo del pago (mismo criterio que CalculoPago.jsx).
const filasCalculo = (p, tipo) => {
    const c = p.calculo;
    if (tipo !== ORIGENES.LOCAL || !c) {
        return [
            ["Monto base", formatoMonto(p.monto, p.moneda)],
            ["Porcentaje", p.porcentaje !== null && p.porcentaje !== undefined ? `${p.porcentaje}%` : "—"],
            ["Monto a pagar", formatoMonto(p.montoPagar, p.moneda)]
        ];
    }
    if (p.documentoFiscal === DOCUMENTOS.CONSUMIDOR_FINAL) {
        return [
            ["Monto base", formatoMonto(p.monto, p.moneda)],
            ["Porcentaje", `${p.porcentaje ?? "—"}%`],
            ["Monto a pagar (impuestos incluidos)", formatoMonto(c.subtotal, p.moneda)]
        ];
    }
    const noInscrito = p.clasificacionContribuyente === CLASIFICACIONES.NO_INSCRITO || p.documentoFiscal === DOCUMENTOS.SUJETO_EXCLUIDO;
    const filas = [
        ["Monto base", formatoMonto(p.monto, p.moneda)],
        ["Porcentaje", `${p.porcentaje ?? "—"}%`],
        ["Subtotal sin IVA", formatoMonto(c.subtotal, p.moneda)]
    ];
    if (!noInscrito) filas.push(["IVA 13%", `+ ${formatoMonto(c.iva || 0, p.moneda)}`]);
    if (c.retencionIva > 0) filas.push(["Retención IVA 1%", `− ${formatoMonto(c.retencionIva, p.moneda)}`]);
    if (c.retencionRenta > 0) filas.push(["Retención Renta 10%", `− ${formatoMonto(c.retencionRenta, p.moneda)}`]);
    return filas;
};

export default function SolicitudImprimible({ peticion: p, generadoPor }) {
    const tipo = tipoDePeticion(p);
    const estado = INFO_ESTADO[p.estado]?.etiqueta || p.estado;
    const esCliente = !p.tipoCliente || p.tipoCliente === "CLIENTE";
    const cuenta = p.cuentaBancaria;
    const grupos = filasCuenta(cuenta, tipo).reduce((acc, f) => {
        (acc[f.grupo] ||= []).push(f);
        return acc;
    }, {});
    const adjuntos = p.adjuntos || [];
    const comprobante = adjuntos.find((a) => a.id === p.pago?.comprobanteId) || adjuntos.find((a) => a.categoria === "COMPROBANTE");

    const envio = ultimo(p.historial, ["ENVIADA", "REENVIADA"]);
    const autorizacion = ultimo(p.historial, ["APROBADA_AUTORIZADOR"]);
    const contabilidad = ultimo(p.historial, ["APROBADA_CONTABILIDAD"]);

    return (
        <article className="hoja-solicitud mx-auto w-full max-w-[816px] bg-white px-6 py-8 text-[11px] leading-snug text-slate-900 shadow-2xl sm:px-12 sm:py-10 print:max-w-none print:p-0 print:shadow-none">
            {/* Encabezado */}
            <header className="flex flex-col gap-4 border-b-[3px] border-blue-700 pb-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                    <LogoAssetPro className="h-11 w-11 flex-none" />
                    <div>
                        <p className="text-lg font-bold leading-tight">Electrolab Médic</p>
                        <p className="text-[10px] text-slate-500">ASSET PRO PAY · Peticiones de pago</p>
                    </div>
                </div>
                <div className="sm:text-right">
                    <p className="text-base font-bold tracking-wide">SOLICITUD DE PAGO</p>
                    <p className="text-xl font-extrabold text-blue-700">{p.numero || "Sin número"}</p>
                    <p className="text-[10px] text-slate-500">Fecha de solicitud: {formatoFecha(p.fechaSolicitud)}</p>
                    <span className="mt-1 inline-block rounded-full border border-slate-300 bg-slate-100 px-3 py-0.5 text-[10px] font-bold uppercase">
                        {estado}
                    </span>
                </div>
            </header>

            <section className="break-inside-avoid">
                <Titulo>Información general</Titulo>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                    <Campo etiqueta="Área">{p.areaNombre}</Campo>
                    <Campo etiqueta="Solicitante">{p.solicitanteNombre}</Campo>
                    {p.tipoCliente !== "GASTO_OPERATIVO" && <Campo etiqueta="Orden ELM">{p.ordenELM}</Campo>}
                    <Campo etiqueta="Tipo">{etiquetaTipoCliente(p)}</Campo>
                    {esCliente && (
                        <>
                            <Campo etiqueta="Cliente" className="col-span-2">{p.cliente}</Campo>
                            <Campo etiqueta="Licitación / OC / Proyecto" className="col-span-2">{licitacionOCProyecto(p)}</Campo>
                        </>
                    )}
                </dl>
            </section>

            <section className="break-inside-avoid">
                <Titulo>Proveedor y pago</Titulo>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                    <Campo etiqueta="Proveedor" className="col-span-2">{p.proveedorNombre}</Campo>
                    <Campo etiqueta="Código SAP">{p.codigoSAP}</Campo>
                    <Campo etiqueta="Origen">{ETIQUETA_ORIGEN[tipo]}</Campo>
                    <Campo etiqueta="Término de pago">{p.terminoPagoNombre}</Campo>
                    {p.planId && (
                        <Campo etiqueta="Plan / cuota">
                            {p.planNumero} · {p.cuotaNombre} ({p.cuotaNumero} de {p.cuotasTotal})
                        </Campo>
                    )}
                    <Campo etiqueta="Moneda">{p.moneda}</Campo>
                    <Campo etiqueta="Autoriza">{p.autorizadorNombre}</Campo>
                </dl>
            </section>

            <div className="grid grid-cols-1 gap-x-5 sm:grid-cols-[1.3fr_1fr] print:grid-cols-[1.3fr_1fr]">
                <div>
                    <section className="break-inside-avoid">
                        <Titulo>Concepto de la compra</Titulo>
                        <p className="whitespace-pre-line leading-relaxed">{p.conceptoCompra || "—"}</p>
                    </section>

                    <section className="break-inside-avoid">
                        <Titulo>Datos bancarios del pago {p.pagarCuentaDiferente ? "(cuenta diferente)" : ""}</Titulo>
                        {Object.keys(grupos).length ? (
                            Object.entries(grupos).map(([grupo, filas]) => (
                                <div key={grupo} className="mb-2 print:mb-1">
                                    {Object.keys(grupos).length > 1 && <p className="mb-1 text-[10px] font-semibold text-slate-600 print:mb-0.5">{grupo}</p>}
                                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 print:gap-y-1">
                                        {filas.map((f) => (
                                            <Campo key={grupo + f.etiqueta} etiqueta={f.etiqueta}>{f.valor}</Campo>
                                        ))}
                                    </dl>
                                </div>
                            ))
                        ) : (
                            <p>{p.nuevaCuentaBancaria || "Sin cuenta seleccionada."}</p>
                        )}
                    </section>
                </div>

                <section className="break-inside-avoid">
                    <Titulo>Cálculo del pago</Titulo>
                    <table className="w-full border-collapse">
                        <tbody>
                            {filasCalculo(p, tipo).map(([etiqueta, valor]) => (
                                <tr key={etiqueta}>
                                    <td className="border border-slate-200 px-2 py-1">{etiqueta}</td>
                                    <td className="whitespace-nowrap border border-slate-200 px-2 py-1 text-right tabular-nums">{valor}</td>
                                </tr>
                            ))}
                            <tr className="bg-blue-50 font-extrabold">
                                <td className="border border-slate-200 px-2 py-1.5">Pago efectivo al proveedor</td>
                                <td className="whitespace-nowrap border border-slate-200 px-2 py-1.5 text-right text-xs tabular-nums">
                                    {formatoMonto(montoFinal(p), p.moneda)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    {tipo === ORIGENES.LOCAL && p.calculo && (
                        <p className="mt-1 text-[9.5px] text-slate-500">
                            {ETIQUETA_CLASIFICACION[p.clasificacionContribuyente] || "Clasificación no definida"} · Documento: {ETIQUETA_DOCUMENTO[p.documentoFiscal] || "—"}
                        </p>
                    )}
                </section>
            </div>

            {p.pago && (
                <section className="break-inside-avoid">
                    <Titulo>Registro de pago</Titulo>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                        <Campo etiqueta="Fecha de pago">{formatoFecha(p.pago.fechaPago)}</Campo>
                        <Campo etiqueta="Referencia">{p.pago.referencia}</Campo>
                        <Campo etiqueta="Registrado por">{p.pago.registradoPorNombre}</Campo>
                        <Campo etiqueta="Comprobante">{comprobante?.nombre}</Campo>
                    </dl>
                </section>
            )}

            <section className="break-inside-avoid">
                <Titulo>Documentos adjuntos</Titulo>
                {adjuntos.length ? (
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-100 text-left text-[9.5px] uppercase text-slate-600">
                                <th className="border border-slate-200 px-2 py-1">#</th>
                                <th className="border border-slate-200 px-2 py-1">Documento</th>
                                <th className="border border-slate-200 px-2 py-1">Tipo</th>
                                <th className="border border-slate-200 px-2 py-1">Cargado por</th>
                                <th className="border border-slate-200 px-2 py-1">Fecha</th>
                            </tr>
                        </thead>
                        <tbody>
                            {adjuntos.map((a, i) => (
                                <tr key={a.id || i}>
                                    <td className="border border-slate-200 px-2 py-1">{i + 1}</td>
                                    <td className="break-all border border-slate-200 px-2 py-1">{a.nombre}</td>
                                    <td className="border border-slate-200 px-2 py-1">{a.categoria === "COMPROBANTE" ? "Comprobante de pago" : "Soporte"}</td>
                                    <td className="border border-slate-200 px-2 py-1">{a.subidoPorNombre || "—"}</td>
                                    <td className="whitespace-nowrap border border-slate-200 px-2 py-1">{formatoFecha(a.fecha)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="text-slate-500">Sin documentos adjuntos.</p>
                )}
            </section>

            {p.observaciones && (
                <section className="break-inside-avoid">
                    <Titulo>Observaciones</Titulo>
                    <p className="whitespace-pre-line">{p.observaciones}</p>
                </section>
            )}

            <section className="break-inside-avoid">
                <Titulo>Aprobaciones</Titulo>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 print:grid-cols-3">
                    <Firma rol="Solicitante" registro={envio} pendiente={{ nombre: p.solicitanteNombre, verbo: "Enviada" }} />
                    <Firma rol="Autorizador" registro={autorizacion} pendiente={{ nombre: p.autorizadorNombre, verbo: "Autorizada" }} />
                    <Firma rol="Contabilidad" registro={contabilidad} pendiente={{ nombre: "", verbo: "Aprobada" }} />
                </div>
            </section>

            <footer className="mt-6 print:mt-2 flex flex-col gap-1 border-t border-slate-200 pt-1.5 text-[9px] text-slate-500 sm:flex-row sm:justify-between">
                <span>Generado por ASSET PRO PAY el {formatoFechaHora(new Date().toISOString())}{generadoPor ? ` · ${generadoPor}` : ""}</span>
                <span>{p.numero}</span>
            </footer>
        </article>
    );
}
