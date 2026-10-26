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

// Término de pago de la petición (obligatorio). Contado se paga con factura.
export const TERMINOS_PAGO = { ANTICIPO: "Anticipo", CONTADO: "Contado (con factura)" };

// Tipo de la compra. Solo CLIENTE lleva nombre de cliente.
//   CLIENTE, RETAIL, STOCK (Stock B2B) → solo el área de Compras.
//   GASTO_OPERATIVO → gasto o costo operativo; el único tipo para las
//   demás áreas (no llevan orden de compra ELM).
export const TIPOS_CLIENTE = ["CLIENTE", "RETAIL", "STOCK", "GASTO_OPERATIVO"];
export const TIPOS_SOLO_COMPRAS = ["CLIENTE", "RETAIL", "STOCK"];
export const TIPO_GASTO_OPERATIVO = "GASTO_OPERATIVO";

// Retail: el concepto es opcional; si se deja vacío se usa este texto.
// En inglés para proveedores del exterior (aparece en la transferencia).
export const CONCEPTO_RETAIL = {
    LOCAL: "Compra de mercancía para surtir salas de venta.",
    EXTERIOR: "Purchase of merchandise to restock our retail stores."
};
