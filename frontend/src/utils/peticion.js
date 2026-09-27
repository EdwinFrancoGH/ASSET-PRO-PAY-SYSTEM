import { hoyISO } from "./formato";

// Debe coincidir con CAMPOS_OBLIGATORIOS en
// backend/src/validators/peticion.validator.js
export const CAMPOS_OBLIGATORIOS = {
    fechaSolicitud: "Fecha solicitud",
    areaId: "Área",
    proveedorId: "Proveedor",
    terminoPagoId: "Términos de pago",
    montoCompra: "Monto compra",
    razonPago: "Razón del pago",
    porcentaje: "%",
    monto: "Monto",
    moneda: "Moneda",
    autorizadorId: "Autoriza",
    conceptoCompra: "Concepto de compra"
};

export const MONEDAS = ["USD", "EUR"];

export const formularioVacio = () => ({
    fechaSolicitud: hoyISO(),
    areaId: "",
    ordenELM: "",
    ticketCompromiso: "",
    proveedorId: "",
    proforma: "",
    terminoPagoId: "",
    montoCompra: "",
    razonPago: "",
    cliente: "",
    licitacionOC: "",
    fechaEntrega: "",
    proyecto: "",
    porcentaje: "100",
    monto: "",
    moneda: "USD",
    autorizadorId: "",
    conceptoCompra: "",
    pagarCuentaDiferente: false,
    cuentaBancariaId: "",
    nuevaCuentaBancaria: "",
    observaciones: ""
});

export const formularioDesdePeticion = (p) => {
    const base = formularioVacio();
    Object.keys(base).forEach((k) => {
        if (p[k] !== undefined && p[k] !== null) base[k] = typeof base[k] === "boolean" ? Boolean(p[k]) : String(p[k]);
    });
    return base;
};

export const camposFaltantes = (f) => {
    const faltan = Object.entries(CAMPOS_OBLIGATORIOS)
        .filter(([campo]) => String(f[campo] ?? "").trim() === "")
        .map(([campo]) => campo);
    if (f.pagarCuentaDiferente ? !f.nuevaCuentaBancaria.trim() : !f.cuentaBancariaId) faltan.push("cuenta");
    return faltan;
};

export const calcularMontoPagar = (monto, porcentaje) => {
    const m = Number(monto);
    const p = Number(porcentaje);
    if (!monto || !porcentaje || !Number.isFinite(m) || !Number.isFinite(p)) return null;
    return Math.round(m * p) / 100;
};
