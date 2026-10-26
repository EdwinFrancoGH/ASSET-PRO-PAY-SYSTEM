// Copia de ESTADOS_EXPEDIENTE en backend/src/services/expedientes.service.js
export const ESTADOS_EXPEDIENTE = {
    EN_PROCESO_PAGO: "EN_PROCESO_PAGO",
    PENDIENTE_COMPENSAR: "PENDIENTE_COMPENSAR",
    SALDO_PENDIENTE: "SALDO_PENDIENTE",
    COMPENSADO: "COMPENSADO",
    EXCEDENTE: "EXCEDENTE"
};

export const INFO_ESTADO_EXPEDIENTE = {
    EN_PROCESO_PAGO: { etiqueta: "En proceso de pago", clase: "bg-sky-500/15 text-sky-200 ring-sky-400/30" },
    PENDIENTE_COMPENSAR: { etiqueta: "Pendiente de compensar", clase: "bg-amber-500/15 text-amber-200 ring-amber-400/30" },
    SALDO_PENDIENTE: { etiqueta: "Saldo pendiente", clase: "bg-orange-500/15 text-orange-200 ring-orange-400/30" },
    COMPENSADO: { etiqueta: "Compensado", clase: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30" },
    EXCEDENTE: { etiqueta: "Compensado con excedente", clase: "bg-violet-500/15 text-violet-300 ring-violet-400/30" }
};

export const ACCIONES_EXPEDIENTE = { COMPENSADA: "Compensó con factura", ANULADA: "Anuló una factura" };
