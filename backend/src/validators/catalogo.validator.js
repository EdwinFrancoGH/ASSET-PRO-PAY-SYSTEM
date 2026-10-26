import { MONEDAS } from "../config/estados.js";
import { LISTA_CLASIFICACIONES } from "../config/impuestos.js";
import { LISTA_ORIGENES, ORIGENES, swiftAbaValido, normalizarTipoCuenta, normalizarTipoPersona } from "../config/bancario.js";

const vacio = (v) => v === undefined || v === null || String(v).trim() === "";
const sinEspacios = (v) => String(v || "").replace(/\s/g, "").toUpperCase();

// Transferencia local (Davivienda → otros bancos): los 5 datos son obligatorios.
export const validarCuentaLocal = (c, n) => {
    if (vacio(c.banco)) return `${n}: selecciona el banco.`;
    if (!normalizarTipoCuenta(c.tipoCuenta)) return `${n}: el tipo de cuenta debe ser Ahorro o Corriente.`;
    if (vacio(c.numeroCuenta)) return `${n}: indica el número de cuenta.`;
    if (!/^\d+$/.test(String(c.numeroCuenta).replace(/[\s-]/g, ""))) return `${n}: el número de cuenta solo admite dígitos.`;
    if (!normalizarTipoPersona(c.tipoPersona)) return `${n}: indica el tipo de cliente (Natural o Jurídico).`;
    if (vacio(c.titular)) return `${n}: indica el titular.`;
    return null;
};

// Transferencia internacional: datos del beneficiario y SWIFT/ABA de su
// banco obligatorios. Banco intermediario opcional: solo su SWIFT/ABA (la
// banca completa nombre, país y dirección de los bancos).
export const validarCuentaExterior = (c, n) => {
    const obligatorios = {
        titular: "el nombre del beneficiario",
        numeroCuenta: "la cuenta del beneficiario",
        direccionBeneficiario: "la dirección del beneficiario",
        swift: "el N° ABA o SWIFT del banco"
    };
    for (const [campo, etiqueta] of Object.entries(obligatorios)) {
        if (vacio(c[campo])) return `${n}: indica ${etiqueta}.`;
    }
    if (!normalizarTipoPersona(c.tipoPersona)) return `${n}: indica el tipo de beneficiario (Natural o Jurídico).`;
    if (!swiftAbaValido(sinEspacios(c.swift))) return `${n}: el SWIFT debe tener 8 u 11 caracteres o el ABA 9 dígitos.`;
    if (c.moneda && !MONEDAS.includes(c.moneda)) return `${n}: moneda no válida. Usa: ${MONEDAS.join(", ")}.`;

    // Marcado "Usa banco intermediario": el SWIFT/ABA es obligatorio.
    if (c.intermediario) {
        if (vacio(c.intermediario.swift)) return `${n}: indica el SWIFT/ABA del banco intermediario o desmarca "Usa banco intermediario".`;
        if (!swiftAbaValido(sinEspacios(c.intermediario.swift))) return `${n}: el SWIFT/ABA del banco intermediario no es válido.`;
    }
    return null;
};

// Valida una cuenta según el tipo de transferencia. "etiqueta" encabeza el
// mensaje de error (p. ej. "Cuenta 1" o "Nueva cuenta").
export const validarCuenta = (cuenta, tipo, etiqueta) =>
    (tipo === ORIGENES.EXTERIOR ? validarCuentaExterior : validarCuentaLocal)(cuenta || {}, etiqueta);

export const validarCatalogo = (catalogo, datos) => {
    if (!datos.nombre || String(datos.nombre).trim().length < 2) {
        return "El nombre es obligatorio (mínimo 2 caracteres).";
    }

    if (catalogo === "terminos-pago" && datos.dias !== undefined && datos.dias !== null && datos.dias !== "") {
        const dias = Number(datos.dias);
        if (!Number.isInteger(dias) || dias < 0) return "Los días deben ser un número entero mayor o igual a 0.";
    }

    if (catalogo === "proveedores") {
        if (!LISTA_ORIGENES.includes(datos.origen)) {
            return "Indica si el proveedor es Local o del Exterior.";
        }
        if (datos.origen === ORIGENES.LOCAL && !LISTA_CLASIFICACIONES.includes(datos.clasificacionContribuyente)) {
            return "Indica la clasificación del contribuyente (gran, mediano, pequeño o no inscrito en IVA).";
        }
        if (datos.cuentasBancarias !== undefined && !Array.isArray(datos.cuentasBancarias)) {
            return "Las cuentas bancarias no tienen un formato válido.";
        }
        const validar = datos.origen === ORIGENES.EXTERIOR ? validarCuentaExterior : validarCuentaLocal;
        for (const [i, cuenta] of (datos.cuentasBancarias || []).entries()) {
            const error = validar(cuenta, `Cuenta ${i + 1}`);
            if (error) return error;
        }
    }

    return null;
};
