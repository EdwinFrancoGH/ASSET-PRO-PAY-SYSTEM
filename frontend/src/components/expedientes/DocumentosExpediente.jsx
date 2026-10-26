"use client";

import { useState } from "react";
import Link from "next/link";
import {
    FaFilePdf, FaFileImage, FaFileExcel, FaFileWord, FaFileAlt, FaDownload, FaEye, FaPrint,
    FaFileInvoiceDollar, FaPaperclip, FaReceipt, FaFileSignature
} from "react-icons/fa";
import { descargarAdjuntoExpediente, descargarFacturaCompensacion } from "../../services/expedientes.service";
import { descargarBlob, abrirBlob } from "../../utils/descargas";
import { formatoTamano, formatoFecha, formatoFechaHora, formatoMonto, mensajeError } from "../../utils/formato";
import { alertaError } from "../ui/alertas";

// "Documentos del expediente": todo lo del anticipo en un solo lugar, cada
// archivo con Ver / Descargar. Solo lectura.
//   grupos: qué bloques mostrar (por defecto todos). En el detalle de la
//           petición se usa solo ["facturas"].

const icono = (tipo = "") => {
    if (tipo.includes("pdf")) return <FaFilePdf className="text-red-500" />;
    if (tipo.startsWith("image/")) return <FaFileImage className="text-sky-400" />;
    if (tipo.includes("sheet") || tipo.includes("excel")) return <FaFileExcel className="text-emerald-400" />;
    if (tipo.includes("word")) return <FaFileWord className="text-blue-400" />;
    return <FaFileAlt className="text-slate-400" />;
};

const plural = (n, palabra) => `${n} ${palabra}${n === 1 ? "" : "s"}`;

const sePuedeVer = (tipo = "") => tipo.includes("pdf") || tipo.startsWith("image/");

function Grupo({ icono: Icono, titulo, cantidad, children }) {
    return (
        <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Icono className="text-blue-300" /> {titulo}
                {cantidad !== undefined && (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-slate-300">{cantidad}</span>
                )}
            </h3>
            {children}
        </div>
    );
}

function Vacio({ children }) {
    return <p className="rounded-xl border border-dashed border-white/15 px-4 py-3 text-sm text-slate-400">{children}</p>;
}

// Una fila de archivo con botones Ver / Descargar.
function Archivo({ nombre, tipo, detalle, extra, tachado, ocupado, onVer, onDescargar }) {
    return (
        <li className={`flex items-center gap-3 px-4 py-3 ${tachado ? "opacity-60" : ""}`}>
            <span className="flex-none text-2xl">{icono(tipo)}</span>
            <div className="min-w-0 flex-1">
                <p className={`break-words text-sm font-medium text-slate-100 sm:text-base ${tachado ? "line-through" : ""}`}>{nombre}</p>
                <p className="text-xs text-slate-400">{detalle}</p>
                {extra}
            </div>
            <div className="flex flex-none gap-1">
                {sePuedeVer(tipo) && (
                    <button type="button" onClick={onVer} disabled={ocupado} className="rounded-lg p-2 text-slate-300 hover:bg-white/10 disabled:opacity-50" aria-label={`Ver ${nombre}`} title="Ver">
                        <FaEye />
                    </button>
                )}
                <button type="button" onClick={onDescargar} disabled={ocupado} className="rounded-lg p-2 text-slate-300 hover:bg-white/10 disabled:opacity-50" aria-label={`Descargar ${nombre}`} title="Descargar">
                    <FaDownload />
                </button>
            </div>
        </li>
    );
}

