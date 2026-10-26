// Copia de backend/src/config/estados.js + colores para la interfaz.
export const ESTADOS = {
    BORRADOR: "BORRADOR",
    ENVIADA: "ENVIADA",
    EN_REVISION: "EN_REVISION",
    APROBADA_AUTORIZADOR: "APROBADA_AUTORIZADOR",
    RECHAZADA_AUTORIZADOR: "RECHAZADA_AUTORIZADOR",
    APROBADA_CONTABILIDAD: "APROBADA_CONTABILIDAD",
    RECHAZADA_CONTABILIDAD: "RECHAZADA_CONTABILIDAD",
    PAGADA: "PAGADA"
};

export const INFO_ESTADO = {
    BORRADOR: { etiqueta: "Borrador", clase: "bg-white/10 text-slate-200 ring-white/20" },
    ENVIADA: { etiqueta: "Enviada", clase: "bg-sky-500/15 text-sky-300 ring-sky-400/30" },
    EN_REVISION: { etiqueta: "En revisión", clase: "bg-amber-500/15 text-amber-200 ring-amber-400/30" },
    APROBADA_AUTORIZADOR: { etiqueta: "Aprobada por autorizador", clase: "bg-indigo-500/15 text-indigo-300 ring-indigo-400/30" },
    RECHAZADA_AUTORIZADOR: { etiqueta: "Rechazada por autorizador", clase: "bg-red-500/15 text-red-300 ring-red-400/30" },
    APROBADA_CONTABILIDAD: { etiqueta: "Aprobada por contabilidad", clase: "bg-violet-500/15 text-violet-300 ring-violet-400/30" },
    RECHAZADA_CONTABILIDAD: { etiqueta: "Rechazada por contabilidad", clase: "bg-red-500/15 text-red-300 ring-red-400/30" },
    PAGADA: { etiqueta: "Pagada", clase: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30" }
};

// Orden del flujo, para la barra de progreso del detalle.
export const PASOS_FLUJO = [
    { clave: "BORRADOR", etiqueta: "Borrador" },
    { clave: "ENVIADA", etiqueta: "Enviada" },
    { clave: "EN_REVISION", etiqueta: "En revisión" },
    { clave: "AUTORIZADOR", etiqueta: "Autorizador" },
    { clave: "CONTABILIDAD", etiqueta: "Contabilidad" },
    { clave: "PAGADA", etiqueta: "Pagada" }
];

export const indicePaso = (estado) => ({
    BORRADOR: 0, RECHAZADA_AUTORIZADOR: 3, RECHAZADA_CONTABILIDAD: 4,
    ENVIADA: 1, EN_REVISION: 2, APROBADA_AUTORIZADOR: 3, APROBADA_CONTABILIDAD: 4, PAGADA: 5
}[estado] ?? 0);

export const ESTADOS_EDITABLES = [ESTADOS.BORRADOR, ESTADOS.RECHAZADA_AUTORIZADOR, ESTADOS.RECHAZADA_CONTABILIDAD];

export const ACCIONES_HISTORIAL = {
    CREADA: "Creó la petición",
    ENVIADA: "Envió a autorización",
    REENVIADA: "Corrigió y reenvió",
    EN_REVISION: "Comenzó la revisión",
    APROBADA_AUTORIZADOR: "Autorizó",
    RECHAZADA_AUTORIZADOR: "Rechazó (autorizador)",
    APROBADA_CONTABILIDAD: "Aprobó (contabilidad)",
    RECHAZADA_CONTABILIDAD: "Rechazó (contabilidad)",
    PAGADA: "Registró el pago"
};
