// Origen del proveedor y datos bancarios que pide la banca (Davivienda)
// para cada tipo de transferencia. El frontend tiene una copia en
// src/utils/bancario.js.
//
//   LOCAL    → cualquier área. Transferencia local (5 datos).
//   EXTERIOR → solo áreas marcadas "Puede peticionar al exterior"
//              (Compras). Transferencia internacional.
export const ORIGENES = { LOCAL: "LOCAL", EXTERIOR: "EXTERIOR" };
export const LISTA_ORIGENES = Object.values(ORIGENES);

export const TIPOS_CUENTA = ["AHORRO", "CORRIENTE"];
export const TIPOS_PERSONA = ["NATURAL", "JURIDICO"];

// SWIFT/BIC: 8 u 11 caracteres. ABA (EE. UU.): 9 dígitos.
export const REGEX_SWIFT = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
export const REGEX_ABA = /^\d{9}$/;
export const swiftAbaValido = (v) => REGEX_SWIFT.test(v) || REGEX_ABA.test(v);

// Proveedores registrados antes de existir el campo "origen": si alguna
// cuenta tiene SWIFT se asume que es del exterior.
export const origenDeProveedor = (p) => {
    if (LISTA_ORIGENES.includes(p?.origen)) return p.origen;
    return (p?.cuentasBancarias || []).some((c) => String(c.swift || "").trim()) ? ORIGENES.EXTERIOR : ORIGENES.LOCAL;
};

// Acepta valores antiguos ("Corriente", "Ahorro", "Jurídico") y los deja
// en el formato del catálogo.
const normalizarOpcion = (v, opciones) => {
    const limpio = String(v || "")
        .trim()
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
    if (limpio === "AHORROS") return "AHORRO";
    return opciones.includes(limpio) ? limpio : "";
};
export const normalizarTipoCuenta = (v) => normalizarOpcion(v, TIPOS_CUENTA);
export const normalizarTipoPersona = (v) => normalizarOpcion(v, TIPOS_PERSONA);

// Tipo de una petición. Las peticiones anteriores a este cambio no tienen
// "tipo": se deduce de la cuenta usada.
export const tipoDePeticion = (p) => {
    if (LISTA_ORIGENES.includes(p?.tipo)) return p.tipo;
    return String(p?.cuentaBancaria?.swift || "").trim() ? ORIGENES.EXTERIOR : ORIGENES.LOCAL;
};
