import { MONEDAS } from "../config/estados.js";

// Campos obligatorios para ENVIAR una petición (un borrador puede
// guardarse incompleto). Si necesitas que otro campo del layout sea
// obligatorio, agrégalo aquí y en el frontend (utils/peticion.js).
export const CAMPOS_OBLIGATORIOS = {
    fechaSolicitud: "Fecha de solicitud",
    areaId: "Área",
    proveedorId: "Proveedor",
    terminoPagoId: "Términos de pago",
    montoCompra: "Monto de compra",
    razonPago: "Razón del pago",
    porcentaje: "Porcentaje",
    monto: "Monto",
    moneda: "Moneda",
    autorizadorId: "Autoriza",
    conceptoCompra: "Concepto de compra"
};

const vacio = (v) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

const fechaValida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(v).getTime());

const LIMITES_TEXTO = {
    ordenELM: 60, ticketCompromiso: 60, proforma: 80, cliente: 150, licitacionOC: 80, proyecto: 150,
    razonPago: 1500, conceptoCompra: 2000, nuevaCuentaBancaria: 1000, observaciones: 2000
};

// completa = true cuando se va a enviar a autorización.
export const validarPeticion = (datos, { completa = false } = {}) => {
    if (completa) {
        const faltantes = Object.entries(CAMPOS_OBLIGATORIOS)
            .filter(([campo]) => vacio(datos[campo]))
            .map(([, etiqueta]) => etiqueta);

        if (faltantes.length > 0) {
            return `Completa los campos obligatorios: ${faltantes.join(", ")}.`;
        }

        if (datos.pagarCuentaDiferente) {
            if (vacio(datos.nuevaCuentaBancaria)) return "Indica los datos de la nueva cuenta bancaria.";
        } else if (vacio(datos.cuentaBancariaId)) {
            return "Selecciona una cuenta registrada del proveedor o marca \"Pagar a una cuenta diferente\".";
        }
    }

    for (const campo of ["fechaSolicitud", "fechaEntrega"]) {
        if (!vacio(datos[campo]) && !fechaValida(datos[campo])) return `La fecha "${campo}" no es válida.`;
    }

    for (const campo of ["montoCompra", "monto"]) {
        if (!vacio(datos[campo])) {
            const n = Number(datos[campo]);
            if (!Number.isFinite(n) || n <= 0) return `El ${campo === "monto" ? "monto" : "monto de compra"} debe ser mayor a 0.`;
        }
    }

    if (!vacio(datos.porcentaje)) {
        const p = Number(datos.porcentaje);
        if (!Number.isFinite(p) || p <= 0 || p > 100) return "El porcentaje debe estar entre 0 y 100.";
    }

    if (!vacio(datos.monto) && !vacio(datos.montoCompra) && Number(datos.monto) > Number(datos.montoCompra)) {
        return "El monto no puede ser mayor al monto de compra.";
    }

    if (!vacio(datos.moneda) && !MONEDAS.includes(datos.moneda)) {
        return `Moneda no válida. Usa: ${MONEDAS.join(", ")}.`;
    }

    for (const [campo, max] of Object.entries(LIMITES_TEXTO)) {
        if (!vacio(datos[campo]) && String(datos[campo]).length > max) {
            return `El campo "${campo}" admite máximo ${max} caracteres.`;
        }
    }

    return null;
};

export const validarDecision = ({ decision, comentario }) => {
    if (!["aprobar", "rechazar"].includes(decision)) return "La decisión debe ser \"aprobar\" o \"rechazar\".";
    if (decision === "rechazar" && vacio(comentario)) return "Indica el motivo del rechazo.";
    if (!vacio(comentario) && comentario.length > 1000) return "El comentario admite máximo 1000 caracteres.";
    return null;
};

export const validarPago = ({ fechaPago, referencia }) => {
    if (vacio(fechaPago) || !fechaValida(fechaPago)) return "Indica una fecha de pago válida.";
    if (!vacio(referencia) && referencia.length > 120) return "La referencia admite máximo 120 caracteres.";
    return null;
};
