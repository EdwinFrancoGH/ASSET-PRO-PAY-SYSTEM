// Entrega de facturas: Compras registra las facturas (crédito o contado)
// que entrega a Contabilidad, y Contabilidad las recibe o las devuelve con
// un motivo para que Compras las corrija y las vuelva a entregar.
//
// Módulo independiente: no lee ni modifica peticiones, planes ni ninguna
// configuración de pagos. Solo usa el catálogo de proveedores (lectura) y
// las notificaciones de la app.
import db from "../config/firebase.js";
import { ROLES } from "../config/roles.js";
import { obtenerPorId as obtenerCatalogo } from "./catalogos.service.js";
import { esCompras } from "./permisos.service.js";
import { notificar, obtenerUsuariosPorRol } from "./notificaciones.service.js";
import { ErrorHttp } from "../utils/errores.js";

const COLECCION = "facturas";

export const TIPOS_FACTURA = { CREDITO: "CREDITO", CONTADO: "CONTADO" };
// ELIMINADA: Compras la quitó antes de que se recibiera. El registro no se
// borra: queda visible (con su historial) para Contabilidad.
export const ESTADOS_FACTURA = { ENTREGADA: "ENTREGADA", RECIBIDA: "RECIBIDA", DEVUELTA: "DEVUELTA", ELIMINADA: "ELIMINADA" };

const MONTO_MAXIMO = 99_999_999.99;
const MAX_LOTE = 200;

