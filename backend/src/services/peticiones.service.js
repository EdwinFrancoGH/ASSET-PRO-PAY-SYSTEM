import fs from "fs";
import path from "path";
import crypto from "crypto";
import db from "../config/firebase.js";
import { ROLES } from "../config/roles.js";
import { ESTADOS, ETIQUETAS_ESTADO, ESTADOS_EDITABLES, ESTADOS_PENDIENTES_AUTORIZADOR } from "../config/estados.js";
import { obtenerPorId as obtenerCatalogo } from "./catalogos.service.js";
import { notificar, obtenerUsuariosPorRol } from "./notificaciones.service.js";
import { validarPeticion } from "../validators/peticion.validator.js";
import { ErrorHttp } from "../utils/errores.js";
import { UPLOADS_DIR } from "../middlewares/upload.middleware.js";

const COLECCION = "peticiones";

const ahora = () => new Date().toISOString();
const redondear = (n) => Math.round(Number(n) * 100) / 100;
const numeroONull = (v) => (v === "" || v === undefined || v === null ? null : Number(v));
const texto = (v) => (v === undefined || v === null ? "" : String(v).trim());

const esGestion = (usuario) => [ROLES.CONTABILIDAD, ROLES.ADMIN].includes(usuario.role);

// ---------------------------------------------------------------------------
// Correlativo PP-AAAA-00001. Se genera en una transacción sobre
// contadores/peticiones-AAAA para que dos peticiones simultáneas nunca
// reciban el mismo número.
// ---------------------------------------------------------------------------
const generarNumero = async () => {
    const anio = new Date().getFullYear();
    const ref = db.collection("contadores").doc(`peticiones-${anio}`);

    const siguiente = await db.runTransaction(async (t) => {
        const doc = await t.get(ref);
        const valor = (doc.exists ? doc.data().valor : 0) + 1;
        t.set(ref, { valor, actualizado: ahora() });
        return valor;
    });

    return `PP-${anio}-${String(siguiente).padStart(5, "0")}`;
};

// ---------------------------------------------------------------------------
// Construye los campos de la petición a partir de lo que envía el
// formulario. Los nombres de área, proveedor, término de pago, autorizador
// y la cuenta bancaria se toman de los catálogos (no del navegador) y se
// guardan como "foto" en la petición: si mañana cambia el catálogo, la
// petición conserva los datos con los que se aprobó.
// ---------------------------------------------------------------------------
const construirCampos = async (datos, solicitante) => {
    const [area, proveedor, termino] = await Promise.all([
        obtenerCatalogo("areas", datos.areaId),
        obtenerCatalogo("proveedores", datos.proveedorId),
        obtenerCatalogo("terminosPago", datos.terminoPagoId)
    ]);

    if (datos.areaId && !area) throw new ErrorHttp(400, "El área seleccionada no existe.");
    if (datos.proveedorId && !proveedor) throw new ErrorHttp(400, "El proveedor seleccionado no existe.");
    if (datos.terminoPagoId && !termino) throw new ErrorHttp(400, "El término de pago seleccionado no existe.");

    let autorizador = null;
    if (datos.autorizadorId) {
        if (datos.autorizadorId === solicitante.uid) {
            throw new ErrorHttp(400, "No puedes ser el autorizador de tu propia petición.");
        }
        const doc = await db.collection("usuarios").doc(datos.autorizadorId).get();
        if (!doc.exists || doc.data().role !== ROLES.AUTORIZADOR || doc.data().activo === false) {
            throw new ErrorHttp(400, "El autorizador seleccionado no es válido o está inactivo.");
        }
        autorizador = { uid: doc.id, ...doc.data() };
    }

    const pagarCuentaDiferente = datos.pagarCuentaDiferente === true || datos.pagarCuentaDiferente === "true" || datos.pagarCuentaDiferente === "Sí";

    let cuentaBancaria = null;
    if (!pagarCuentaDiferente && datos.cuentaBancariaId) {
        cuentaBancaria = (proveedor?.cuentasBancarias || []).find((c) => c.id === datos.cuentaBancariaId) || null;
        if (!cuentaBancaria) throw new ErrorHttp(400, "La cuenta bancaria seleccionada no pertenece al proveedor.");
    }

    const montoCompra = numeroONull(datos.montoCompra);
    const porcentaje = numeroONull(datos.porcentaje);
    // "Monto" es la base sobre la que se aplica el %; si no se indica, se
    // usa el monto de compra. Monto a pagar = Monto × % / 100.
    const monto = numeroONull(datos.monto) ?? montoCompra;
    const montoPagar = monto !== null && porcentaje !== null ? redondear((monto * porcentaje) / 100) : null;

    return {
        // Información general
        fechaSolicitud: texto(datos.fechaSolicitud) || null,
        areaId: area?.id || null,
        areaNombre: area?.nombre || "",
        ordenELM: texto(datos.ordenELM),
        ticketCompromiso: texto(datos.ticketCompromiso),

        // Proveedor
        proveedorId: proveedor?.id || null,
        proveedorNombre: proveedor?.nombre || "",
        codigoSAP: proveedor?.codigoSAP || "",
        proforma: texto(datos.proforma),
        terminoPagoId: termino?.id || null,
        terminoPagoNombre: termino?.nombre || "",
        montoCompra,
        razonPago: texto(datos.razonPago),

        // Cliente
        cliente: texto(datos.cliente),
        licitacionOC: texto(datos.licitacionOC),
        fechaEntrega: texto(datos.fechaEntrega) || null,
        proyecto: texto(datos.proyecto),

        // Pago
        porcentaje,
        monto,
        moneda: datos.moneda || "USD",
        autorizadorId: autorizador?.uid || null,
        autorizadorNombre: autorizador?.name || "",
        autorizadorEmail: autorizador?.email || "",
        montoPagar,
        conceptoCompra: texto(datos.conceptoCompra),

        // Datos bancarios
        pagarCuentaDiferente,
        cuentaBancariaId: cuentaBancaria?.id || null,
        cuentaBancaria,
        nuevaCuentaBancaria: pagarCuentaDiferente ? texto(datos.nuevaCuentaBancaria) : "",

        observaciones: texto(datos.observaciones)
    };
};