export default function DocumentosExpediente({ expediente: e, grupos = ["solicitud", "soporte", "comprobante", "facturas"] }) {
    const [ocupado, setOcupado] = useState(null);
    const mostrar = (g) => grupos.includes(g);

    const soporte = e.documentos?.soporte || [];
    const comprobantes = e.documentos?.comprobantes || [];
    const facturas = e.compensaciones || [];
    const vigentes = facturas.filter((c) => !c.anulada);

    // accion: "ver" | "descargar"
    const obtener = async (clave, pedir, nombre, accion) => {
        setOcupado(clave);
        try {
            const respuesta = await pedir();
            accion === "ver" ? abrirBlob(respuesta) : descargarBlob(respuesta, nombre);
        } catch (err) {
            alertaError(mensajeError(err, "No se pudo abrir el archivo."));
        } finally {
            setOcupado(null);
        }
    };

    const filaAdjunto = (a) => (
        <Archivo
            key={a.id}
            nombre={a.nombre}
            tipo={a.tipo}
            detalle={`${formatoTamano(a.tamano)} · ${a.subidoPorNombre || "—"} · ${formatoFechaHora(a.fecha)}`}
            ocupado={ocupado === a.id}
            onVer={() => obtener(a.id, () => descargarAdjuntoExpediente(e.id, a.id), a.nombre, "ver")}
            onDescargar={() => obtener(a.id, () => descargarAdjuntoExpediente(e.id, a.id), a.nombre, "descargar")}
        />
    );

    return (
        <div className="space-y-6">
            {mostrar("solicitud") && (
                <Grupo icono={FaFileSignature} titulo="Solicitud de pago">
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                            <FaFileInvoiceDollar className="flex-none text-2xl text-blue-300" />
                            <div className="min-w-0">
                                <p className="font-medium text-slate-100">Solicitud {e.numero}</p>
                                <p className="text-xs text-slate-400">Hoja con datos, cálculo, cuenta destino y aprobaciones. Imprime o guarda como PDF.</p>
                            </div>
                        </div>
                        <Link
                            href={`/peticiones/${e.peticionId}/imprimir`}
                            target="_blank"
                            className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-slate-100 ring-1 ring-white/15 hover:bg-white/20"
                        >
                            <FaPrint /> Imprimir
                        </Link>
                    </div>
                </Grupo>
            )}

            {mostrar("soporte") && (
                <Grupo icono={FaPaperclip} titulo="Documentos de soporte" cantidad={soporte.length}>
                    {soporte.length ? (
                        <ul className="divide-y rounded-xl border border-white/10">{soporte.map(filaAdjunto)}</ul>
                    ) : (
                        <Vacio>La petición no tiene documentos de soporte.</Vacio>
                    )}
                </Grupo>
            )}

            {mostrar("comprobante") && (
                <Grupo icono={FaReceipt} titulo="Comprobante de pago" cantidad={comprobantes.length}>
                    {comprobantes.length ? (
                        <ul className="divide-y rounded-xl border border-white/10">{comprobantes.map(filaAdjunto)}</ul>
                    ) : (
                        <Vacio>{e.pagada ? "No se encontró el comprobante del pago." : "Aún no se registra el pago."}</Vacio>
                    )}
                </Grupo>
            )}

            {mostrar("facturas") && (
                <Grupo
                    icono={FaFileInvoiceDollar}
                    titulo="Facturas que compensan el anticipo"
                    cantidad={facturas.length > vigentes.length ? `${plural(vigentes.length, "vigente")} · ${plural(facturas.length - vigentes.length, "anulada")}` : vigentes.length}
                >
                    {facturas.length ? (
                        <ul className="divide-y rounded-xl border border-white/10">
                            {facturas.map((c) => (
                                <Archivo
                                    key={c.id}
                                    nombre={`Factura ${c.numeroFactura} · ${formatoMonto(c.valor, e.moneda)}`}
                                    tipo={c.archivo?.tipo}
                                    tachado={c.anulada}
                                    detalle={`${c.archivo?.nombre || "—"} · fecha ${formatoFecha(c.fechaFactura)} · cargada por ${c.registradoPorNombre || "—"}`}
                                    extra={c.anulada && <p className="text-xs text-red-300">Anulada: {c.motivoAnulacion}</p>}
                                    ocupado={ocupado === c.id}
                                    onVer={() => obtener(c.id, () => descargarFacturaCompensacion(e.id, c.id), c.archivo?.nombre, "ver")}
                                    onDescargar={() => obtener(c.id, () => descargarFacturaCompensacion(e.id, c.id), c.archivo?.nombre, "descargar")}
                                />
                            ))}
                        </ul>
                    ) : (
                        <Vacio>{e.pagada ? "Aún no hay facturas asociadas." : "Se podrán asociar facturas cuando el anticipo esté pagado."}</Vacio>
                    )}
                </Grupo>
            )}
        </div>
    );
}
