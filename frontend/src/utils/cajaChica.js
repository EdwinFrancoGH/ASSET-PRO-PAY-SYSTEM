// Caja chica — ver backend/src/config/cajaChica.js
export const TOPE_CAJA_CHICA = 50;

export const ESTADOS_CC = {
    PENDIENTE_APROBACION: { etiqueta: "Pendiente de aprobación", clase: "bg-sky-500/15 text-sky-300 ring-sky-400/30" },
    APROBADA: { etiqueta: "Aprobada · lista para cobrar", clase: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30" },
    RECHAZADA: { etiqueta: "Rechazada", clase: "bg-red-500/15 text-red-300 ring-red-400/30" },
    ANULADA: { etiqueta: "Anulada", clase: "bg-white/10 text-slate-400 ring-white/20 line-through" },
    ENTREGADA: { etiqueta: "Entregada · por liquidar", clase: "bg-amber-500/15 text-amber-300 ring-amber-400/30" },
    RECHAZADA_CAJA: { etiqueta: "Rechazada en caja", clase: "bg-red-500/15 text-red-300 ring-red-400/30" },
    LIQUIDACION_ENVIADA: { etiqueta: "Liquidación enviada", clase: "bg-violet-500/15 text-violet-300 ring-violet-400/30" },
    LIQUIDACION_DEVUELTA: { etiqueta: "Liquidación devuelta", clase: "bg-orange-500/15 text-orange-300 ring-orange-400/30" },
    LIQUIDADA: { etiqueta: "Liquidada", clase: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30" }
};

export const ACCIONES_CC = {
    CREADA: "Pidió caja chica",
    ANULADA: "Anuló la solicitud",
    APROBADA: "Aprobó la solicitud",
    RECHAZADA: "Rechazó la solicitud",
    TOKEN_REGENERADO: "Generó un token nuevo",
    ENTREGADA: "Entregó el efectivo",
    RECHAZADA_CAJA: "Rechazó la entrega en caja",
    LIQUIDACION_ENVIADA: "Envió la liquidación",
    LIQUIDACION_DEVUELTA: "Devolvió la liquidación",
    LIQUIDADA: "Cerró la liquidación"
};

export const ESTADOS_ANULABLES_CC = ["PENDIENTE_APROBACION", "APROBADA"];

// Mismo cálculo que el backend (services/cajaChica.service.js → calcularCierre):
// caja chica reconoce máximo $50; lo que pase es gasto del usuario.
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
export const calcularCierre = (entregado, gastado) => {
    const g = Number(gastado) || 0;
    const reconocido = r2(Math.min(g, TOPE_CAJA_CHICA));
    const diferencia = r2(reconocido - Number(entregado || 0));
    return {
        montoGastado: r2(g),
        montoReconocido: reconocido,
        diferencia,
        excedenteNoReconocido: r2(Math.max(g - TOPE_CAJA_CHICA, 0)),
        tipoCierre: diferencia < 0 ? "VUELTO" : diferencia > 0 ? "REINTEGRO" : "EXACTO"
    };
};

// Texto del movimiento en caja, desde el punto de vista del cajero.
export const textoCierreCajero = (c) =>
    c.tipoCierre === "VUELTO" ? `Recibe $${Math.abs(c.diferencia).toFixed(2)} de vuelto` : c.tipoCierre === "REINTEGRO" ? `Entrega $${c.diferencia.toFixed(2)} de reintegro` : "Sin movimiento (monto exacto)";

// Desde el punto de vista del solicitante.
export const textoCierreSolicitante = (c) =>
    c.tipoCierre === "VUELTO" ? `Devuelves $${Math.abs(c.diferencia).toFixed(2)} de vuelto en caja` : c.tipoCierre === "REINTEGRO" ? `Caja te entrega $${c.diferencia.toFixed(2)}` : "No hay vuelto ni reintegro";

export const ESTADOS_PARA_LIQUIDAR_CC = ["ENTREGADA", "LIQUIDACION_DEVUELTA"];
