// Copia de backend/src/config/bancario.js (origen del proveedor y datos
// bancarios que pide la banca para cada tipo de transferencia).
import { ROLES } from "./roles";

export const ORIGENES = { LOCAL: "LOCAL", EXTERIOR: "EXTERIOR" };

export const ETIQUETA_ORIGEN = { LOCAL: "Local", EXTERIOR: "Exterior" };

export const TIPOS_CUENTA = [
    { valor: "AHORRO", etiqueta: "Ahorro" },
    { valor: "CORRIENTE", etiqueta: "Corriente" }
];

export const TIPOS_PERSONA = [
    { valor: "NATURAL", etiqueta: "Natural" },
    { valor: "JURIDICO", etiqueta: "Jurídico" }
];

// Sugerencias para transferencias locales (el campo acepta otro nombre).
// Ajusta la lista a como aparecen los bancos en el portal de Davivienda.
export const BANCOS_SV = [
    "BANCO AGRICOLA",
    "BANCO CUSCATLAN",
    "BANCO DAVIVIENDA",
    "BANCO DE AMERICA CENTRAL (BAC)",
    "BANCO PROMERICA",
    "BANCO ATLANTIDA",
    "BANCO INDUSTRIAL",
    "BANCO HIPOTECARIO",
    "BANCO DE FOMENTO AGROPECUARIO",
    "BANCO ABANK"
];

const etiqueta = (lista, valor) => lista.find((x) => x.valor === valor)?.etiqueta || valor || "";
export const etiquetaTipoCuenta = (v) => etiqueta(TIPOS_CUENTA, String(v || "").toUpperCase());
export const etiquetaTipoPersona = (v) => etiqueta(TIPOS_PERSONA, v);

// SWIFT/BIC: 8 u 11 caracteres. ABA (EE. UU.): 9 dígitos.
export const swiftAbaValido = (v) => {
    const x = String(v || "").replace(/\s/g, "").toUpperCase();
    return /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(x) || /^\d{9}$/.test(x);
};

// Proveedores registrados antes del campo "origen".
export const origenDeProveedor = (p) => {
    if (p?.origen === ORIGENES.LOCAL || p?.origen === ORIGENES.EXTERIOR) return p.origen;
    return (p?.cuentasBancarias || []).some((c) => String(c.swift || "").trim()) ? ORIGENES.EXTERIOR : ORIGENES.LOCAL;
};

// Peticiones anteriores al campo "tipo".
export const tipoDePeticion = (p) => {
    if (p?.tipo === ORIGENES.LOCAL || p?.tipo === ORIGENES.EXTERIOR) return p.tipo;
    return String(p?.cuentaBancaria?.swift || "").trim() ? ORIGENES.EXTERIOR : ORIGENES.LOCAL;
};

// Mismo criterio que el backend: área del usuario marcada "Puede
// peticionar al exterior" (Compras), o rol Administrador.
export const puedePeticionarExterior = (userData, areas = []) =>
    userData?.role === ROLES.ADMIN || areas.some((a) => a.id === userData?.areaId && a.permiteExterior === true);

export const cuentaLocalVacia = () => ({
    banco: "", tipoCuenta: "CORRIENTE", numeroCuenta: "", tipoPersona: "JURIDICO", titular: "", moneda: "USD"
});

export const intermediarioVacio = () => ({ swift: "" });

export const cuentaExteriorVacia = () => ({
    titular: "", numeroCuenta: "", direccionBeneficiario: "", tipoPersona: "JURIDICO", telefono: "",
    swift: "",
    intermediario: null,
    moneda: "USD"
});

// Al cambiar el origen del proveedor se conservan los datos comunes.
export const convertirCuenta = (c, origen) => {
    const base = origen === ORIGENES.EXTERIOR ? cuentaExteriorVacia() : cuentaLocalVacia();
    ["id", "numeroCuenta", "titular", "tipoPersona"].forEach((k) => { if (c[k]) base[k] = c[k]; });
    if (origen === ORIGENES.EXTERIOR) {
        if (c.moneda) base.moneda = c.moneda;
        if (c.swift) base.swift = c.swift;
        if (c.intermediario?.swift) base.intermediario = { swift: c.intermediario.swift };
    } else {
        if (c.banco) base.banco = c.banco;
        base.tipoCuenta = String(c.tipoCuenta || "CORRIENTE").toUpperCase().replace("AHORROS", "AHORRO");
    }
    return base;
};