const ahora = () => new Date().toISOString();
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const texto = (v) => (v === undefined || v === null ? "" : String(v).trim());
const fechaValida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime());
// "Hoy" en El Salvador (AAAA-MM-DD), para no aceptar facturas con fecha futura.
const hoySV = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/El_Salvador" });
// Para comparar números de factura sin importar mayúsculas ni espacios.
const normalizarNumero = (v) => texto(v).toUpperCase().replace(/\s+/g, "");
// Día (AAAA-MM-DD, hora de El Salvador) de una fecha ISO: agrupa las
// recepciones por día.
export const diaSV = (iso) => (iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/El_Salvador" }) : "");

// ---------------------------------------------------------------------------
// Permisos
// ---------------------------------------------------------------------------
const esRevisor = (usuario) => [ROLES.ADMIN, ROLES.CONTABILIDAD].includes(usuario.role);

const verificarLectura = async (usuario) => {
    if (!esRevisor(usuario) && !(await esCompras(usuario))) {
        throw new ErrorHttp(403, "No tienes acceso a la entrega de facturas.");
    }
};

const verificarEscritura = async (usuario) => {
    if (!(await esCompras(usuario))) throw new ErrorHttp(403, "Solo el área de Compras puede registrar o corregir facturas.");
};

const verificarRevision = (usuario) => {
    if (!esRevisor(usuario)) throw new ErrorHttp(403, "Solo Contabilidad puede recibir o devolver facturas.");
};

// ---------------------------------------------------------------------------
// Validación
// ---------------------------------------------------------------------------
const validar = async (datos) => {
    const tipo = texto(datos.tipo).toUpperCase();
    if (!Object.values(TIPOS_FACTURA).includes(tipo)) throw new ErrorHttp(400, "Indica el tipo de factura: Crédito o Contado.");

    const numeroFactura = texto(datos.numeroFactura);
    if (!numeroFactura) throw new ErrorHttp(400, "Indica el número de factura.");
    if (numeroFactura.length > 60) throw new ErrorHttp(400, "El número de factura admite máximo 60 caracteres.");

    const montoOC = r2(datos.montoOC);
    if (!Number.isFinite(montoOC) || montoOC <= 0) throw new ErrorHttp(400, "El monto de la OC debe ser mayor a 0.");
    if (montoOC > MONTO_MAXIMO) throw new ErrorHttp(400, "El monto de la OC no es válido.");

    const fechaFactura = texto(datos.fechaFactura);
    if (!fechaValida(fechaFactura)) throw new ErrorHttp(400, "Indica una fecha de factura válida.");
    if (fechaFactura > hoySV()) throw new ErrorHttp(400, "La fecha de la factura no puede ser futura.");

    const proveedor = await obtenerCatalogo("proveedores", datos.proveedorId);
    if (!proveedor) throw new ErrorHttp(400, "Selecciona un proveedor válido.");

    return {
        tipo,
        numeroFactura,
        numeroFacturaNorm: normalizarNumero(numeroFactura),
        proveedorId: proveedor.id,
        proveedorNombre: proveedor.nombre,
        codigoSAP: proveedor.codigoSAP || "",
        montoOC,
        fechaFactura
    };
};

// El mismo número de factura no se puede registrar dos veces para el mismo proveedor.
const verificarDuplicado = async ({ proveedorId, numeroFacturaNorm, numeroFactura, proveedorNombre }, idActual = null) => {
    const snap = await db.collection(COLECCION)
        .where("proveedorId", "==", proveedorId)
        .where("numeroFacturaNorm", "==", numeroFacturaNorm)
        .get();
    // Las eliminadas no cuentan: se puede volver a registrar el mismo número.
    if (snap.docs.some((d) => d.id !== idActual && d.data().estado !== ESTADOS_FACTURA.ELIMINADA)) {
        throw new ErrorHttp(409, `La factura ${numeroFactura} de ${proveedorNombre} ya está registrada.`);
    }
};

const entradaHistorial = (usuario, accion, comentario = "") => ({
    accion,
    comentario: texto(comentario),
    usuarioId: usuario.uid,
    usuarioNombre: usuario.name || usuario.email,
    usuarioRol: usuario.role,
    fecha: ahora()
});

const etiquetaFactura = (f) => `${f.tipo === TIPOS_FACTURA.CREDITO ? "Crédito" : "Contado"} ${f.numeroFactura} · ${f.proveedorNombre}`;

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------
const leer = async (id) => {
    const doc = await db.collection(COLECCION).doc(id).get();
    if (!doc.exists) throw new ErrorHttp(404, "Factura no encontrada.");
    return { id: doc.id, ...doc.data() };
};

export const obtener = async (id, usuario) => {
    await verificarLectura(usuario);
    return leer(id);
};

// filtros: estado, tipo, proveedorId, q (número, proveedor, código SAP),
// desde / hasta (fecha de la factura, AAAA-MM-DD), diaEntrega / diaRecepcion
// (día en El Salvador, AAAA-MM-DD).
export const listar = async (usuario, filtros = {}) => {
    await verificarLectura(usuario);
    const snap = await db.collection(COLECCION).get();
    let lista = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (filtros.estado) lista = lista.filter((f) => f.estado === filtros.estado);
    if (filtros.tipo) lista = lista.filter((f) => f.tipo === filtros.tipo);
    if (filtros.proveedorId) lista = lista.filter((f) => f.proveedorId === filtros.proveedorId);
    if (fechaValida(filtros.desde)) lista = lista.filter((f) => f.fechaFactura >= filtros.desde);
    if (fechaValida(filtros.hasta)) lista = lista.filter((f) => f.fechaFactura <= filtros.hasta);
    if (fechaValida(filtros.diaEntrega)) lista = lista.filter((f) => diaSV(f.fechaEntrega) === filtros.diaEntrega);
    if (fechaValida(filtros.diaRecepcion)) lista = lista.filter((f) => diaSV(f.fechaRecepcion) === filtros.diaRecepcion);
    if (filtros.q) {
        const q = String(filtros.q).toLowerCase();
        lista = lista.filter((f) => [f.numeroFactura, f.proveedorNombre, f.codigoSAP].some((v) => (v || "").toLowerCase().includes(q)));
    }
    return lista.sort((a, b) => (b.fechaEntrega || "").localeCompare(a.fechaEntrega || ""));
};

// ---------------------------------------------------------------------------
// Compras: registrar, corregir / reenviar, eliminar
// ---------------------------------------------------------------------------
export const crear = async (datos, usuario) => {
    await verificarEscritura(usuario);
    const campos = await validar(datos);
    await verificarDuplicado(campos);

    const factura = {
        ...campos,
        estado: ESTADOS_FACTURA.ENTREGADA,
        motivoDevolucion: "",
        entregadoPorId: usuario.uid,
        entregadoPorNombre: usuario.name || usuario.email,
        fechaEntrega: ahora(),
        recibidoPorNombre: "",
        fechaRecepcion: null,
        fechaActualizacion: ahora(),
        historial: [entradaHistorial(usuario, "ENTREGADA")]
    };
    const ref = await db.collection(COLECCION).add(factura);

    const contabilidad = await obtenerUsuariosPorRol(ROLES.CONTABILIDAD);
    notificar({
        usuarioIds: contabilidad.map((u) => u.uid),
        titulo: "Factura entregada",
        mensaje: `${usuario.name || usuario.email} entregó la factura ${etiquetaFactura(factura)}.`,
        enviarEmail: false
    });

    return { id: ref.id, ...factura };
};

// Se puede corregir mientras no esté recibida. Si estaba DEVUELTA, al
// guardarla se vuelve a entregar (queda ENTREGADA).
export const modificar = async (id, datos, usuario) => {
    await verificarEscritura(usuario);
    const actual = await leer(id);
    if (actual.estado === ESTADOS_FACTURA.RECIBIDA) throw new ErrorHttp(409, "La factura ya fue recibida por Contabilidad; no se puede modificar.");
    if (actual.estado === ESTADOS_FACTURA.ELIMINADA) throw new ErrorHttp(409, "La factura fue eliminada; regístrala de nuevo si es necesario.");

    const campos = await validar(datos);
    await verificarDuplicado(campos, id);

    const reenvio = actual.estado === ESTADOS_FACTURA.DEVUELTA;
    const cambios = {
        ...campos,
        estado: ESTADOS_FACTURA.ENTREGADA,
        fechaActualizacion: ahora(),
        historial: [...(actual.historial || []), entradaHistorial(usuario, reenvio ? "REENTREGADA" : "CORREGIDA", datos.comentario)]
    };
    if (reenvio) cambios.fechaEntrega = ahora();
    await db.collection(COLECCION).doc(id).update(cambios);

    if (reenvio) {
        const contabilidad = await obtenerUsuariosPorRol(ROLES.CONTABILIDAD);
        notificar({
            usuarioIds: contabilidad.map((u) => u.uid),
            titulo: "Factura entregada de nuevo",
            mensaje: `${usuario.name || usuario.email} corrigió y volvió a entregar la factura ${etiquetaFactura(campos)}.`,
            enviarEmail: false
        });
    }
    return leer(id);
};

// Eliminar = anular. El documento se conserva (estado ELIMINADA) para que
// Contabilidad lo siga viendo con su historial. No se permite si ya se recibió.
export const eliminar = async (id, motivo, usuario) => {
    await verificarEscritura(usuario);
    if (texto(motivo).length > 1000) throw new ErrorHttp(400, "El motivo admite máximo 1000 caracteres.");
    const actual = await leer(id);
    if (actual.estado === ESTADOS_FACTURA.RECIBIDA) throw new ErrorHttp(409, "La factura ya fue recibida por Contabilidad; no se puede eliminar.");
    if (actual.estado === ESTADOS_FACTURA.ELIMINADA) throw new ErrorHttp(409, "La factura ya está eliminada.");

    await db.collection(COLECCION).doc(id).update({
        estado: ESTADOS_FACTURA.ELIMINADA,
        motivoEliminacion: texto(motivo),
        eliminadoPorNombre: usuario.name || usuario.email,
        fechaEliminacion: ahora(),
        fechaActualizacion: ahora(),
        historial: [...(actual.historial || []), entradaHistorial(usuario, "ELIMINADA", motivo)]
    });

    const contabilidad = await obtenerUsuariosPorRol(ROLES.CONTABILIDAD);
    notificar({
        usuarioIds: contabilidad.map((u) => u.uid),
        titulo: "Factura eliminada",
        mensaje: `${usuario.name || usuario.email} eliminó la factura ${etiquetaFactura(actual)}${texto(motivo) ? `. Motivo: ${texto(motivo)}` : "."}`,
        enviarEmail: false
    });
    return leer(id);
};

// ---------------------------------------------------------------------------
// Contabilidad: recibir (una o varias) y devolver
// ---------------------------------------------------------------------------
export const recibir = async (ids, usuario, comentario = "") => {
    verificarRevision(usuario);
    const lista = [...new Set((Array.isArray(ids) ? ids : [ids]).filter(Boolean))];
    if (!lista.length) throw new ErrorHttp(400, "Selecciona al menos una factura.");
    if (lista.length > MAX_LOTE) throw new ErrorHttp(400, `Puedes recibir máximo ${MAX_LOTE} facturas a la vez.`);

    const refs = lista.map((id) => db.collection(COLECCION).doc(id));
    const recibidas = [];
    const omitidas = [];

    await db.runTransaction(async (t) => {
        const docs = await t.getAll(...refs);
        docs.forEach((doc) => {
            if (!doc.exists || doc.data().estado !== ESTADOS_FACTURA.ENTREGADA) {
                omitidas.push(doc.exists ? doc.data().numeroFactura : doc.id);
                return;
            }
            const f = doc.data();
            t.update(doc.ref, {
                estado: ESTADOS_FACTURA.RECIBIDA,
                recibidoPorId: usuario.uid,
                recibidoPorNombre: usuario.name || usuario.email,
                fechaRecepcion: ahora(),
                fechaActualizacion: ahora(),
                historial: [...(f.historial || []), entradaHistorial(usuario, "RECIBIDA", comentario)]
            });
            recibidas.push(doc.id);
        });
    });

    return { recibidas: recibidas.length, omitidas };
};

export const devolver = async (id, motivo, usuario) => {
    verificarRevision(usuario);
    if (!texto(motivo)) throw new ErrorHttp(400, "Indica el motivo de la devolución.");
    if (texto(motivo).length > 1000) throw new ErrorHttp(400, "El motivo admite máximo 1000 caracteres.");

    const actual = await leer(id);
    if (actual.estado !== ESTADOS_FACTURA.ENTREGADA) throw new ErrorHttp(409, "Solo se pueden devolver facturas pendientes de recibir.");

    await db.collection(COLECCION).doc(id).update({
        estado: ESTADOS_FACTURA.DEVUELTA,
        motivoDevolucion: texto(motivo),
        fechaActualizacion: ahora(),
        historial: [...(actual.historial || []), entradaHistorial(usuario, "DEVUELTA", motivo)]
    });

    notificar({
        usuarioIds: [actual.entregadoPorId],
        titulo: "Factura devuelta",
        mensaje: `Contabilidad devolvió la factura ${etiquetaFactura(actual)}. Motivo: ${texto(motivo)}`,
        enviarEmail: true
    });
    return leer(id);
};
