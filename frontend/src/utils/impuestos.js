// Retenciones para proveedores LOCALES (El Salvador). Electrolab Médic es
// gran contribuyente. Si cambian las tasas o el mínimo, se ajustan aquí y
// en la copia del backend (backend/src/config/impuestos.js).
//
//   IVA 13%              → se suma al subtotal (documento CCF).
//   Retención IVA 1%     → proveedor pequeño o mediano contribuyente y
//                          monto sin IVA de $100 o más.
//   Retención Renta 10%  → servicios de persona natural.
//   Consumidor final     → no se calcula: los impuestos ya van incluidos.
//   Sujeto excluido      → persona natural no inscrita en IVA (sin CCF):
//                          sin IVA, solo retención Renta 10%.
export const TASAS = { IVA: 0.13, RETENCION_IVA: 0.01, RETENCION_RENTA: 0.1 };
export const MINIMO_RETENCION_IVA = 100;

export const CLASIFICACIONES = {
    GRANDE: "GRANDE",
    MEDIANO: "MEDIANO",
    PEQUENO: "PEQUENO",
    NO_INSCRITO: "NO_INSCRITO" // persona natural no inscrita en IVA
};
export const LISTA_CLASIFICACIONES = Object.values(CLASIFICACIONES);

export const DOCUMENTOS = { CCF: "CCF", CONSUMIDOR_FINAL: "CONSUMIDOR_FINAL", SUJETO_EXCLUIDO: "SUJETO_EXCLUIDO" };
export const LISTA_DOCUMENTOS = Object.values(DOCUMENTOS);

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// monto:    monto total sin IVA (define si aplica el mínimo de $100)
// subtotal: monto a pagar sin IVA (monto × %)
export const calcularPago = ({ monto, subtotal, clasificacion, documento, aplicaRetencionRenta }) => {
    if (subtotal === null || subtotal === undefined || !Number.isFinite(Number(subtotal))) return null;
    const base = r2(subtotal);

    if (documento === DOCUMENTOS.CONSUMIDOR_FINAL) {
        return { subtotal: base, iva: 0, retencionIva: 0, retencionRenta: 0, pagoEfectivo: base, impuestosIncluidos: true };
    }

    const inscritoIva = clasificacion !== CLASIFICACIONES.NO_INSCRITO && documento !== DOCUMENTOS.SUJETO_EXCLUIDO;
    const iva = inscritoIva ? r2(base * TASAS.IVA) : 0;
    const retieneIva =
        inscritoIva &&
        [CLASIFICACIONES.MEDIANO, CLASIFICACIONES.PEQUENO].includes(clasificacion) &&
        Number(monto) >= MINIMO_RETENCION_IVA;
    const retencionIva = retieneIva ? r2(base * TASAS.RETENCION_IVA) : 0;
    const retencionRenta = aplicaRetencionRenta ? r2(base * TASAS.RETENCION_RENTA) : 0;

    return {
        subtotal: base,
        iva,
        retencionIva,
        retencionRenta,
        pagoEfectivo: r2(base + iva - retencionIva - retencionRenta),
        impuestosIncluidos: false
    };
};

// Documento que corresponde a la clasificación: los no inscritos en IVA
// siempre son Sujeto excluido; los inscritos usan CCF o Consumidor final.
export const documentoValido = (clasificacion, documento) => {
    if (clasificacion === CLASIFICACIONES.NO_INSCRITO) return DOCUMENTOS.SUJETO_EXCLUIDO;
    return [DOCUMENTOS.CCF, DOCUMENTOS.CONSUMIDOR_FINAL].includes(documento) ? documento : DOCUMENTOS.CCF;
};

// Lo que efectivamente recibe el proveedor (peticiones sin cálculo: monto a pagar).
export const montoFinal = (p) => p?.calculo?.pagoEfectivo ?? p?.montoPagar ?? null;

export const ETIQUETA_CLASIFICACION = {
    GRANDE: "Gran contribuyente",
    MEDIANO: "Mediano contribuyente",
    PEQUENO: "Pequeño contribuyente",
    NO_INSCRITO: "Persona natural no inscrita en IVA"
};

export const ETIQUETA_DOCUMENTO = {
    CCF: "Crédito fiscal (CCF)",
    CONSUMIDOR_FINAL: "Consumidor final",
    SUJETO_EXCLUIDO: "Sujeto excluido"
};
