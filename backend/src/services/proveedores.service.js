// Acciones sobre proveedores que puede hacer cualquier usuario desde la
// petición (sin ser Administrador ni Contabilidad):
//   - Registrar un proveedor nuevo. Queda "Pendiente SAP": Contabilidad
//     completa el código SAP en Catálogos.
//   - Agregar una cuenta bancaria a un proveedor existente (solo agregar;
//     no puede cambiar ni quitar datos existentes).
// Los proveedores del exterior solo los registra o modifica Compras.
import crypto from "crypto";
import db from "../config/firebase.js";
import { ORIGENES, origenDeProveedor } from "../config/bancario.js";
import { normalizar, normalizarCuentaLocal, normalizarCuentaExterior, obtenerPorId } from "./catalogos.service.js";
import { LISTA_CLASIFICACIONES } from "../config/impuestos.js";
import { validarCatalogo, validarCuenta } from "../validators/catalogo.validator.js";
import { esCompras } from "./permisos.service.js";
import { ErrorHttp } from "../utils/errores.js";

const ahora = () => new Date().toISOString();
const clave = (v) => String(v || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");

const verificarOrigen = async (origen, usuario) => {
    if (origen === ORIGENES.EXTERIOR && !(await esCompras(usuario))) {
        throw new ErrorHttp(403, "Solo el área de Compras puede registrar o modificar proveedores del exterior.");
    }
};

export const registrar = async (datos, usuario) => {
    const entrada = { ...datos, codigoSAP: "", activo: true, cuentasBancarias: datos.cuentasBancarias || [] };
    const error = validarCatalogo("proveedores", entrada);
    if (error) throw new ErrorHttp(400, error);
    await verificarOrigen(entrada.origen, usuario);

    // Evita duplicados por nombre (sin distinguir mayúsculas ni tildes).
    const existentes = await db.collection("proveedores").get();
    const duplicado = existentes.docs.find((d) => clave(d.data().nombre) === clave(entrada.nombre));
    if (duplicado) {
        throw new ErrorHttp(409, `Ya existe el proveedor "${duplicado.data().nombre}". Búscalo en la lista; si no tiene cuenta, agrégale una.`);
    }

    const registro = {
        ...normalizar("proveedores", entrada),
        registradoPorId: usuario.uid,
        registradoPorNombre: usuario.name || usuario.email,
        fechaRegistro: ahora(),
        fechaActualizacion: ahora()
    };
    const ref = await db.collection("proveedores").add(registro);
    return { id: ref.id, ...registro };
};

// Mismo número de cuenta (y mismo SWIFT en el exterior) = misma cuenta.
const mismaCuenta = (a, b) =>
    String(a.numeroCuenta || "").replace(/[\s-]/g, "").toUpperCase() === String(b.numeroCuenta || "").replace(/[\s-]/g, "").toUpperCase() &&
    String(a.swift || "").replace(/\s/g, "").toUpperCase() === String(b.swift || "").replace(/\s/g, "").toUpperCase();

// Cuenta principal: cuando el proveedor no tiene ninguna, el usuario la
// agrega desde la petición.
export const agregarCuenta = async (proveedorId, cuenta, usuario, { secundaria = false, peticionOrigen = null } = {}) => {
    const proveedor = await obtenerPorId("proveedores", proveedorId);
    if (!proveedor) throw new ErrorHttp(404, "Proveedor no encontrado.");

    const origen = origenDeProveedor(proveedor);
    await verificarOrigen(origen, usuario);

    const error = validarCuenta(cuenta, origen, "Cuenta");
    if (error) throw new ErrorHttp(400, error);

    const nueva = {
        ...(origen === ORIGENES.EXTERIOR ? normalizarCuentaExterior(cuenta) : normalizarCuentaLocal(cuenta)),
        id: crypto.randomUUID(),
        secundaria,
        ...(peticionOrigen ? { peticionOrigen } : {}),
        agregadaPorId: usuario.uid,
        agregadaPorNombre: usuario.name || usuario.email,
        fechaAgregada: ahora()
    };

    const ref = db.collection("proveedores").doc(proveedorId);
    let existente = null;
    await db.runTransaction(async (t) => {
        const doc = await t.get(ref);
        const cuentas = doc.data().cuentasBancarias || [];
        existente = cuentas.find((c) => mismaCuenta(c, nueva)) || null;
        if (!existente) t.update(ref, { cuentasBancarias: [...cuentas, nueva], fechaActualizacion: ahora() });
    });
    return { proveedor: await obtenerPorId("proveedores", proveedorId), cuenta: existente || nueva, yaExistia: Boolean(existente) };
};

// "Pagar a una cuenta diferente": al enviar la petición, la cuenta queda
// guardada en el proveedor como secundaria (p. ej. la cuenta de un
// proyecto). Si ya estaba registrada, no se duplica.
export const registrarCuentaSecundaria = (proveedorId, cuenta, usuario, numeroPeticion) =>
    agregarCuenta(proveedorId, cuenta, usuario, { secundaria: true, peticionOrigen: numeroPeticion });

// Clasificación del contribuyente: si el proveedor local aún no la tiene,
// cualquier usuario puede indicarla una vez desde la petición. Después
// solo Contabilidad la cambia en Catálogos.
export const definirClasificacion = async (proveedorId, clasificacion, usuario) => {
    if (!LISTA_CLASIFICACIONES.includes(clasificacion)) throw new ErrorHttp(400, "Clasificación no válida.");
    const proveedor = await obtenerPorId("proveedores", proveedorId);
    if (!proveedor) throw new ErrorHttp(404, "Proveedor no encontrado.");
    if (origenDeProveedor(proveedor) !== ORIGENES.LOCAL) throw new ErrorHttp(400, "La clasificación solo aplica a proveedores locales.");
    if (proveedor.clasificacionContribuyente) {
        throw new ErrorHttp(409, "El proveedor ya tiene clasificación. Si es incorrecta, pide a Contabilidad que la corrija en Catálogos.");
    }
    await db.collection("proveedores").doc(proveedorId).update({
        clasificacionContribuyente: clasificacion,
        clasificacionDefinidaPor: usuario.name || usuario.email,
        fechaActualizacion: ahora()
    });
    return obtenerPorId("proveedores", proveedorId);
};
