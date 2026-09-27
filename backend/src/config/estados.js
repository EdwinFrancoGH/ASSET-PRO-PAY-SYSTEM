// Ciclo de vida de una petición de pago:
//
// Borrador → Enviada → En revisión → Aprobada/Rechazada (autorizador)
//          → Aprobada/Rechazada (contabilidad) → Pagada
//
// Una petición rechazada (en cualquiera de las dos etapas) vuelve a manos
// del solicitante, que puede corregirla y reenviarla.
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

export const ETIQUETAS_ESTADO = {
    BORRADOR: "Borrador",
    ENVIADA: "Enviada",
    EN_REVISION: "En revisión",
    APROBADA_AUTORIZADOR: "Aprobada por autorizador",
    RECHAZADA_AUTORIZADOR: "Rechazada por autorizador",
    APROBADA_CONTABILIDAD: "Aprobada por contabilidad",
    RECHAZADA_CONTABILIDAD: "Rechazada por contabilidad",
    PAGADA: "Pagada"
};

// Estados en los que el solicitante puede editar y (re)enviar.
export const ESTADOS_EDITABLES = [
    ESTADOS.BORRADOR,
    ESTADOS.RECHAZADA_AUTORIZADOR,
    ESTADOS.RECHAZADA_CONTABILIDAD
];

// Estados en los que el autorizador asignado puede decidir.
export const ESTADOS_PENDIENTES_AUTORIZADOR = [ESTADOS.ENVIADA, ESTADOS.EN_REVISION];

export const MONEDAS = ["USD", "EUR"];
