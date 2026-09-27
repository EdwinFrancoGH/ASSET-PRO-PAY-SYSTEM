import crypto from "crypto";
import db from "../config/firebase.js";

// Catálogos que alimentan los <select> del formulario de petición.
// Nombre en la URL → colección en Firestore.
export const CATALOGOS = {
    areas: "areas",
    "terminos-pago": "terminosPago",
    proveedores: "proveedores"
};

const ordenarPorNombre = (lista) =>
    lista.sort((a, b) => (a.nombre || "").localeCompare(b.nombre || "", "es"));

export const obtenerTodos = async (coleccion, { soloActivos = false } = {}) => {
    const snapshot = await db.collection(coleccion).get();
    const lista = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return ordenarPorNombre(soloActivos ? lista.filter((x) => x.activo !== false) : lista);
};

export const obtenerPorId = async (coleccion, id) => {
    if (!id) return null;
    const doc = await db.collection(coleccion).doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

// Normaliza los datos según el catálogo, para que en Firestore solo se
// guarden los campos esperados.
const normalizar = (catalogo, datos) => {
    const base = {
        nombre: String(datos.nombre || "").trim(),
        activo: datos.activo ?? true
    };

    if (catalogo === "terminos-pago") {
        base.dias = datos.dias === "" || datos.dias === undefined || datos.dias === null ? null : Number(datos.dias);
    }

    if (catalogo === "proveedores") {
        base.codigoSAP = String(datos.codigoSAP || "").trim();
        base.cuentasBancarias = (datos.cuentasBancarias || []).map((c) => ({
            id: c.id || crypto.randomUUID(),
            banco: String(c.banco || "").trim(),
            numeroCuenta: String(c.numeroCuenta || "").trim(),
            tipoCuenta: String(c.tipoCuenta || "").trim(),
            titular: String(c.titular || "").trim(),
            moneda: c.moneda || "USD",
            swift: String(c.swift || "").trim()
        }));
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
