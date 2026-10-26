// Planes de pago (cuotas). Ver backend/src/services/planes.service.js.
export const ESTADOS_PLAN = { ABIERTO: "ABIERTO", COMPLETADO: "COMPLETADO", CANCELADO: "CANCELADO" };

export const INFO_ESTADO_PLAN = {
    ABIERTO: { etiqueta: "Abierto", clase: "bg-sky-500/15 text-sky-300 ring-sky-400/30" },
    COMPLETADO: { etiqueta: "Completado", clase: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30" },
    CANCELADO: { etiqueta: "Cancelado", clase: "bg-white/10 text-slate-300 ring-white/20" }
};

export const ACCIONES_PLAN = {
    CREADO: "Creó el plan",
    MODIFICADO: "Modificó los términos",
    CUOTA_SOLICITADA: "Solicitó una cuota",
    CUOTA_LIBERADA: "Liberó una cuota",
    CANCELADO: "Canceló el plan"
};

// Plantillas rápidas de términos. Se pueden editar después.
export const PLANTILLAS = [
    { nombre: "10 / 40 / 50", cuotas: [["Primer anticipo", 10], ["Segundo anticipo", 40], ["Pago final", 50]] },
    { nombre: "30 / 70", cuotas: [["Anticipo", 30], ["Pago final", 70]] },
    { nombre: "50 / 50", cuotas: [["Anticipo", 50], ["Pago final", 50]] },
    { nombre: "100%", cuotas: [["Pago único", 100]] }
];

export const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const cuotaVacia = (nombre = "", porcentaje = "") => ({ nombre, porcentaje, monto: "", condicion: "", fechaEstimada: "" });

// Recalcula los montos de las cuotas pendientes a partir de su % y del
// total. La última cuota pendiente absorbe los centavos de redondeo cuando
// los porcentajes suman 100. Las cuotas con petición conservan su monto.
export const recalcularMontos = (cuotas, montoTotal) => {
    const total = Number(montoTotal);
    if (!Number.isFinite(total) || total <= 0) return cuotas;
    const lista = cuotas.map((c) => (c.peticionId ? { ...c, porcentaje: r2((c.monto / total) * 100) } : { ...c, monto: r2((total * Number(c.porcentaje || 0)) / 100) }));
    const sumaPct = lista.reduce((a, c) => a + Number(c.porcentaje || 0), 0);
    const ultima = [...lista].reverse().find((c) => !c.peticionId);
    if (ultima && Math.abs(sumaPct - 100) < 0.05) {
        const resto = r2(total - lista.filter((c) => c !== ultima).reduce((a, c) => a + Number(c.monto || 0), 0));
        ultima.monto = resto;
    }
    return lista;
};

export const sumaCuotas = (cuotas) => r2(cuotas.reduce((a, c) => a + Number(c.monto || 0), 0));
