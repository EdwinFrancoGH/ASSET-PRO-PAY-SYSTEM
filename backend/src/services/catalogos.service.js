import crypto from "crypto";
import db from "../config/firebase.js";
import { ORIGENES, origenDeProveedor, normalizarTipoCuenta, normalizarTipoPersona } from "../config/bancario.js";
import { LISTA_CLASIFICACIONES } from "../config/impuestos.js";

// Catálogos que alimentan los <select> del formulario de petición.
// Nombre en la URL → colección en Firestore.
export const CATALOGOS = {
    areas: "areas",
    "terminos-pago": "terminosPago",
    proveedores: "proveedores"
};

const ordenarPorNombre = (lista) =>
    lista.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));

// Proveedores antiguos (sin "origen") se devuelven con el origen deducido.
const completar = (coleccion, registro) =>
    coleccion === "proveedores" ? { ...registro, origen: origenDeProveedor(registro) } : registro;

export const obtenerTodos = async (coleccion, { soloActivos = false } = {}) => {
    const snapshot = await db.collection(coleccion).get();
    const lista = snapshot.docs.map((doc) => completar(coleccion, { id: doc.id, ...doc.data() }));
    return ordenarPorNombre(soloActivos ? lista.filter((x) => x.activo !== false) : lista);
};

export const obtenerPorId = async (coleccion, id) => {
    if (!id) return null;
    const doc = await db.collection(coleccion).doc(id).get();
    return doc.exists ? completar(coleccion, { id: doc.id, ...doc.data() }) : null;
};

const t = (v) => String(v ?? "").trim();

// Datos de control de la cuenta que se conservan al editar el proveedor:
// secundaria (cuenta adicional, p. ej. para un proyecto) y quién la agregó.
const control = (c) => ({
    secundaria: c.secundaria === true || c.secundaria === "true",
    ...(c.agregadaPorNombre ? { agregadaPorId: c.agregadaPorId || null, agregadaPorNombre: c.agregadaPorNombre, fechaAgregada: c.fechaAgregada || null } : {}),
    ...(c.peticionOrigen ? { peticionOrigen: c.peticionOrigen } : {})
});

// Transferencia local: banco, tipo de cuenta, número, tipo de cliente y titular.
export const normalizarCuentaLocal = (c) => ({
    id: c.id || crypto.randomUUID(),
    banco: t(c.banco),
    tipoCuenta: normalizarTipoCuenta(c.tipoCuenta),
    numeroCuenta: t(c.numeroCuenta).replace(/[\s-]/g, ""),
    tipoPersona: normalizarTipoPersona(c.tipoPersona),
    titular: t(c.titular),
    moneda: "USD",
    ...control(c)
});

// Transferencia internacional: datos del beneficiario, SWIFT/ABA de su banco
// y SWIFT/ABA del banco intermediario (opcional). Nombre, país y dirección de
// los bancos no se guardan: la banca los completa a partir del SWIFT/ABA.
export const normalizarCuentaExterior = (c) => {
    const swiftIntermediario = t(c.intermediario?.swift).replace(/\s/g, "").toUpperCase();
    return {
        id: c.id || crypto.randomUUID(),
        // Beneficiario
        titular: t(c.titular),
        numeroCuenta: t(c.numeroCuenta).replace(/\s/g, "").toUpperCase(),
        direccionBeneficiario: t(c.direccionBeneficiario),
        tipoPersona: normalizarTipoPersona(c.tipoPersona),
        telefono: t(c.telefono),
        // Banco del beneficiario
        swift: t(c.swift).replace(/\s/g, "").toUpperCase(),
        // Banco intermediario
        intermediario: swiftIntermediario ? { swift: swiftIntermediario } : null,
        moneda: c.moneda || "USD",
        ...control(c)
    };
};

// Normaliza los datos según el catálogo, para que en Firestore solo se
// guarden los campos esperados.
export const normalizar = (catalogo, datos) => {
    const base = {
        nombre: String(datos.nombre || "").trim(),
        activo: datos.activo ?? true
    };

    if (catalogo === "terminos-pago") {
        base.dias = datos.dias === "" || datos.dias === undefined || datos.dias === null ? null : Number(datos.dias);
    }

    if (catalogo === "areas") {
        // Las áreas marcadas pueden peticionar a proveedores del exterior (Compras).
        base.permiteExterior = datos.permiteExterior === true || datos.permiteExterior === "true";
    }

    if (catalogo === "proveedores") {
        base.codigoSAP = String(datos.codigoSAP || "").trim();
        // Proveedores registrados por usuarios desde la petición: Contabilidad
        // completa el código SAP después.
        base.pendienteSAP = !base.codigoSAP;
        base.origen = origenDeProveedor(datos);
        // Solo proveedores locales: define IVA y retención del 1%.
        base.clasificacionContribuyente =
            base.origen === ORIGENES.LOCAL && LISTA_CLASIFICACIONES.includes(datos.clasificacionContribuyente) ? datos.clasificacionContribuyente : "";
        base.cuentasBancarias = (datos.cuentasBancarias || []).map((c) =>
            base.origen === ORIGENES.EXTERIOR ? normalizarCuentaExterior(c) : normalizarCuentaLocal(c)
        );
    }

    return base;
};

export const crear = async (catalogo, datos) => {
    const coleccion = CATALOGOS[catalogo];
    const registro = {
        ...normalizar(catalogo, datos),
        fechaRegistro: new Date().toISOString(),
        fechaActualizacion: new Date().toISOString()
    };
    const ref = await db.collection(coleccion).add(registro);
    return { id: ref.id, ...registro };
};

export const actualizar = async (catalogo, id, datos) => {
    const coleccion = CATALOGOS[catalogo];
    const ref = db.collection(coleccion).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return null;

    const cambios = { ...normalizar(catalogo, { ...doc.data(), ...datos }), fechaActualizacion: new Date().toISOString() };
    await ref.update(cambios);
    return { id, ...doc.data(), ...cambios };
};

export const eliminar = async (catalogo, id) => {
    const ref = db.collection(CATALOGOS[catalogo]).doc(id);
    const doc = await ref.get();
    if (!doc.exists) return false;
    await ref.delete();
    return true;
};
