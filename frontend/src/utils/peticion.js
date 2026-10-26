import { hoyISO } from "./formato";
import { faltantesCuenta } from "./bancario";

// Debe coincidir con CAMPOS_OBLIGATORIOS en
// backend/src/validators/peticion.validator.js
export const CAMPOS_OBLIGATORIOS = {
    fechaSolicitud: "Fecha solicitud",
    areaId: "Área",
    tipoCliente: "Tipo",
    proveedorId: "Proveedor",
    terminoPago: "Término de pago",
    porcentaje: "%",
    monto: "Monto",
    moneda: "Moneda",
    autorizadorId: "Autoriza",
    conceptoCompra: "Concepto/Detalle o comentario de la compra"
};

export const MONEDAS = ["USD", "EUR"];

// Debe coincidir con TERMINOS_PAGO en backend/src/config/estados.js
export const TERMINOS_PAGO = [
    { valor: "ANTICIPO", etiqueta: "Anticipo" },
    { valor: "CONTADO", etiqueta: "Contado (con factura)" }
];

// Debe coincidir con TIPOS_CLIENTE en backend/src/config/estados.js.
// Cliente, Retail y Stock B2B solo para Compras; las demás áreas siempre
// usan Gasto/Costo Operativo.
export const TIPO_GASTO_OPERATIVO = "GASTO_OPERATIVO";
export const TIPOS_CLIENTE = [
    { valor: "CLIENTE", etiqueta: "Cliente" },
    { valor: "RETAIL", etiqueta: "Retail" },
    { valor: "STOCK", etiqueta: "Stock B2B" },
    { valor: "GASTO_OPERATIVO", etiqueta: "Gasto/Costo Operativo" }
];

export const etiquetaTipoCliente = (p) =>
    TIPOS_CLIENTE.find((t) => t.valor === p?.tipoCliente)?.etiqueta || (p?.cliente ? "Cliente" : "");

export const formularioVacio = () => ({
    fechaSolicitud: hoyISO(),
    areaId: "",
    ordenELM: "",
    proveedorId: "",
    terminoPago: "",
    terminoPagoId: "",
    tipoCliente: "",
    cliente: "",
    licitacionOC: "",
    porcentaje: "100",
    monto: "",
    moneda: "USD",
    autorizadorId: "",
    conceptoCompra: "",
    pagarCuentaDiferente: false,
    cuentaBancariaId: "",
    nuevaCuentaBancaria: "", // texto libre de peticiones antiguas
    nuevaCuenta: null, // cuenta diferente con los campos del tipo (local / exterior)
    documentoFiscal: "CCF", // solo locales: CCF o CONSUMIDOR_FINAL
    aplicaRetencionRenta: false, // solo locales: servicio de persona natural (10%)
    planId: "", // cuota de un plan de pago (ver /planes)
    cuotaId: "",
    observaciones: ""
});

export const formularioDesdePeticion = (p) => {
    const base = formularioVacio();
    Object.keys(base).forEach((k) => {
        if (k === "nuevaCuenta") return;
        if (p[k] !== undefined && p[k] !== null) base[k] = typeof base[k] === "boolean" ? Boolean(p[k]) : String(p[k]);
    });
    // La cuenta diferente se guarda en cuentaBancaria (marcada "nueva").
    if (p.pagarCuentaDiferente && p.cuentaBancaria) base.nuevaCuenta = JSON.parse(JSON.stringify(p.cuentaBancaria));
    // Peticiones antiguas: el "Proyecto" ahora va junto con Licitación / OC.
    base.licitacionOC = licitacionOCProyecto(p);
    // Peticiones antiguas sin tipo pero con nombre de cliente: tipo "Cliente".
    if (!base.tipoCliente && base.cliente) base.tipoCliente = "CLIENTE";
    return base;
};

// "Licitación / OC / Proyecto". Las peticiones antiguas tenían "Proyecto"
// en un campo aparte; se une al valor de Licitación / OC sin repetirlo.
export const licitacionOCProyecto = (p) => {
    const oc = String(p?.licitacionOC ?? "").trim();
    const proyecto = String(p?.proyecto ?? "").trim();
    if (!proyecto || oc.includes(proyecto)) return oc;
    return oc ? `${oc} / ${proyecto}` : proyecto;
};

// Debe coincidir con CONCEPTO_RETAIL en backend/src/config/estados.js
export const CONCEPTO_RETAIL = {
    LOCAL: "Compra de mercancía para surtir salas de venta.",
    EXTERIOR: "Purchase of merchandise to restock our retail stores."
};
export const esConceptoRetail = (texto) => Object.values(CONCEPTO_RETAIL).includes(String(texto || "").trim());

export const camposFaltantes = (f, tipo) => {
    const faltan = Object.entries(CAMPOS_OBLIGATORIOS)
        // En Retail el concepto es opcional.
        .filter(([campo]) => !(campo === "conceptoCompra" && f.tipoCliente === "RETAIL"))
        .filter(([campo]) => String(f[campo] ?? "").trim() === "")
        .map(([campo]) => campo);
    if (f.pagarCuentaDiferente) {
        if (f.nuevaCuenta ? faltantesCuenta(f.nuevaCuenta, tipo).length : !f.nuevaCuentaBancaria.trim()) faltan.push("cuenta");
    } else if (!f.cuentaBancariaId) {
        faltan.push("cuenta");
    }
    return faltan;
};

export const calcularMontoPagar = (monto, porcentaje) => {
    const m = Number(monto);
    const p = Number(porcentaje);
    if (!monto || !porcentaje || !Number.isFinite(m) || !Number.isFinite(p)) return null;
    return Math.round(m * p) / 100;
};