// Texto corto para el <select> de cuentas.
export const descripcionCuenta = (c, origen) =>
    (origen === ORIGENES.EXTERIOR
        ? `SWIFT/ABA ${c.swift || "—"} · ${c.numeroCuenta} · ${c.titular}${c.moneda ? ` (${c.moneda})` : ""}`
        : `${c.banco} · ${etiquetaTipoCuenta(c.tipoCuenta)} ${c.numeroCuenta} · ${c.titular}`) + (c.secundaria ? " (secundaria)" : "");

// Principal primero; luego las secundarias (cuentas de proyectos, etc.).
export const ordenarCuentas = (cuentas = []) => [...cuentas].sort((a, b) => Number(Boolean(a.secundaria)) - Number(Boolean(b.secundaria)));

// Filas etiqueta/valor para mostrar la cuenta en solo lectura.
export const filasCuenta = (c, origen) => {
    if (!c) return [];
    if (origen === ORIGENES.EXTERIOR) {
        const filas = [
            { grupo: "Beneficiario", etiqueta: "Nombre del beneficiario", valor: c.titular },
            { grupo: "Beneficiario", etiqueta: "Cuenta beneficiario", valor: c.numeroCuenta },
            { grupo: "Beneficiario", etiqueta: "Dirección del beneficiario", valor: c.direccionBeneficiario },
            { grupo: "Beneficiario", etiqueta: "Tipo de beneficiario", valor: etiquetaTipoPersona(c.tipoPersona) },
            { grupo: "Beneficiario", etiqueta: "Teléfono del beneficiario", valor: c.telefono },
            { grupo: "Banco del beneficiario", etiqueta: "N° ABA o SWIFT", valor: c.swift },
            { grupo: "Banco del beneficiario", etiqueta: "Moneda", valor: c.moneda }
        ];
        if (c.intermediario) {
            filas.push(
                { grupo: "Banco intermediario", etiqueta: "N° ABA o SWIFT", valor: c.intermediario.swift }
            );
        }
        return filas;
    }
    return [
        { grupo: "Cuenta destino", etiqueta: "Banco", valor: c.banco },
        { grupo: "Cuenta destino", etiqueta: "Tipo de cuenta", valor: etiquetaTipoCuenta(c.tipoCuenta) },
        { grupo: "Cuenta destino", etiqueta: "Cuenta destino", valor: c.numeroCuenta },
        { grupo: "Cuenta destino", etiqueta: "Tipo cliente", valor: etiquetaTipoPersona(c.tipoPersona) },
        { grupo: "Cuenta destino", etiqueta: "Titular", valor: c.titular }
    ];
};

// Campos obligatorios que faltan en una cuenta, según el tipo. Mismo
// criterio que backend/src/validators/catalogo.validator.js.
export const faltantesCuenta = (c, tipo) => {
    if (!c) return ["datos de la cuenta"];
    const vacio = (v) => String(v ?? "").trim() === "";
    const faltan = [];
    if (tipo === ORIGENES.EXTERIOR) {
        if (vacio(c.titular)) faltan.push("nombre del beneficiario");
        if (vacio(c.numeroCuenta)) faltan.push("cuenta del beneficiario");
        if (vacio(c.direccionBeneficiario)) faltan.push("dirección del beneficiario");
        if (vacio(c.swift)) faltan.push("SWIFT/ABA del banco");
        else if (!swiftAbaValido(c.swift)) faltan.push("SWIFT/ABA válido (8 u 11 caracteres o 9 dígitos)");
        if (c.intermediario && !swiftAbaValido(c.intermediario.swift)) faltan.push("SWIFT/ABA del banco intermediario");
    } else {
        if (vacio(c.banco)) faltan.push("banco");
        if (vacio(c.numeroCuenta)) faltan.push("cuenta destino");
        else if (!/^\d+$/.test(String(c.numeroCuenta).replace(/[\s-]/g, ""))) faltan.push("cuenta destino (solo números)");
        if (vacio(c.titular)) faltan.push("titular");
    }
    return faltan;
};
