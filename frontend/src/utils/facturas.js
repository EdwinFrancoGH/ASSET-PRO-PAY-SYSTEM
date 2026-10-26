// Entrega de facturas. Ver backend/src/services/facturas.service.js.
export const TIPOS_FACTURA = {
    CREDITO: { etiqueta: "Crédito", clase: "bg-amber-500/15 text-amber-300 ring-amber-400/30" },
    CONTADO: { etiqueta: "Contado", clase: "bg-violet-500/15 text-violet-300 ring-violet-400/30" }
};

export const ESTADOS_FACTURA = {
    ENTREGADA: { etiqueta: "Pendiente de recibir", clase: "bg-sky-500/15 text-sky-300 ring-sky-400/30" },
    RECIBIDA: { etiqueta: "Recibida", clase: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30" },
    DEVUELTA: { etiqueta: "Devuelta", clase: "bg-red-500/15 text-red-300 ring-red-400/30" },
    ELIMINADA: { etiqueta: "Eliminada", clase: "bg-white/10 text-slate-400 ring-white/20 line-through" }
};

export const ACCIONES_FACTURA = {
    ENTREGADA: "Entregó la factura",
    CORREGIDA: "Corrigió la factura",
    REENTREGADA: "Corrigió y volvió a entregar",
    RECIBIDA: "Recibió la factura",
    DEVUELTA: "Devolvió la factura",
    ELIMINADA: "Eliminó la factura"
};

export const facturaVacia = () => ({ tipo: "CREDITO", numeroFactura: "", proveedorId: "", montoOC: "", fechaFactura: "" });

const r2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Día (AAAA-MM-DD) en hora de El Salvador de una fecha ISO.
export const diaSV = (iso) => (iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/El_Salvador" }) : "");

// "2026-09-29" → "lunes, 29 sep 2026"
export const fechaLarga = (dia) => {
    if (!dia) return "—";
    const [a, m, d] = dia.split("-").map(Number);
    return new Date(a, m - 1, d).toLocaleDateString("es-SV", { weekday: "long", day: "2-digit", month: "short", year: "numeric" });
};

// Totales por tipo. Las eliminadas no suman.
export const totales = (lista) => {
    const vigentes = lista.filter((f) => f.estado !== "ELIMINADA");
    const de = (tipo) => vigentes.filter((f) => f.tipo === tipo);
    const suma = (l) => r2(l.reduce((a, f) => a + Number(f.montoOC || 0), 0));
    return {
        n: vigentes.length,
        credito: { n: de("CREDITO").length, total: suma(de("CREDITO")) },
        contado: { n: de("CONTADO").length, total: suma(de("CONTADO")) },
        total: suma(vigentes)
    };
};
