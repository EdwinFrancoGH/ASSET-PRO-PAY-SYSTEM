// Caja chica: estados y reglas de la política de caja.
// Módulo independiente de Peticiones/Pagos/Planes/Facturas.

export const TOPE_CAJA_CHICA = 50; // USD por solicitud (política de caja)
export const HORAS_TOKEN = 48; // vigencia del token de 6 dígitos
export const DIAS_LIQUIDAR = 3; // plazo para liquidar después de la entrega
// Política: si en un área ya hay 3 personas con efectivo entregado sin
// liquidar, el cajero no puede entregar a una cuarta persona de esa área.
export const MAX_PENDIENTES_POR_AREA = 3;
export const MAX_ARCHIVOS_LIQUIDACION = 5;

export const ESTADOS_CC = {
    PENDIENTE_APROBACION: "PENDIENTE_APROBACION",
    APROBADA: "APROBADA",
    RECHAZADA: "RECHAZADA",
    ANULADA: "ANULADA",
    ENTREGADA: "ENTREGADA",
    RECHAZADA_CAJA: "RECHAZADA_CAJA",
    LIQUIDACION_ENVIADA: "LIQUIDACION_ENVIADA",
    LIQUIDACION_DEVUELTA: "LIQUIDACION_DEVUELTA",
    LIQUIDADA: "LIQUIDADA"
};

// Mientras el usuario tenga una solicitud en alguno de estos estados no
// puede crear otra (debe liquidarla primero).
export const ESTADOS_ABIERTOS_CC = [
    ESTADOS_CC.PENDIENTE_APROBACION,
    ESTADOS_CC.APROBADA,
    ESTADOS_CC.ENTREGADA,
    ESTADOS_CC.LIQUIDACION_ENVIADA,
    ESTADOS_CC.LIQUIDACION_DEVUELTA
];

// El solicitante puede anular mientras no se haya entregado el efectivo.
export const ESTADOS_ANULABLES_CC = [ESTADOS_CC.PENDIENTE_APROBACION, ESTADOS_CC.APROBADA];

// Efectivo entregado que aún no se cierra (cuenta para el límite por área).
export const ESTADOS_PENDIENTES_LIQUIDAR_CC = [
    ESTADOS_CC.ENTREGADA,
    ESTADOS_CC.LIQUIDACION_ENVIADA,
    ESTADOS_CC.LIQUIDACION_DEVUELTA
];
