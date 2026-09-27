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
    BORRADOR: { etiqueta: "Borrador", clase: "bg-slate-100 text-slate-700 ring-slate-300" },
    ENVIADA: { etiqueta: "Enviada", clase: "bg-sky-50 text-sky-700 ring-sky-200" },
    EN_REVISION: { etiqueta: "En revisión", clase: "bg-amber-50 text-amber-800 ring-amber-200" },
    APROBADA_AUTORIZADOR: { etiqueta: "Aprobada por autorizador", clase: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
    RECHAZADA_AUTORIZADOR: { etiqueta: "Rechazada por autorizador", clase: "bg-red-50 text-red-700 ring-red-200" },
    APROBADA_CONTABILIDAD: { etiqueta: "Aprobada por contabilidad", clase: "bg-violet-50 text-violet-700 ring-violet-200" },
    RECHAZADA_CONTABILIDAD: { etiqueta: "Rechazada por contabilidad", clase: "bg-red-50 text-red-700 ring-red-200" },
    PAGADA: { etiqueta: "Pagada", clase: "bg-emerald-50 text-emerald-700 ring-emerald-200" }
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
