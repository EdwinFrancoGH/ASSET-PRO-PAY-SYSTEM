import ExcelJS from "exceljs";
import { ETIQUETAS_ESTADO } from "../config/estados.js";

const fechaCorta = (iso) => (iso ? iso.slice(0, 10) : "");
const fechaHora = (iso) => (iso ? new Date(iso).toLocaleString("es-SV", { timeZone: "America/El_Salvador" }) : "");

const buscarEnHistorial = (p, accion) => [...(p.historial || [])].reverse().find((h) => h.accion === accion);

const cuentaDestino = (p) => {
    if (p.pagarCuentaDiferente) return p.nuevaCuentaBancaria || "";
    const c = p.cuentaBancaria;
    if (!c) return "";
    return [c.banco, c.tipoCuenta, c.numeroCuenta, c.titular && `Titular: ${c.titular}`, c.moneda, c.swift && `SWIFT: ${c.swift}`]
        .filter(Boolean)
        .join(" | ");
};

// Todas las columnas del layout + trazabilidad del flujo. El orden aquí
// es el orden de las columnas en el Excel.
const COLUMNAS = [
    { header: "Número", key: "numero", width: 16, valor: (p) => p.numero },
    { header: "Estado", key: "estado", width: 24, valor: (p) => ETIQUETAS_ESTADO[p.estado] || p.estado },

    { header: "Fecha solicitud", key: "fechaSolicitud", width: 14, valor: (p) => p.fechaSolicitud || "" },
    { header: "Área", key: "area", width: 20, valor: (p) => p.areaNombre },
    { header: "Orden ELM", key: "ordenELM", width: 14, valor: (p) => p.ordenELM },
    { header: "Ticket compromiso", key: "ticket", width: 16, valor: (p) => p.ticketCompromiso },

    { header: "Proveedor", key: "proveedor", width: 28, valor: (p) => p.proveedorNombre },
    { header: "Código SAP", key: "sap", width: 14, valor: (p) => p.codigoSAP },
    { header: "Solicitante", key: "solicitante", width: 24, valor: (p) => p.solicitanteNombre },
    { header: "Proforma", key: "proforma", width: 14, valor: (p) => p.proforma },
    { header: "Términos de pago", key: "terminos", width: 16, valor: (p) => p.terminoPagoNombre },
    { header: "Monto compra", key: "montoCompra", width: 14, valor: (p) => p.montoCompra, numero: true },
    { header: "Razón del pago", key: "razon", width: 40, valor: (p) => p.razonPago, largo: true },

    { header: "Cliente", key: "cliente", width: 24, valor: (p) => p.cliente },
    { header: "Licitación / OC", key: "oc", width: 16, valor: (p) => p.licitacionOC },
    { header: "Fecha entrega", key: "fechaEntrega", width: 14, valor: (p) => p.fechaEntrega || "" },
    { header: "Proyecto", key: "proyecto", width: 22, valor: (p) => p.proyecto },

    { header: "%", key: "porcentaje", width: 8, valor: (p) => (p.porcentaje ?? "") },
    { header: "Monto", key: "monto", width: 14, valor: (p) => p.monto, numero: true },
    { header: "Moneda", key: "moneda", width: 9, valor: (p) => p.moneda },
    { header: "Autoriza", key: "autoriza", width: 24, valor: (p) => p.autorizadorNombre },
    { header: "Monto a pagar", key: "montoPagar", width: 15, valor: (p) => p.montoPagar, numero: true },
    { header: "Concepto de compra", key: "concepto", width: 40, valor: (p) => p.conceptoCompra, largo: true },

    { header: "¿Cuenta diferente?", key: "cuentaDif", width: 12, valor: (p) => (p.pagarCuentaDiferente ? "Sí" : "No") },
    { header: "Cuenta destino", key: "cuenta", width: 44, valor: cuentaDestino, largo: true },
    { header: "Observaciones", key: "observaciones", width: 36, valor: (p) => p.observaciones, largo: true },

    { header: "Enviada", key: "fEnvio", width: 20, valor: (p) => fechaHora(p.fechaEnvio) },
    { header: "Autorizada", key: "fAut", width: 20, valor: (p) => fechaHora(p.fechaAprobacionAutorizador) },
    { header: "Aprobada contabilidad", key: "fCont", width: 20, valor: (p) => fechaHora(p.fechaAprobacionContabilidad) },
    { header: "Aprobó contabilidad", key: "quienCont", width: 22, valor: (p) => p.contabilidadNombre || "" },
    { header: "Fecha de pago", key: "fPago", width: 14, valor: (p) => p.pago?.fechaPago || "" },
    { header: "Referencia de pago", key: "refPago", width: 20, valor: (p) => p.pago?.referencia || "" },
    { header: "Último rechazo", key: "rechazo", width: 36, largo: true, valor: (p) => {
        const r = buscarEnHistorial(p, "RECHAZADA_CONTABILIDAD") || buscarEnHistorial(p, "RECHAZADA_AUTORIZADOR");
        return r ? `${r.usuarioNombre}: ${r.comentario}` : "";
    } },
    { header: "Creada", key: "fCreacion", width: 12, valor: (p) => fechaCorta(p.fechaCreacion) }
];

export const generarExcel = async (peticiones, { generadoPor }) => {
    const libro = new ExcelJS.Workbook();
    libro.creator = "ASSET PRO";
    libro.created = new Date();

    const hoja = libro.addWorksheet("Peticiones de pago", {
        views: [{ state: "frozen", xSplit: 1, ySplit: 1 }]
    });

    hoja.columns = COLUMNAS.map(({ header, key, width }) => ({ header, key, width }));

    const encabezado = hoja.getRow(1);
    encabezado.height = 30;
    encabezado.eachCell((celda) => {
        celda.font = { bold: true, color: { argb: "FFFFFFFF" } };
        celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
        celda.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    });

    peticiones.forEach((p) => {
        const fila = {};
        COLUMNAS.forEach((c) => {
            const v = c.valor(p);
            fila[c.key] = c.numero ? (v === null || v === undefined || v === "" ? null : Number(v)) : (v ?? "");
        });
        hoja.addRow(fila);
    });

    COLUMNAS.forEach((c, i) => {
        const columna = hoja.getColumn(i + 1);
        if (c.numero) columna.numFmt = "#,##0.00";
        if (c.largo) columna.alignment = { wrapText: true, vertical: "top" };
    });

    hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNAS.length } };

    // Totales por moneda (no se suman USD con EUR).
    const totales = peticiones.reduce((acc, p) => {
        const m = p.moneda || "USD";
        acc[m] = (acc[m] || 0) + Number(p.montoPagar || 0);
        return acc;
    }, {});

    const resumen = libro.addWorksheet("Resumen");
    resumen.columns = [{ width: 28 }, { width: 20 }];
    resumen.addRow(["Generado por", generadoPor]);
    resumen.addRow(["Fecha", fechaHora(new Date().toISOString())]);
    resumen.addRow(["Peticiones", peticiones.length]);
    resumen.addRow([]);
    resumen.addRow(["Total monto a pagar", ""]).font = { bold: true };
    Object.entries(totales).forEach(([moneda, total]) => {
        const fila = resumen.addRow([moneda, total]);
        fila.getCell(2).numFmt = "#,##0.00";
    });

    return libro.xlsx.writeBuffer();
};
