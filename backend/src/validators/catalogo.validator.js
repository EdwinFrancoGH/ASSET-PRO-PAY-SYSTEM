import { MONEDAS } from "../config/estados.js";

export const validarCatalogo = (catalogo, datos) => {
    if (!datos.nombre || String(datos.nombre).trim().length < 2) {
        return "El nombre es obligatorio (mínimo 2 caracteres).";
    }

    if (catalogo === "terminos-pago" && datos.dias !== undefined && datos.dias !== null && datos.dias !== "") {
        const dias = Number(datos.dias);
        if (!Number.isInteger(dias) || dias < 0) return "Los días deben ser un número entero mayor o igual a 0.";
    }

    if (catalogo === "proveedores") {
        if (datos.cuentasBancarias !== undefined && !Array.isArray(datos.cuentasBancarias)) {
            return "Las cuentas bancarias no tienen un formato válido.";
        }
        for (const cuenta of datos.cuentasBancarias || []) {
            if (!cuenta.banco || !cuenta.numeroCuenta) {
                return "Cada cuenta bancaria necesita banco y número de cuenta.";
            }
            if (cuenta.moneda && !MONEDAS.includes(cuenta.moneda)) {
                return `Moneda de cuenta no válida. Usa: ${MONEDAS.join(", ")}.`;
            }
        }
    }

    return null;
};