const entradaHistorial = (usuario, accion, estadoAnterior, estadoNuevo, comentario = "") => ({
    accion,
    estadoAnterior: estadoAnterior || null,
    estadoNuevo,
    usuarioId: usuario.uid,
    usuarioNombre: usuario.name || usuario.email,
    usuarioRol: usuario.role,
    comentario: texto(comentario),
    fecha: ahora()
});

// ---------------------------------------------------------------------------
// Permisos de lectura
// ---------------------------------------------------------------------------
export const puedeVer = (peticion, usuario) => {
    if (peticion.solicitanteId === usuario.uid) return true;
    if (peticion.estado === ESTADOS.BORRADOR) return false;
    if (peticion.autorizadorId === usuario.uid) return true;
    return esGestion(usuario);
};

const leer = async (id) => {
    const doc = await db.collection(COLECCION).doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

const leerVisible = async (id, usuario) => {
    const peticion = await leer(id);
    if (!peticion || !puedeVer(peticion, usuario)) throw new ErrorHttp(404, "Petición no encontrada.");
    return peticion;
};

// ---------------------------------------------------------------------------
// Transición de estado genérica, dentro de una transacción de Firestore:
// si dos personas actúan al mismo tiempo, solo la primera gana y la segunda
// recibe un error claro en vez de sobrescribir.
// ---------------------------------------------------------------------------
const transicionar = async (id, usuario, { desde, hacia, accion, comentario, verificar, extra = {} }) => {
    const ref = db.collection(COLECCION).doc(id);

    return db.runTransaction(async (t) => {
        const doc = await t.get(ref);
        if (!doc.exists) throw new ErrorHttp(404, "Petición no encontrada.");

        const peticion = { id: doc.id, ...doc.data() };
        if (!puedeVer(peticion, usuario)) throw new ErrorHttp(404, "Petición no encontrada.");

        if (verificar) verificar(peticion);

        if (!desde.includes(peticion.estado)) {
            throw new ErrorHttp(409, `La petición está "${ETIQUETAS_ESTADO[peticion.estado]}" y ya no admite esta acción. Recarga la página.`);
        }

        const cambios = {
            ...(typeof extra === "function" ? extra(peticion) : extra),
            estado: hacia,
            fechaActualizacion: ahora(),
            historial: [...(peticion.historial || []), entradaHistorial(usuario, accion, peticion.estado, hacia, comentario)]
        };

        t.update(ref, cambios);
        return { ...peticion, ...cambios };
    });
};

// ---------------------------------------------------------------------------
// CRUD del solicitante
// ---------------------------------------------------------------------------
export const crear = async (datos, usuario) => {
    const campos = await construirCampos(datos, usuario);
    const numero = await generarNumero();

    const peticion = {
        numero,
        estado: ESTADOS.BORRADOR,
        ...campos,
        solicitanteId: usuario.uid,
        solicitanteNombre: usuario.name || usuario.email,
        solicitanteEmail: usuario.email,
        adjuntos: [],
        pago: null,
        historial: [entradaHistorial(usuario, "CREADA", null, ESTADOS.BORRADOR)],
        fechaCreacion: ahora(),
        fechaActualizacion: ahora()
    };

    const ref = await db.collection(COLECCION).add(peticion);
    return { id: ref.id, ...peticion };
};

const verificarEditable = (peticion, usuario) => {
    if (peticion.solicitanteId !== usuario.uid) {
        throw new ErrorHttp(403, "Solo el solicitante puede modificar esta petición.");
    }
    if (!ESTADOS_EDITABLES.includes(peticion.estado)) {
        throw new ErrorHttp(409, "Solo se pueden modificar peticiones en borrador o rechazadas.");
    }
};

export const actualizar = async (id, datos, usuario) => {
    const peticion = await leerVisible(id, usuario);
    verificarEditable(peticion, usuario);

    const cambios = { ...(await construirCampos(datos, usuario)), fechaActualizacion: ahora() };
    await db.collection(COLECCION).doc(id).update(cambios);
    return { ...peticion, ...cambios };
};

export const eliminar = async (id, usuario) => {
    const peticion = await leerVisible(id, usuario);

    if (peticion.solicitanteId !== usuario.uid || peticion.estado !== ESTADOS.BORRADOR) {
        throw new ErrorHttp(409, "Solo puedes eliminar tus peticiones en borrador.");
    }

    await db.collection(COLECCION).doc(id).delete();
    fs.rm(path.join(UPLOADS_DIR, "peticiones", id), { recursive: true, force: true }, () => {});
    return true;
};

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------

// Al abrir el detalle, si quien lo abre es el autorizador asignado y la
// petición está "Enviada", pasa automáticamente a "En revisión".
export const obtenerDetalle = async (id, usuario) => {
    const peticion = await leerVisible(id, usuario);

    if (peticion.estado === ESTADOS.ENVIADA && peticion.autorizadorId === usuario.uid) {
        try {
            const actualizada = await transicionar(id, usuario, {
                desde: [ESTADOS.ENVIADA],
                hacia: ESTADOS.EN_REVISION,
                accion: "EN_REVISION"
            });

            notificar({
                usuarioIds: [actualizada.solicitanteId],
                titulo: "Tu petición está en revisión",
                mensaje: `${usuario.name} comenzó a revisar la petición ${actualizada.numero}.`,
                peticion: actualizada,
                enviarEmail: false
            });

            return actualizada;
        } catch {
            return leerVisible(id, usuario);
        }
    }

    return peticion;
};

const consultarVisibles = async (usuario, { soloMias = false } = {}) => {
    const col = db.collection(COLECCION);

    if (soloMias || usuario.role === ROLES.EMPLEADO) {
        const snap = await col.where("solicitanteId", "==", usuario.uid).get();
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }

    if (usuario.role === ROLES.AUTORIZADOR) {
        const [asignadas, propias] = await Promise.all([
            col.where("autorizadorId", "==", usuario.uid).get(),
            col.where("solicitanteId", "==", usuario.uid).get()
        ]);
        const mapa = new Map();
        [...asignadas.docs, ...propias.docs].forEach((d) => mapa.set(d.id, { id: d.id, ...d.data() }));
        return [...mapa.values()];
    }

    // Contabilidad y Administrador: todas (menos borradores ajenos).
    const snap = await col.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// Filtros: estado (uno o varios separados por coma), desde, hasta
// (fecha de solicitud), areaId, proveedorId, moneda, q (texto libre),
// alcance=mias.
export const listar = async (usuario, filtros = {}) => {
    let lista = (await consultarVisibles(usuario, { soloMias: filtros.alcance === "mias" }))
        .filter((p) => puedeVer(p, usuario));

    if (filtros.estado) {
        const estados = String(filtros.estado).split(",");
        lista = lista.filter((p) => estados.includes(p.estado));
    }
    if (filtros.desde) lista = lista.filter((p) => (p.fechaSolicitud || "") >= filtros.desde);
    if (filtros.hasta) lista = lista.filter((p) => (p.fechaSolicitud || "") <= filtros.hasta);
    if (filtros.areaId) lista = lista.filter((p) => p.areaId === filtros.areaId);
    if (filtros.proveedorId) lista = lista.filter((p) => p.proveedorId === filtros.proveedorId);
    if (filtros.moneda) lista = lista.filter((p) => p.moneda === filtros.moneda);
    if (filtros.q) {
        const q = String(filtros.q).toLowerCase();
        lista = lista.filter((p) =>
            [p.numero, p.proveedorNombre, p.solicitanteNombre, p.cliente, p.proyecto, p.ordenELM, p.proforma, p.licitacionOC]
                .some((v) => (v || "").toLowerCase().includes(q))
        );
    }

    return lista.sort((a, b) => (b.fechaCreacion || "").localeCompare(a.fechaCreacion || ""));
};

// Lo que cada usuario tiene pendiente de hacer (bandeja y dashboard).
export const pendientes = async (usuario) => {
    const visibles = await listar(usuario);
    const resultado = [];

    for (const p of visibles) {
        if (p.solicitanteId === usuario.uid && ESTADOS_EDITABLES.includes(p.estado)) {
            resultado.push({ ...p, accionPendiente: p.estado === ESTADOS.BORRADOR ? "Enviar borrador" : "Corregir y reenviar" });
        } else if (p.autorizadorId === usuario.uid && ESTADOS_PENDIENTES_AUTORIZADOR.includes(p.estado)) {
            resultado.push({ ...p, accionPendiente: "Autorizar" });
        } else if (usuario.role === ROLES.CONTABILIDAD && p.estado === ESTADOS.APROBADA_AUTORIZADOR) {
            resultado.push({ ...p, accionPendiente: "Revisión contable" });
        } else if (usuario.role === ROLES.CONTABILIDAD && p.estado === ESTADOS.APROBADA_CONTABILIDAD) {
            resultado.push({ ...p, accionPendiente: "Registrar pago" });
        }
    }

    return resultado;
};

// ---------------------------------------------------------------------------
// Flujo
// ---------------------------------------------------------------------------
export const enviar = async (id, usuario) => {
    const actual = await leerVisible(id, usuario);
    verificarEditable(actual, usuario);

    const error = validarPeticion(actual, { completa: true });
    if (error) throw new ErrorHttp(400, error);

    // El autorizador pudo haber sido desactivado desde que se guardó el borrador.
    const autorizador = await db.collection("usuarios").doc(actual.autorizadorId).get();
    if (!autorizador.exists || autorizador.data().role !== ROLES.AUTORIZADOR || autorizador.data().activo === false) {
        throw new ErrorHttp(400, "El autorizador asignado ya no está disponible. Elige otro y guarda de nuevo.");
    }

    const esReenvio = actual.estado !== ESTADOS.BORRADOR;

    const peticion = await transicionar(id, usuario, {
        desde: ESTADOS_EDITABLES,
        hacia: ESTADOS.ENVIADA,
        accion: esReenvio ? "REENVIADA" : "ENVIADA",
        verificar: (p) => verificarEditable(p, usuario),
        extra: { fechaEnvio: ahora() }
    });

    await notificar({
        usuarioIds: [peticion.autorizadorId],
        titulo: esReenvio ? "Petición corregida pendiente de autorizar" : "Nueva petición pendiente de autorizar",
        mensaje: `${usuario.name} ${esReenvio ? "corrigió y reenvió" : "envió"} la petición ${peticion.numero} para tu autorización.`,
        peticion
    });

    return peticion;
};

export const decidirAutorizador = async (id, usuario, { decision, comentario }) => {
    const aprobar = decision === "aprobar";

    const peticion = await transicionar(id, usuario, {
        desde: ESTADOS_PENDIENTES_AUTORIZADOR,
        hacia: aprobar ? ESTADOS.APROBADA_AUTORIZADOR : ESTADOS.RECHAZADA_AUTORIZADOR,
        accion: aprobar ? "APROBADA_AUTORIZADOR" : "RECHAZADA_AUTORIZADOR",
        comentario,
        verificar: (p) => {
            if (p.autorizadorId !== usuario.uid) throw new ErrorHttp(403, "Esta petición está asignada a otro autorizador.");
        },
        extra: aprobar ? { fechaAprobacionAutorizador: ahora() } : { fechaRechazo: ahora() }
    });

    if (aprobar) {
        const contabilidad = await obtenerUsuariosPorRol(ROLES.CONTABILIDAD);
        await Promise.all([
            notificar({
                usuarioIds: [peticion.solicitanteId],
                titulo: "Tu petición fue autorizada",
                mensaje: `${usuario.name} autorizó la petición ${peticion.numero}. Ahora pasa a revisión de contabilidad.`,
                peticion
            }),
            notificar({
                usuarioIds: contabilidad.map((u) => u.uid),
                titulo: "Petición autorizada pendiente de revisión contable",
                mensaje: `${usuario.name} autorizó la petición ${peticion.numero} de ${peticion.solicitanteNombre}.`,
                peticion
            })
        ]);
    } else {
        await notificar({
            usuarioIds: [peticion.solicitanteId],
            titulo: "Tu petición fue rechazada por el autorizador",
            mensaje: `${usuario.name} rechazó la petición ${peticion.numero}. Motivo: ${comentario}`,
            peticion
        });
    }

    return peticion;
};

const verificarContabilidad = (usuario) => {
    if (usuario.role !== ROLES.CONTABILIDAD) throw new ErrorHttp(403, "Solo Contabilidad puede realizar esta acción.");
};

export const decidirContabilidad = async (id, usuario, { decision, comentario }) => {
    verificarContabilidad(usuario);
    const aprobar = decision === "aprobar";

    const peticion = await transicionar(id, usuario, {
        desde: [ESTADOS.APROBADA_AUTORIZADOR],
        hacia: aprobar ? ESTADOS.APROBADA_CONTABILIDAD : ESTADOS.RECHAZADA_CONTABILIDAD,
        accion: aprobar ? "APROBADA_CONTABILIDAD" : "RECHAZADA_CONTABILIDAD",
        comentario,
        extra: aprobar
            ? { fechaAprobacionContabilidad: ahora(), contabilidadId: usuario.uid, contabilidadNombre: usuario.name }
            : { fechaRechazo: ahora(), contabilidadId: usuario.uid, contabilidadNombre: usuario.name }
    });

    await notificar({
        usuarioIds: aprobar ? [peticion.solicitanteId] : [peticion.solicitanteId, peticion.autorizadorId],
        titulo: aprobar ? "Tu petición fue aprobada por contabilidad" : "Petición rechazada por contabilidad",
        mensaje: aprobar
            ? `Contabilidad aprobó la petición ${peticion.numero}. Queda programada para pago.`
            : `${usuario.name} (Contabilidad) rechazó la petición ${peticion.numero}. Motivo: ${comentario}`,
        peticion
    });

    return peticion;
};

// Fase 1: Contabilidad registra el pago adjuntando la captura/PDF del
// comprobante. Fase 2 (pendiente): un lector del buzón de comprobantes
// llamará a esta misma función con origen "CORREO".
export const registrarPago = async (id, usuario, { fechaPago, referencia, comentario, origen = "MANUAL" }, archivo) => {
    verificarContabilidad(usuario);
    if (!archivo) throw new ErrorHttp(400, "Adjunta el comprobante del pago (captura o PDF).");

    const comprobante = {
        id: crypto.randomUUID(),
        categoria: "COMPROBANTE",
        nombre: archivo.originalname,
        archivo: archivo.filename,
        tipo: archivo.mimetype,
        tamano: archivo.size,
        subidoPor: usuario.uid,
        subidoPorNombre: usuario.name,
        fecha: ahora()
    };

    const pago = {
        fechaPago,
        referencia: texto(referencia),
        comprobanteId: comprobante.id,
        origen,
        registradoPor: usuario.uid,
        registradoPorNombre: usuario.name,
        fechaRegistro: ahora()
    };

    let peticion;
    try {
        peticion = await transicionar(id, usuario, {
            desde: [ESTADOS.APROBADA_CONTABILIDAD],
            hacia: ESTADOS.PAGADA,
            accion: "PAGADA",
            comentario,
            extra: (p) => ({ pago, fechaPago, adjuntos: [...(p.adjuntos || []), comprobante] })
        });
    } catch (error) {
        // Si la transición no procede, el archivo subido no debe quedar huérfano.
        fs.rm(archivo.path, { force: true }, () => {});
        throw error;
    }

    await notificar({
        usuarioIds: [peticion.solicitanteId, peticion.autorizadorId],
        titulo: "Petición pagada",
        mensaje: `La petición ${peticion.numero} fue pagada el ${fechaPago}. El comprobante ya está disponible en la aplicación.`,
        peticion
    });

    return peticion;
};

// ---------------------------------------------------------------------------
// Adjuntos de soporte (proforma, cotización, factura)
// ---------------------------------------------------------------------------
export const agregarAdjuntos = async (id, usuario, archivos = []) => {
    const borrarArchivos = () => archivos.forEach((a) => fs.rm(a.path, { force: true }, () => {}));

    try {
        const peticion = await leerVisible(id, usuario);
        verificarEditable(peticion, usuario);

        if ((peticion.adjuntos || []).length + archivos.length > 15) {
            throw new ErrorHttp(400, "Una petición admite máximo 15 adjuntos.");
        }

        const nuevos = archivos.map((a) => ({
            id: crypto.randomUUID(),
            categoria: "SOPORTE",
            nombre: a.originalname,
            archivo: a.filename,
            tipo: a.mimetype,
            tamano: a.size,
            subidoPor: usuario.uid,
            subidoPorNombre: usuario.name,
            fecha: ahora()
        }));

        const adjuntos = [...(peticion.adjuntos || []), ...nuevos];
        await db.collection(COLECCION).doc(id).update({ adjuntos, fechaActualizacion: ahora() });
        return adjuntos;
    } catch (error) {
        borrarArchivos();
        throw error;
    }
};

export const eliminarAdjunto = async (id, adjuntoId, usuario) => {
    const peticion = await leerVisible(id, usuario);
    verificarEditable(peticion, usuario);

    const adjunto = (peticion.adjuntos || []).find((a) => a.id === adjuntoId);
    if (!adjunto || adjunto.categoria !== "SOPORTE") throw new ErrorHttp(404, "Adjunto no encontrado.");

    const adjuntos = peticion.adjuntos.filter((a) => a.id !== adjuntoId);
    await db.collection(COLECCION).doc(id).update({ adjuntos, fechaActualizacion: ahora() });
    fs.rm(path.join(UPLOADS_DIR, "peticiones", id, adjunto.archivo), { force: true }, () => {});
    return adjuntos;
};

export const obtenerArchivoAdjunto = async (id, adjuntoId, usuario) => {
    const peticion = await leerVisible(id, usuario);
    const adjunto = (peticion.adjuntos || []).find((a) => a.id === adjuntoId);
    if (!adjunto) throw new ErrorHttp(404, "Adjunto no encontrado.");

    const ruta = path.join(UPLOADS_DIR, "peticiones", id, path.basename(adjunto.archivo));
    if (!fs.existsSync(ruta)) throw new ErrorHttp(404, "El archivo ya no está disponible en el servidor.");

    return { ruta, adjunto };
};
