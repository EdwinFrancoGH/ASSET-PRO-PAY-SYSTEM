// Excel del cuadre diario de caja chica. Separado de los Excel de peticiones
// y de facturas para no tocar esos módulos.
import ExcelJS from "exceljs";

const TIPO = {
    ENTREGA: "Entrega de efectivo",
    REINTEGRO: "Reintegro entregado",
    VUELTO: "Vuelto recibido",
    EXACTO: "Liquidación exacta"
};
const MONEDA = '"$"#,##0.00';
const hora = (iso) => (iso ? new Date(iso).toLocaleTimeString("es-SV", { timeZone: "America/El_Salvador", hour: "2-digit", minute: "2-digit" }) : "");

const COLUMNAS = [
    { header: "Hora", key: "hora", width: 10, valor: (m) => hora(m.fecha) },
    { header: "N° solicitud", key: "numero", width: 16, valor: (m) => m.numero },
    { header: "Solicitante", key: "solicitante", width: 28, valor: (m) => m.solicitanteNombre },
    { header: "Área", key: "area", width: 20, valor: (m) => m.areaNombre },
    { header: "Tipo", key: "tipo", width: 22, valor: (m) => TIPO[m.tipo] || m.tipo },
    { header: "Salida", key: "salida", width: 13, valor: (m) => m.salida || 0, formato: MONEDA },
    { header: "Entrada", key: "entrada", width: 13, valor: (m) => m.entrada || 0, formato: MONEDA },
    { header: "Cajero", key: "cajero", width: 22, valor: (m) => m.cajeroNombre || "" },
    { header: "N° factura", key: "factura", width: 18, valor: (m) => m.numeroFactura || "" },
    { header: "Gastado", key: "gastado", width: 13, valor: (m) => m.montoGastado ?? null, formato: MONEDA },
    { header: "Excedente no reconocido", key: "excedente", width: 16, valor: (m) => m.excedenteNoReconocido || null, formato: MONEDA },
    { header: "Concepto", key: "concepto", width: 40, valor: (m) => m.concepto }
];

const pintarEncabezado = (fila) => {
    fila.font = { bold: true, color: { argb: "FFFFFFFF" } };
    fila.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    fila.alignment = { vertical: "middle" };
    fila.height = 22;
};

export const generarExcelCuadre = async ({ dia, movimientos, fondo, corte }, { generadoPor = "" } = {}) => {
    const libro = new ExcelJS.Workbook();
    libro.creator = generadoPor || "ASSET PRO PAY";
    libro.created = new Date();

    // Hoja 1: un renglón por movimiento de efectivo
    const hoja = libro.addWorksheet("Movimientos", { views: [{ state: "frozen", ySplit: 1 }] });
    hoja.columns = COLUMNAS.map(({ header, key, width, formato }) => ({ header, key, width, style: formato ? { numFmt: formato } : {} }));
    pintarEncabezado(hoja.getRow(1));
    movimientos.forEach((m) => hoja.addRow(Object.fromEntries(COLUMNAS.map((c) => [c.key, c.valor(m)]))));
    hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNAS.length } };

    // Hoja 2: resumen con fórmulas (se recalcula si editan la hoja 1)
    const ultima = Math.max(movimientos.length + 1, 2);
    const rango = (col) => `Movimientos!${col}2:${col}${ultima}`;
    const resumen = libro.addWorksheet("Resumen");
    resumen.columns = [{ key: "a", width: 34 }, { key: "b", width: 16 }, { key: "c", width: 16 }];

    resumen.addRow({ a: `Cuadre de caja chica — ${dia}` }).font = { bold: true, size: 14 };
    resumen.addRow({ a: `Generado por ${generadoPor} · ${new Date().toLocaleString("es-SV", { timeZone: "America/El_Salvador" })}` }).font = { italic: true, color: { argb: "FF64748B" } };
    resumen.addRow({});

    const enc = resumen.addRow({ a: "Concepto", b: "Cantidad", c: "Monto" });
    pintarEncabezado(enc);
    const filaTipo = (tipo, col) =>
        resumen.addRow({
            a: TIPO[tipo],
            b: { formula: `COUNTIF(${rango("E")},"${TIPO[tipo]}")` },
            c: { formula: `SUMIF(${rango("E")},"${TIPO[tipo]}",${rango(col)})` }
        });
    const fEntrega = filaTipo("ENTREGA", "F");
    const fReintegro = filaTipo("REINTEGRO", "F");
    const fVuelto = filaTipo("VUELTO", "G");
    filaTipo("EXACTO", "F");
    [fEntrega, fReintegro, fVuelto].forEach((f) => (f.getCell("c").numFmt = MONEDA));
    resumen.getRow(resumen.rowCount).getCell("c").numFmt = MONEDA;

    const neta = resumen.addRow({ a: "Salida neta de caja (entregas + reintegros − vueltos)", c: { formula: `C${fEntrega.number}+C${fReintegro.number}-C${fVuelto.number}` } });
    neta.font = { bold: true };
    neta.getCell("c").numFmt = MONEDA;

    const exc = resumen.addRow({ a: "Excedentes no reconocidos (gasto del usuario)", c: { formula: `SUM(${rango("K")})` } });
    exc.getCell("c").numFmt = MONEDA;

    // Por cajero (hoy hay uno solo, pero queda listo si se agregan más)
    resumen.addRow({});
    pintarEncabezado(resumen.addRow({ a: "Cajero", b: "Salidas", c: "Entradas" }));
    [...new Set(movimientos.map((m) => m.cajeroNombre).filter(Boolean))].forEach((cajero) => {
        const f = resumen.addRow({
            a: cajero,
            b: { formula: `SUMIF(${rango("H")},"${cajero.replace(/"/g, '""')}",${rango("F")})` },
            c: { formula: `SUMIF(${rango("H")},"${cajero.replace(/"/g, '""')}",${rango("G")})` }
        });
        f.getCell("b").numFmt = MONEDA;
        f.getCell("c").numFmt = MONEDA;
    });

    // Fondo y corte de caja del día
    resumen.addRow({});
    pintarEncabezado(resumen.addRow({ a: "Fondo y corte de caja", b: "", c: "Monto" }));
    const filaMonto = (a, valor, negrita = false) => {
        const f = resumen.addRow({ a, c: valor });
        f.getCell("c").numFmt = MONEDA;
        if (negrita) f.font = { bold: true };
        return f;
    };
    if (fondo) {
        filaMonto("Fondo asignado", fondo.montoFondo);
        filaMonto("Saldo al inicio del día", fondo.saldoInicial);
        filaMonto("Saldo al final del día (sistema)", fondo.saldoFinal, true);
    }
    if (corte) {
        filaMonto("Efectivo contado en el corte", corte.efectivoContado, true);
        const dif = filaMonto(corte.diferencia === 0 ? "Diferencia (cuadra)" : corte.diferencia > 0 ? "Diferencia (sobrante)" : "Diferencia (faltante)", corte.diferencia, true);
        if (corte.diferencia !== 0) dif.font = { bold: true, color: { argb: "FFDC2626" } };
        resumen.addRow({ a: `Corte por ${corte.cajeroNombre} · ${new Date(corte.fecha).toLocaleString("es-SV", { timeZone: "America/El_Salvador" })}` });
        if (corte.observacion) resumen.addRow({ a: `Observación: ${corte.observacion}` });
    } else {
        resumen.addRow({ a: "Corte de caja: pendiente" }).font = { italic: true, color: { argb: "FF64748B" } };
    }

    return libro.xlsx.writeBuffer();
};
