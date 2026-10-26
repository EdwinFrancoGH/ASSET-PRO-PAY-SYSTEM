import { MONEDAS, TIPOS_CLIENTE, TERMINOS_PAGO } from "../config/estados.js";
import { tipoDePeticion } from "../config/bancario.js";
import { validarCuenta } from "./catalogo.validator.js";

// Campos obligatorios para ENVIAR una petición (un borrador puede
// guardarse incompleto). Si necesitas que otro campo del layout sea
// obligatorio, agrégalo aquí y en el frontend (utils/peticion.js).
export const CAMPOS_OBLIGATORIOS = {
    fechaSolicitud: "Fecha de solicitud",
    areaId: "Área",
    tipoCliente: "Tipo",
    proveedorId: "Proveedor",
    terminoPago: "Término de pago",
    porcentaje: "Porcentaje",
    monto: "Monto",
    moneda: "Moneda",
    autorizadorId: "Autoriza",
    conceptoCompra: "Concepto/Detalle o comentario de la compra"
};

const vacio = (v) => v === undefined || v === null || (typeof v === "string" && v.trim() === "");

const fechaValida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(v).getTime());

const LIMITES_TEXTO = {
    ordenELM: 60, cliente: 150, licitacionOC: 150,
    conceptoCompra: 2000, nuevaCuentaBancaria: 1000, observaciones: 2000
};

// completa = true cuando se va a enviar a autorización.
export const validarPeticion = (datos, { completa = false } = {}) => {
    if (completa) {
        // En Retail el concepto es opcional (se usa un texto por defecto).
        const faltantes = Object.entries(CAMPOS_OBLIGATORIOS)
            .filter(([campo]) => !(campo === "conceptoCompra" && datos.tipoCliente === "RETAIL"))
            .filter(([campo]) => vacio(datos[campo]))
            .map(([, etiqueta]) => etiqueta);

        if (faltantes.length > 0) {
            return `Completa los campos obligatorios: ${faltantes.join(", ")}.`;
        }

        if (datos.pagarCuentaDiferente) {
            // La cuenta nueva se captura con los mismos campos que pide la
            // banca según el tipo (local / exterior). Las peticiones antiguas
            // pueden traer solo el texto libre "nuevaCuentaBancaria".
            if (datos.cuentaBancaria) {
                const error = validarCuenta(datos.cuentaBancaria, tipoDePeticion(datos), "Nueva cuenta");
                if (error) return error;
            } else if (vacio(datos.nuevaCuentaBancaria)) {
                return "Completa los datos de la nueva cuenta bancaria.";
            }
        } else if (vacio(datos.cuentaBancariaId)) {
            return "Selecciona una cuenta registrada del proveedor o marca \"Pagar a una cuenta diferente\".";
        }
    }

    if (!vacio(datos.fechaSolicitud) && !fechaValida(datos.fechaSolicitud)) return "La fecha de solicitud no es válida.";

    if (!vacio(datos.monto)) {
        const n = Number(datos.monto);
        if (!Number.isFinite(n) || n <= 0) return "El monto debe ser mayor a 0.";
    }

    if (!vacio(datos.porcentaje)) {
        const p = Number(datos.porcentaje);
        if (!Number.isFinite(p) || p <= 0 || p > 100) return "El porcentaje debe estar entre 0 y 100.";
    }

    if (!vacio(datos.tipoCliente) && !TIPOS_CLIENTE.includes(datos.tipoCliente)) {
        return `Tipo no válido. Usa: ${TIPOS_CLIENTE.join(", ")}.`;
    }

    if (!vacio(datos.terminoPago) && !TERMINOS_PAGO[datos.terminoPago]) {
        return "Término de pago no válido. Usa Anticipo o Contado.";
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
