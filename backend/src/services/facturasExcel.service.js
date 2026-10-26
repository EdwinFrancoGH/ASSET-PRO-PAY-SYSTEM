// Excel de la entrega de facturas. Separado de exportar.service.js (que es
// el de peticiones) para no tocar el módulo de pagos.
import ExcelJS from "exceljs";

const TIPO = { CREDITO: "Crédito", CONTADO: "Contado" };
const ESTADO = { ENTREGADA: "Pendiente de recibir", RECIBIDA: "Recibida", DEVUELTA: "Devuelta", ELIMINADA: "Eliminada" };
const fechaHora = (iso) => (iso ? new Date(iso).toLocaleString("es-SV", { timeZone: "America/El_Salvador" }) : "");
// "2026-09-30" → fecha de Excel sin desfase de zona horaria.
const fechaExcel = (v) => {
    if (!v) return null;
    const [a, m, d] = v.split("-").map(Number);
    return new Date(Date.UTC(a, m - 1, d));
};

const COLUMNAS = [
    { header: "Tipo", key: "tipo", width: 11, valor: (f) => TIPO[f.tipo] || f.tipo },
    { header: "N° factura", key: "numeroFactura", width: 20, valor: (f) => f.numeroFactura },
    { header: "Proveedor", key: "proveedorNombre", width: 40, valor: (f) => f.proveedorNombre },
    { header: "Código SAP", key: "codigoSAP", width: 14, valor: (f) => f.codigoSAP || "" },
    { header: "Monto OC", key: "montoOC", width: 15, valor: (f) => f.montoOC, formato: '"$"#,##0.00' },
    { header: "Fecha factura", key: "fechaFactura", width: 14, valor: (f) => fechaExcel(f.fechaFactura), formato: "dd/mm/yyyy" },
    { header: "Estado", key: "estado", width: 20, valor: (f) => ESTADO[f.estado] || f.estado },
    { header: "Entregada por", key: "entregadoPorNombre", width: 24, valor: (f) => f.entregadoPorNombre },
    { header: "Fecha entrega", key: "fechaEntrega", width: 20, valor: (f) => fechaHora(f.fechaEntrega) },
    { header: "Recibida por", key: "recibidoPorNombre", width: 24, valor: (f) => f.recibidoPorNombre || "" },
    { header: "Fecha recepción", key: "fechaRecepcion", width: 20, valor: (f) => fechaHora(f.fechaRecepcion) },
    { header: "Motivo (devolución / eliminación)", key: "motivo", width: 40, valor: (f) => (f.estado === "DEVUELTA" ? f.motivoDevolucion : f.estado === "ELIMINADA" ? f.motivoEliminacion || "" : "") }
];

export const generarExcelFacturas = async (facturas, { generadoPor = "" } = {}) => {
    const libro = new ExcelJS.Workbook();
    libro.creator = generadoPor || "ASSET PRO PAY";
    libro.created = new Date();

    const hoja = libro.addWorksheet("Facturas", { views: [{ state: "frozen", ySplit: 1 }] });
    hoja.columns = COLUMNAS.map(({ header, key, width, formato }) => ({ header, key, width, style: formato ? { numFmt: formato } : {} }));

    const encabezado = hoja.getRow(1);
    encabezado.font = { bold: true, color: { argb: "FFFFFFFF" } };
    encabezado.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    encabezado.alignment = { vertical: "middle" };
    encabezado.height = 22;

    facturas.forEach((f) => hoja.addRow(Object.fromEntries(COLUMNAS.map((c) => [c.key, c.valor(f)]))));
    hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNAS.length } };

    // Resumen por tipo con fórmulas (se actualiza si filtran o editan en Excel).
    const ultima = facturas.length + 1;
    const colMonto = "E";
    const resumen = libro.addWorksheet("Resumen");
    resumen.columns = [{ header: "Tipo", key: "t", width: 14 }, { header: "Cantidad", key: "c", width: 12 }, { header: "Monto OC", key: "m", width: 16, style: { numFmt: '"$"#,##0.00' } }];
    resumen.getRow(1).font = { bold: true };
    ["Crédito", "Contado"].forEach((t) => {
        resumen.addRow({
            t,
            c: { formula: `COUNTIF(Facturas!A2:A${ultima},"${t}")` },
            m: { formula: `SUMIF(Facturas!A2:A${ultima},"${t}",Facturas!${colMonto}2:${colMonto}${ultima})` }
        });
    });
    const total = resumen.addRow({ t: "Total", c: { formula: "SUM(B2:B3)" }, m: { formula: "SUM(C2:C3)" } });
    total.font = { bold: true };

    return libro.xlsx.writeBuffer();
};
