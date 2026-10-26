// Caja chica: el solicitante pide efectivo (máx. $50), su jefe lo aprueba,
// el cajero lo entrega con un token de 6 dígitos y luego se liquida.
//
// Módulo independiente: no lee ni modifica peticiones, planes, facturas ni
// la configuración de pagos. Solo lee el área (y su jefe de caja chica) y
// usa las notificaciones de la app.
//
// Paso 2: crear, listar, ver y anular. Paso 3: aprobar/rechazar (jefe) y
// token. Paso 4: el cajero busca por token y entrega o rechaza.
// Paso 5: liquidación con factura y cierre; límite de 3 personas por área
// con efectivo sin liquidar. Paso 6: aviso de atraso al jefe. Paso 7:
// cuadre diario (Excel en cajaChicaExcel.service.js).
import crypto from "crypto";
import db from "../config/firebase.js";
import { ROLES } from "../config/roles.js";
import path from "path";
import {
    TOPE_CAJA_CHICA, HORAS_TOKEN, DIAS_LIQUIDAR, MAX_PENDIENTES_POR_AREA, MAX_ARCHIVOS_LIQUIDACION,
    ESTADOS_CC, ESTADOS_ABIERTOS_CC, ESTADOS_ANULABLES_CC, ESTADOS_PENDIENTES_LIQUIDAR_CC
} from "../config/cajaChica.js";
import { CARPETA_CAJA_CHICA } from "../middlewares/uploadCajaChica.middleware.js";
import { obtenerUsuariosPorRol } from "./notificaciones.service.js";
import { obtenerPorId as obtenerCatalogo } from "./catalogos.service.js";
import { notificar } from "./notificaciones.service.js";
import { ErrorHttp } from "../utils/errores.js";

const COLECCION = "cajaChica";
const TOKENS = "cajaChicaTokens";

const ahora = () => new Date().toISOString();
const texto = (v) => (v === undefined || v === null ? "" : String(v).trim());
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const RUTA_SOLICITANTE = "/caja-chica/solicitudes";
const RUTA_JEFE = "/caja-chica/aprobaciones";
const RUTA_CAJERO_LIQ = "/caja-chica/liquidaciones";
const esAdmin = (u) => u.role === ROLES.ADMIN;

// El token solo lo ve quien pidió la caja chica (es quien lo presenta en
// caja). Al jefe y a los demás se les devuelve sin token.
const sinToken = (s) => {
    const { token, ...resto } = s;
    return { ...resto, tieneToken: Boolean(token) };
};
const paraUsuario = (s, usuario) => (s.solicitanteId === usuario.uid ? s : sinToken(s));

const entradaHistorial = (usuario, accion, comentario = "") => ({
    accion,
    comentario: texto(comentario),
    usuarioId: usuario.uid,
    usuarioNombre: usuario.name || usuario.email,
    usuarioRol: usuario.role,
    fecha: ahora()
});

// ---------------------------------------------------------------------------
// Reglas para crear
// ---------------------------------------------------------------------------

// Aprobadores de Finanzas: Autorizadores activos de las áreas marcadas
// "Aprueba la caja chica de los jefes" (Catálogos → Áreas, solo Admin).
// Aprueban cuando quien pide es el jefe de su propia área.
const aprobadoresFinanzas = async (excluirUid) => {
    const areas = await db.collection("areas").where("apruebaCajaChicaJefes", "==", true).get();
    const ids = areas.docs.map((d) => d.id);
    if (!ids.length) return [];
    const snap = await db.collection("usuarios").where("role", "==", ROLES.AUTORIZADOR).get();
    return snap.docs
        .map((d) => ({ uid: d.id, ...d.data() }))
        .filter((u) => u.activo !== false && ids.includes(u.areaId) && u.uid !== excluirUid)
        .map((u) => ({ uid: u.uid, nombre: u.name || u.email }));
};

// Quién aprueba una solicitud (solicitudes antiguas solo tienen jefeId).
const aprobadoresDe = (s) => (s.aprobadorIds?.length ? s.aprobadorIds : [s.jefeId].filter(Boolean));
const esAprobador = (s, uid) => aprobadoresDe(s).includes(uid);

// Área y aprobadores del usuario. Devuelve { area, aprobadores, porFinanzas,
// motivo } — motivo explica por qué no puede pedir caja chica (null si puede).
// Si el solicitante es el jefe de su propia área, aprueba Finanzas.
const areaYJefe = async (usuario) => {
    if (usuario.role === ROLES.CAJERO) return { area: null, motivo: "El Cajero no puede pedir caja chica." };
    if (!usuario.areaId) return { area: null, motivo: "No tienes un área asignada. Pide al Administrador que te la asigne en Usuarios." };

    const area = await obtenerCatalogo("areas", usuario.areaId);
    if (!area) return { area: null, motivo: "Tu área ya no existe en el catálogo. Contacta al Administrador." };
    if (!area.jefeCajaChicaId) {
        return { area, motivo: `El área ${area.nombre} aún no tiene jefe de caja chica. Pide al Administrador que lo asigne en Catálogos → Áreas.` };
    }
    if (area.jefeCajaChicaId === usuario.uid) {
        const finanzas = await aprobadoresFinanzas(usuario.uid);
        if (!finanzas.length) {
            return { area, motivo: `Eres el jefe de caja chica de ${area.nombre}: tu solicitud la aprueba Finanzas, pero aún no hay aprobadores de Finanzas configurados. Contacta al Administrador.` };
        }
        return { area, aprobadores: finanzas, porFinanzas: true, motivo: null };
    }
    return { area, aprobadores: [{ uid: area.jefeCajaChicaId, nombre: area.jefeCajaChicaNombre }], porFinanzas: false, motivo: null };
};

const solicitudesDe = async (uid) => {
    const snap = await db.collection(COLECCION).where("solicitanteId", "==", uid).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

const abiertaDe = (lista) => lista.find((s) => ESTADOS_ABIERTOS_CC.includes(s.estado)) || null;

const validar = (datos) => {
    const monto = r2(datos.monto);
    if (!Number.isFinite(monto) || monto <= 0) throw new ErrorHttp(400, "El monto debe ser mayor a 0.");
    if (monto > TOPE_CAJA_CHICA) throw new ErrorHttp(400, `El monto máximo de caja chica es $${TOPE_CAJA_CHICA.toFixed(2)}.`);
    if (Math.abs(Number(datos.monto) - monto) > 1e-9) throw new ErrorHttp(400, "El monto admite máximo 2 decimales.");

    const concepto = texto(datos.concepto);
    if (concepto.length < 3) throw new ErrorHttp(400, "Describe en qué se usará el efectivo (concepto).");
    if (concepto.length > 300) throw new ErrorHttp(400, "El concepto admite máximo 300 caracteres.");

    return { monto, concepto };
};

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

// GET /contexto: lo que necesita la pantalla del solicitante para saber si
// puede crear una solicitud y a quién le llegará.
export const contexto = async (usuario) => {
    const [{ area, aprobadores, porFinanzas, motivo }, lista] = await Promise.all([areaYJefe(usuario), solicitudesDe(usuario.uid)]);
    const abierta = abiertaDe(lista);
    return {
        tope: TOPE_CAJA_CHICA,
        areaNombre: area?.nombre || null,
        jefeNombre: aprobadores?.length ? aprobadores.map((a) => a.nombre).join(" / ") : area?.jefeCajaChicaNombre || null,
        porFinanzas: Boolean(porFinanzas),
        abierta: abierta ? { id: abierta.id, numero: abierta.numero, estado: abierta.estado } : null,
        puedeCrear: !motivo && !abierta,
        motivo: motivo || (abierta ? `Tienes la solicitud ${abierta.numero} abierta. Debes liquidarla antes de pedir otra.` : null)
    };
};

export const listarMias = async (usuario) =>
    (await solicitudesDe(usuario.uid)).sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion));

const leer = async (id) => {
    const doc = await db.collection(COLECCION).doc(id).get();
    if (!doc.exists) throw new ErrorHttp(404, "Solicitud de caja chica no encontrada.");
    return { id: doc.id, ...doc.data() };
};

// Ven el detalle: el solicitante, el jefe asignado y el Administrador.
// (El Cajero la verá por token en el paso 4.)
export const obtener = async (id, usuario) => {
    const s = await leer(id);
    const puedeVer = s.solicitanteId === usuario.uid || esAprobador(s, usuario.uid) || usuario.role === ROLES.ADMIN;
    if (!puedeVer) throw new ErrorHttp(403, "No tienes acceso a esta solicitud.");
    return paraUsuario(s, usuario);
};

// ---------------------------------------------------------------------------
// Crear
// ---------------------------------------------------------------------------

// Correlativo CC-AAAA-00001 + regla "una abierta por usuario", en una sola
// transacción: dos clics simultáneos no crean dos solicitudes.
export const crear = async (datos, usuario) => {
    const { monto, concepto } = validar(datos);
    const { area, aprobadores, porFinanzas, motivo } = await areaYJefe(usuario);
    if (motivo) throw new ErrorHttp(400, motivo);

    const anio = new Date().getFullYear();
    const contadorRef = db.collection("contadores").doc(`cajaChica-${anio}`);
    const ref = db.collection(COLECCION).doc();
    const mias = db.collection(COLECCION).where("solicitanteId", "==", usuario.uid);

    const solicitud = await db.runTransaction(async (t) => {
        const [contador, snap] = await Promise.all([t.get(contadorRef), t.get(mias)]);

        const abierta = abiertaDe(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        if (abierta) throw new ErrorHttp(409, `Tienes la solicitud ${abierta.numero} abierta. Debes liquidarla antes de pedir otra.`);

        const valor = (contador.exists ? contador.data().valor : 0) + 1;
        const nueva = {
            numero: `CC-${anio}-${String(valor).padStart(5, "0")}`,
            estado: ESTADOS_CC.PENDIENTE_APROBACION,
            solicitanteId: usuario.uid,
            solicitanteNombre: usuario.name || usuario.email,
            solicitanteRol: usuario.role,
            areaId: area.id,
            areaNombre: area.nombre,
            // Jefe del área, o los aprobadores de Finanzas si quien pide es el jefe.
            jefeId: porFinanzas ? null : area.jefeCajaChicaId,
            jefeNombre: aprobadores.map((a) => a.nombre).join(" / "),
            aprobadorIds: aprobadores.map((a) => a.uid),
            aprobacionFinanzas: porFinanzas,
            monto,
            concepto,
            fechaCreacion: ahora(),
            fechaActualizacion: ahora(),
            historial: [entradaHistorial(usuario, "CREADA")]
        };

        t.set(contadorRef, { valor, actualizado: ahora() });
        t.set(ref, nueva);
        return { id: ref.id, ...nueva };
    });

    // Aviso en la app al jefe (la pantalla de aprobación llega en el paso 3).
    await notificar({
        usuarioIds: aprobadoresDe(solicitud),
        titulo: solicitud.aprobacionFinanzas ? "Caja chica de jefe de área por aprobar" : "Nueva solicitud de caja chica",
        mensaje: `${solicitud.solicitanteNombre} pide $${monto.toFixed(2)} de caja chica (${solicitud.numero}): ${concepto}`,
        enlace: RUTA_JEFE,
        enviarEmail: false
    });

    return solicitud;
};

// ---------------------------------------------------------------------------
// Anular (solo el solicitante, antes de recibir el efectivo)
// ---------------------------------------------------------------------------
export const anular = async (id, motivo, usuario) => {
    const ref = db.collection(COLECCION).doc(id);

    const anulada = await db.runTransaction(async (t) => {
        const doc = await t.get(ref);
        if (!doc.exists) throw new ErrorHttp(404, "Solicitud de caja chica no encontrada.");
        const s = doc.data();

        if (s.solicitanteId !== usuario.uid) throw new ErrorHttp(403, "Solo quien pidió la caja chica puede anularla.");
        if (!ESTADOS_ANULABLES_CC.includes(s.estado)) throw new ErrorHttp(409, "Esta solicitud ya no se puede anular.");

        const cambios = {
            estado: ESTADOS_CC.ANULADA,
            fechaActualizacion: ahora(),
            historial: [...(s.historial || []), entradaHistorial(usuario, "ANULADA", motivo)]
        };
        // Si ya tenía token (paso 3), se libera para que nadie lo cobre.
        if (s.token) {
            t.delete(db.collection(TOKENS).doc(s.token));
            cambios.token = null;
        }
        t.update(ref, cambios);
        return { id, ...s, ...cambios };
    });

    await notificar({
        usuarioIds: aprobadoresDe(anulada),
        titulo: "Caja chica anulada",
        mensaje: `${anulada.solicitanteNombre} anuló la solicitud ${anulada.numero}.`,
        enlace: RUTA_JEFE,
        enviarEmail: false
    });

    return anulada;
};

// ---------------------------------------------------------------------------
// Token de 6 dígitos
// ---------------------------------------------------------------------------
const formatoToken = (tk) => `${tk.slice(0, 3)} ${tk.slice(3)}`;
const fechaHoraSV = (iso) => new Date(iso).toLocaleString("es-SV", { timeZone: "America/El_Salvador", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

// Dentro de una transacción: elige un token libre (o uno vencido, que se
// puede reutilizar) y lo reserva en cajaChicaTokens/{token}. Solo lee; las
// escrituras las hace quien lo llama, después de todas las lecturas.
const elegirToken = async (t) => {
    for (let intento = 0; intento < 15; intento++) {
        const token = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
        const ref = db.collection(TOKENS).doc(token);
        const doc = await t.get(ref);
        if (!doc.exists || doc.data().expira < ahora()) return { token, ref };
    }
    throw new ErrorHttp(503, "No se pudo generar un token. Inténtalo de nuevo.");
};

const vence = () => new Date(Date.now() + HORAS_TOKEN * 3600 * 1000).toISOString();

// ---------------------------------------------------------------------------
// Jefe: aprobaciones
// ---------------------------------------------------------------------------

// ¿Aprueba caja chica? Jefe de al menos un área, o Autorizador de un área
// de Finanzas (aprueba a los jefes). Se usa para mostrarle el menú.
export const esJefeCajaChica = async (usuario) => {
    if (usuario.role !== ROLES.AUTORIZADOR) return false;
    const snap = await db.collection("areas").where("jefeCajaChicaId", "==", usuario.uid).limit(1).get();
    if (!snap.empty) return true;
    if (!usuario.areaId) return false;
    const area = await obtenerCatalogo("areas", usuario.areaId);
    return area?.apruebaCajaChicaJefes === true;
};

// GET /aprobaciones: solicitudes de las áreas del jefe (Admin: todas). Sin token.
export const aprobaciones = async (usuario) => {
    if (![ROLES.AUTORIZADOR, ROLES.ADMIN].includes(usuario.role)) throw new ErrorHttp(403, "Solo los jefes de área aprueban caja chica.");
    let docs;
    if (esAdmin(usuario)) {
        docs = (await db.collection(COLECCION).get()).docs;
    } else {
        // Como jefe de área (jefeId) o como aprobador de Finanzas (aprobadorIds).
        const [comoJefe, comoAprobador] = await Promise.all([
            db.collection(COLECCION).where("jefeId", "==", usuario.uid).get(),
            db.collection(COLECCION).where("aprobadorIds", "array-contains", usuario.uid).get()
        ]);
        const unicos = new Map();
        [...comoJefe.docs, ...comoAprobador.docs].forEach((d) => unicos.set(d.id, d));
        docs = [...unicos.values()];
    }
    return docs
        .map((d) => sinToken({ id: d.id, ...d.data() }))
        .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion));
};

const verificarJefe = (s, usuario) => {
    if (!esAprobador(s, usuario.uid) && !esAdmin(usuario)) throw new ErrorHttp(403, "Solo el jefe del área (o Finanzas, si pide un jefe) puede decidir esta solicitud.");
    if (s.solicitanteId === usuario.uid) throw new ErrorHttp(403, "No puedes aprobar tu propia solicitud.");
    if (s.estado !== ESTADOS_CC.PENDIENTE_APROBACION) throw new ErrorHttp(409, "Esta solicitud ya no está pendiente de aprobación.");
};

// POST /:id/aprobar → APROBADA + token de 6 dígitos (vence en 48 h)
export const aprobar = async (id, comentario, usuario) => {
    const ref = db.collection(COLECCION).doc(id);

    const aprobada = await db.runTransaction(async (t) => {
        const doc = await t.get(ref);
        if (!doc.exists) throw new ErrorHttp(404, "Solicitud de caja chica no encontrada.");
        const s = doc.data();
        verificarJefe(s, usuario);

        const { token, ref: tokenRef } = await elegirToken(t);
        const tokenExpira = vence();
        const cambios = {
            estado: ESTADOS_CC.APROBADA,
            token,
            tokenExpira,
            tokensGenerados: 1,
            aprobadoPorId: usuario.uid,
            aprobadoPorNombre: usuario.name || usuario.email,
            fechaAprobacion: ahora(),
            fechaActualizacion: ahora(),
            historial: [...(s.historial || []), entradaHistorial(usuario, "APROBADA", comentario)]
        };
        t.set(tokenRef, { solicitudId: id, expira: tokenExpira, creado: ahora() });
        t.update(ref, cambios);
        return { id, ...s, ...cambios };
    });

    await notificar({
        usuarioIds: [aprobada.solicitanteId],
        titulo: "Caja chica aprobada",
        mensaje: `${aprobada.aprobadoPorNombre} aprobó tu solicitud ${aprobada.numero} por $${aprobada.monto.toFixed(2)}. Tu token para cobrar en caja es ${formatoToken(aprobada.token)} (vence: ${fechaHoraSV(aprobada.tokenExpira)})`,
        enlace: RUTA_SOLICITANTE
    });

    return sinToken(aprobada);
};

// POST /:id/rechazar { motivo } → RECHAZADA (puede pedir otra)
export const rechazar = async (id, motivo, usuario) => {
    if (texto(motivo).length < 3) throw new ErrorHttp(400, "Indica el motivo del rechazo.");
    const ref = db.collection(COLECCION).doc(id);

    const rechazada = await db.runTransaction(async (t) => {
        const doc = await t.get(ref);
        if (!doc.exists) throw new ErrorHttp(404, "Solicitud de caja chica no encontrada.");
        const s = doc.data();
        verificarJefe(s, usuario);

        const cambios = {
            estado: ESTADOS_CC.RECHAZADA,
            motivoRechazo: texto(motivo),
            rechazadoPorNombre: usuario.name || usuario.email,
            fechaActualizacion: ahora(),
            historial: [...(s.historial || []), entradaHistorial(usuario, "RECHAZADA", motivo)]
        };
        t.update(ref, cambios);
        return { id, ...s, ...cambios };
    });

    await notificar({
        usuarioIds: [rechazada.solicitanteId],
        titulo: "Caja chica rechazada",
        mensaje: `${rechazada.rechazadoPorNombre} rechazó tu solicitud ${rechazada.numero}. Motivo: ${rechazada.motivoRechazo}`,
        enlace: RUTA_SOLICITANTE
    });

    return rechazada;
};

// ---------------------------------------------------------------------------
// Solicitante: regenerar token vencido (sin volver a aprobar)
// ---------------------------------------------------------------------------
export const regenerarToken = async (id, usuario) => {
    const ref = db.collection(COLECCION).doc(id);

    return db.runTransaction(async (t) => {
        const doc = await t.get(ref);
        if (!doc.exists) throw new ErrorHttp(404, "Solicitud de caja chica no encontrada.");
        const s = doc.data();

        if (s.solicitanteId !== usuario.uid) throw new ErrorHttp(403, "Solo quien pidió la caja chica puede generar un token nuevo.");
        if (s.estado !== ESTADOS_CC.APROBADA) throw new ErrorHttp(409, "Solo se genera un token nuevo para solicitudes aprobadas que aún no se cobran.");
        if (s.tokenExpira && s.tokenExpira > ahora()) throw new ErrorHttp(409, "Tu token aún está vigente.");

        const { token, ref: tokenRef } = await elegirToken(t);
        const tokenExpira = vence();
        const cambios = {
            token,
            tokenExpira,
            tokensGenerados: (s.tokensGenerados || 1) + 1,
            fechaActualizacion: ahora(),
            historial: [...(s.historial || []), entradaHistorial(usuario, "TOKEN_REGENERADO")]
        };
        if (s.token && s.token !== token) t.delete(db.collection(TOKENS).doc(s.token));
        t.set(tokenRef, { solicitudId: id, expira: tokenExpira, creado: ahora() });
        t.update(ref, cambios);
        return { id, ...s, ...cambios };
    });
};

// ---------------------------------------------------------------------------
// Cajero: buscar por token, entregar o rechazar en caja
// ---------------------------------------------------------------------------
const esCajero = (u) => [ROLES.CAJERO, ROLES.ADMIN].includes(u.role);
const verificarCajero = (u) => {
    if (!esCajero(u)) throw new ErrorHttp(403, "Solo el Cajero puede registrar entregas de caja chica.");
};

// ¿Autorizador de un área de Finanzas (aprueba la caja chica de los jefes)?
export const esFinanzasCajaChica = async (u) => {
    if (u.role !== ROLES.AUTORIZADOR || !u.areaId) return false;
    const area = await obtenerCatalogo("areas", u.areaId);
    return area?.apruebaCajaChicaJefes === true;
};

// Lectura del cuadre, fondo y cortes: Cajero, Admin y Finanzas (solo lectura).
const verificarLecturaCaja = async (u) => {
    if (esCajero(u) || (await esFinanzasCajaChica(u))) return;
    throw new ErrorHttp(403, "No tienes acceso al cuadre de caja chica.");
};

// Límite de intentos fallidos: 5 por minuto por cajero, para que nadie
// pueda adivinar tokens probando números. En memoria del servidor.
const MAX_FALLOS = 5;
const VENTANA_MS = 60 * 1000;
const fallos = new Map(); // uid → [timestamps]

const fallosRecientes = (uid) => (fallos.get(uid) || []).filter((ts) => Date.now() - ts < VENTANA_MS);
const verificarIntentos = (uid) => {
    const lista = fallosRecientes(uid);
    fallos.set(uid, lista);
    if (lista.length >= MAX_FALLOS) {
        const espera = Math.ceil((VENTANA_MS - (Date.now() - lista[0])) / 1000);
        throw new ErrorHttp(429, `Demasiados intentos con tokens incorrectos. Espera ${espera} segundos.`);
    }
};
const registrarFallo = (uid) => fallos.set(uid, [...fallosRecientes(uid), Date.now()]);

const limpiarToken = (v) => texto(v).replace(/\s/g, "");

// Valida token + solicitud (dentro o fuera de transacción). Devuelve la
// solicitud o lanza el error que corresponde.
const validarTokenYSolicitud = (token, tokenDoc, solDoc) => {
    if (!tokenDoc.exists) throw new ErrorHttp(404, "Token no válido. Verifica los 6 dígitos con el solicitante.");
    if (tokenDoc.data().expira < ahora()) {
        throw new ErrorHttp(410, "Este token venció. El solicitante debe generar uno nuevo desde \"Mis solicitudes\".");
    }
    if (!solDoc || !solDoc.exists) throw new ErrorHttp(404, "Token no válido. Verifica los 6 dígitos con el solicitante.");
    const s = { id: solDoc.id, ...solDoc.data() };
    if (s.estado !== ESTADOS_CC.APROBADA || s.token !== token) {
        throw new ErrorHttp(409, "Esta solicitud ya no está disponible para entrega.");
    }
    return s;
};

// POST /entregas/buscar { token } → solicitud (sin token) lista para entregar
export const buscarPorToken = async (tokenRecibido, usuario) => {
    verificarCajero(usuario);
    verificarIntentos(usuario.uid);

    const token = limpiarToken(tokenRecibido);
    if (!/^\d{6}$/.test(token)) throw new ErrorHttp(400, "El token tiene 6 dígitos.");

    try {
        const tokenDoc = await db.collection(TOKENS).doc(token).get();
        const solDoc = tokenDoc.exists ? await db.collection(COLECCION).doc(tokenDoc.data().solicitudId).get() : null;
        const s = validarTokenYSolicitud(token, tokenDoc, solDoc);
        // Aviso para el cajero antes de entregar (política de 3 por área).
        const fondo = await obtenerFondo(usuario);
        return { ...sinToken(s), bloqueoArea: await bloqueoPorArea(s.areaId, s.id), fondoDisponible: fondo.disponible, fondoAsignado: fondo.montoFondo };
    } catch (error) {
        if (error.status === 404) registrarFallo(usuario.uid);
        throw error;
    }
};

// Política: máximo 3 personas por área con efectivo entregado sin liquidar.
// Devuelve null si se puede entregar, o { pendientes: [...] } si no.
const pendientesDeArea = (docs, idActual) =>
    docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((s) => s.id !== idActual && ESTADOS_PENDIENTES_LIQUIDAR_CC.includes(s.estado));

const resumenBloqueo = (pendientes) =>
    pendientes.length >= MAX_PENDIENTES_POR_AREA
        ? {
              maximo: MAX_PENDIENTES_POR_AREA,
              pendientes: pendientes.map((s) => ({ numero: s.numero, solicitanteNombre: s.solicitanteNombre, monto: s.monto, fechaEntrega: s.fechaEntrega }))
          }
        : null;

const bloqueoPorArea = async (areaId, idActual) => {
    const snap = await db.collection(COLECCION).where("areaId", "==", areaId).get();
    return resumenBloqueo(pendientesDeArea(snap.docs, idActual));
};

const mensajeBloqueo = (s, bloqueo) =>
    `Política de caja: el área ${s.areaNombre} ya tiene ${bloqueo.pendientes.length} personas con efectivo sin liquidar ` +
    `(${bloqueo.pendientes.map((p) => p.solicitanteNombre).join(", ")}). No se puede entregar hasta que una de ellas liquide.`;

// Entregar o rechazar en caja: exige el token otra vez, así no se puede
// registrar una entrega solo con el id de la solicitud.
const decidirEnCaja = async (id, tokenRecibido, usuario, decidir, { validarArea = false } = {}) => {
    verificarCajero(usuario);
    const token = limpiarToken(tokenRecibido);
    if (!/^\d{6}$/.test(token)) throw new ErrorHttp(400, "El token tiene 6 dígitos.");

    const ref = db.collection(COLECCION).doc(id);
    const tokenRef = db.collection(TOKENS).doc(token);

    return db.runTransaction(async (t) => {
        const [solDoc, tokenDoc] = await Promise.all([t.get(ref), t.get(tokenRef)]);
        const s = validarTokenYSolicitud(token, tokenDoc, solDoc);
        if (tokenDoc.data().solicitudId !== id) throw new ErrorHttp(409, "El token no corresponde a esta solicitud.");

        // Se revisa dentro de la transacción: dos entregas simultáneas del
        // mismo área no pueden pasar el límite.
        if (validarArea) {
            const area = await t.get(db.collection(COLECCION).where("areaId", "==", s.areaId));
            const bloqueo = resumenBloqueo(pendientesDeArea(area.docs, id));
            if (bloqueo) throw new ErrorHttp(409, mensajeBloqueo(s, bloqueo));
        }

        const cambios = { ...decidir(s), token: null, fechaActualizacion: ahora() };
        t.delete(tokenRef); // un solo uso
        t.update(ref, cambios);
        return { ...s, ...cambios };
    });
};

// POST /:id/entregar { token } → ENTREGADA; debe liquidar en 3 días
export const entregar = async (id, token, usuario) => {
    verificarCajero(usuario);
    const previa = await leer(id).catch(() => null);
    await verificarCajaAbierta(previa?.monto || 0);
    const entregada = await decidirEnCaja(id, token, usuario, (s) => ({
        estado: ESTADOS_CC.ENTREGADA,
        entregadoPorId: usuario.uid,
        entregadoPorNombre: usuario.name || usuario.email,
        fechaEntrega: ahora(),
        liquidarAntes: new Date(Date.now() + DIAS_LIQUIDAR * 24 * 3600 * 1000).toISOString(),
        historial: [...(s.historial || []), entradaHistorial(usuario, "ENTREGADA")]
    }), { validarArea: true });

    await notificar({
        usuarioIds: [entregada.solicitanteId],
        titulo: "Recibiste tu caja chica",
        mensaje: `Se registró la entrega de $${entregada.monto.toFixed(2)} (${entregada.numero}). Liquida con tu factura a más tardar: ${fechaHoraSV(entregada.liquidarAntes)}`,
        enlace: RUTA_SOLICITANTE
    });

    return sinToken(entregada);
};

// POST /:id/rechazar-caja { token, motivo } → RECHAZADA_CAJA (puede pedir otra)
export const rechazarEnCaja = async (id, token, motivo, usuario) => {
    if (texto(motivo).length < 3) throw new ErrorHttp(400, "Indica el motivo del rechazo.");
    const rechazada = await decidirEnCaja(id, token, usuario, (s) => ({
        estado: ESTADOS_CC.RECHAZADA_CAJA,
        motivoRechazo: texto(motivo),
        rechazadoPorNombre: usuario.name || usuario.email,
        fechaRechazoCaja: ahora(),
        historial: [...(s.historial || []), entradaHistorial(usuario, "RECHAZADA_CAJA", motivo)]
    }));

    await notificar({
        usuarioIds: [rechazada.solicitanteId, ...aprobadoresDe(rechazada)],
        titulo: "Caja chica rechazada en caja",
        mensaje: `${rechazada.rechazadoPorNombre} (Caja) no entregó la solicitud ${rechazada.numero} de ${rechazada.solicitanteNombre}. Motivo: ${rechazada.motivoRechazo}`,
        enlace: RUTA_SOLICITANTE
    });

    return sinToken(rechazada);
};

// GET /entregas?dia=AAAA-MM-DD (hoy por defecto, hora de El Salvador):
// entregas y rechazos en caja del día, para la pantalla del cajero.
const diaSV = (iso) => (iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/El_Salvador" }) : "");
export const movimientosDelDia = async (dia, usuario) => {
    verificarCajero(usuario);
    const d = /^\d{4}-\d{2}-\d{2}$/.test(dia || "") ? dia : diaSV(ahora());
    const snap = await db.collection(COLECCION).get();
    return snap.docs
        .map((x) => sinToken({ id: x.id, ...x.data() }))
        .filter((s) => diaSV(s.fechaEntrega) === d || diaSV(s.fechaRechazoCaja) === d)
        .sort((a, b) => (b.fechaEntrega || b.fechaRechazoCaja).localeCompare(a.fechaEntrega || a.fechaRechazoCaja));
};

// ---------------------------------------------------------------------------
// Liquidación
// ---------------------------------------------------------------------------

// Cálculo del cierre (ver diseño): caja chica reconoce máximo $50.
export const calcularCierre = (entregado, gastado) => {
    const reconocido = r2(Math.min(gastado, TOPE_CAJA_CHICA));
    const diferencia = r2(reconocido - entregado); // < 0 vuelto, > 0 reintegro
    return {
        montoGastado: r2(gastado),
        montoReconocido: reconocido,
        diferencia,
        excedenteNoReconocido: r2(Math.max(gastado - TOPE_CAJA_CHICA, 0)),
        tipoCierre: diferencia < 0 ? "VUELTO" : diferencia > 0 ? "REINTEGRO" : "EXACTO"
    };
};

const ESTADOS_PARA_LIQUIDAR = [ESTADOS_CC.ENTREGADA, ESTADOS_CC.LIQUIDACION_DEVUELTA];

// POST /:id/liquidacion (multipart: archivos[], numeroFactura, montoGastado, comentario)
// El solicitante sube su(s) factura(s). Si la liquidación fue devuelta, la
// nueva reemplaza los archivos anteriores.
export const enviarLiquidacion = async (id, datos, archivos, usuario) => {
    if (!archivos?.length) throw new ErrorHttp(400, "Adjunta la foto o el PDF de tu factura.");
    if (archivos.length > MAX_ARCHIVOS_LIQUIDACION) throw new ErrorHttp(400, `Máximo ${MAX_ARCHIVOS_LIQUIDACION} archivos.`);

    const numeroFactura = texto(datos.numeroFactura);
    if (numeroFactura.length < 1) throw new ErrorHttp(400, "Indica el número de factura (o de las facturas).");
    if (numeroFactura.length > 120) throw new ErrorHttp(400, "El número de factura admite máximo 120 caracteres.");

    const gastado = r2(datos.montoGastado);
    if (!Number.isFinite(gastado) || gastado <= 0) throw new ErrorHttp(400, "El monto gastado debe ser mayor a 0.");
    if (gastado > 10000) throw new ErrorHttp(400, "El monto gastado no es válido.");

    const ref = db.collection(COLECCION).doc(id);
    const enviada = await db.runTransaction(async (t) => {
        const doc = await t.get(ref);
        if (!doc.exists) throw new ErrorHttp(404, "Solicitud de caja chica no encontrada.");
        const s = doc.data();
        if (s.solicitanteId !== usuario.uid) throw new ErrorHttp(403, "Solo quien recibió el efectivo puede liquidarlo.");
        if (!ESTADOS_PARA_LIQUIDAR.includes(s.estado)) throw new ErrorHttp(409, "Esta solicitud no está pendiente de liquidar.");

        const cambios = {
            estado: ESTADOS_CC.LIQUIDACION_ENVIADA,
            liquidacion: {
                numeroFactura,
                comentario: texto(datos.comentario).slice(0, 300),
                archivos: archivos.map((a) => ({
                    id: path.parse(a.filename).name,
                    nombre: a.originalname,
                    archivo: a.filename,
                    tipo: a.mimetype,
                    tamano: a.size
                })),
                ...calcularCierre(s.monto, gastado),
                fechaEnvio: ahora()
            },
            fechaActualizacion: ahora(),
            historial: [...(s.historial || []), entradaHistorial(usuario, "LIQUIDACION_ENVIADA", `Factura ${numeroFactura} · gastado $${gastado.toFixed(2)}`)]
        };
        t.update(ref, cambios);
        return { id, ...s, ...cambios };
    });

    const cajeros = await obtenerUsuariosPorRol(ROLES.CAJERO);
    await notificar({
        usuarioIds: cajeros.map((c) => c.uid),
        titulo: "Liquidación de caja chica por revisar",
        mensaje: `${enviada.solicitanteNombre} liquidó ${enviada.numero}: gastó $${gastado.toFixed(2)} de $${enviada.monto.toFixed(2)}.`,
        enlace: RUTA_CAJERO_LIQ,
        enviarEmail: false
    });

    return sinToken(enviada);
};

const ETIQUETA_CIERRE = (l) =>
    l.tipoCierre === "VUELTO"
        ? `devolvió $${Math.abs(l.diferencia).toFixed(2)} de vuelto`
        : l.tipoCierre === "REINTEGRO"
          ? `recibió $${l.diferencia.toFixed(2)} de reintegro`
          : "liquidó el monto exacto";

// POST /:id/liquidacion/cerrar → LIQUIDADA (vuelto recibido o reintegro entregado)
export const cerrarLiquidacion = async (id, comentario, usuario) => {
    verificarCajero(usuario);
    const previa = await leer(id);
    await verificarCajaAbierta(previa.liquidacion?.tipoCierre === "REINTEGRO" ? previa.liquidacion.diferencia : 0);
    const ref = db.collection(COLECCION).doc(id);
    const cerrada = await db.runTransaction(async (t) => {
        const doc = await t.get(ref);
        if (!doc.exists) throw new ErrorHttp(404, "Solicitud de caja chica no encontrada.");
        const s = doc.data();
        if (s.estado !== ESTADOS_CC.LIQUIDACION_ENVIADA) throw new ErrorHttp(409, "Esta liquidación no está pendiente de revisión.");

        const cambios = {
            estado: ESTADOS_CC.LIQUIDADA,
            liquidacion: { ...s.liquidacion, cerradaPorId: usuario.uid, cerradaPorNombre: usuario.name || usuario.email, fechaCierre: ahora() },
            fechaActualizacion: ahora(),
            historial: [...(s.historial || []), entradaHistorial(usuario, "LIQUIDADA", comentario)]
        };
        t.update(ref, cambios);
        return { id, ...s, ...cambios };
    });

    const l = cerrada.liquidacion;
    await notificar({
        usuarioIds: [cerrada.solicitanteId],
        titulo: "Caja chica liquidada",
        mensaje: `Se cerró la liquidación de ${cerrada.numero}: ${ETIQUETA_CIERRE(l)}.` +
            (l.excedenteNoReconocido > 0 ? ` $${l.excedenteNoReconocido.toFixed(2)} superan el tope de $${TOPE_CAJA_CHICA} y no se reintegran.` : "") +
            " Ya puedes pedir caja chica de nuevo.",
        enlace: RUTA_SOLICITANTE
    });

    return cerrada;
};

// POST /:id/liquidacion/devolver { motivo } → LIQUIDACION_DEVUELTA
export const devolverLiquidacion = async (id, motivo, usuario) => {
    verificarCajero(usuario);
    if (texto(motivo).length < 3) throw new ErrorHttp(400, "Indica qué debe corregir el solicitante.");
    const ref = db.collection(COLECCION).doc(id);
    const devuelta = await db.runTransaction(async (t) => {
        const doc = await t.get(ref);
        if (!doc.exists) throw new ErrorHttp(404, "Solicitud de caja chica no encontrada.");
        const s = doc.data();
        if (s.estado !== ESTADOS_CC.LIQUIDACION_ENVIADA) throw new ErrorHttp(409, "Esta liquidación no está pendiente de revisión.");
        const cambios = {
            estado: ESTADOS_CC.LIQUIDACION_DEVUELTA,
            liquidacion: { ...s.liquidacion, motivoDevolucion: texto(motivo), devueltaPorNombre: usuario.name || usuario.email },
            fechaActualizacion: ahora(),
            historial: [...(s.historial || []), entradaHistorial(usuario, "LIQUIDACION_DEVUELTA", motivo)]
        };
        t.update(ref, cambios);
        return { id, ...s, ...cambios };
    });

    await notificar({
        usuarioIds: [devuelta.solicitanteId],
        titulo: "Liquidación devuelta",
        mensaje: `Caja devolvió la liquidación de ${devuelta.numero}. Corrige y vuelve a enviarla. Motivo: ${texto(motivo)}`,
        enlace: RUTA_SOLICITANTE
    });

    return devuelta;
};

// GET /liquidaciones (Cajero/Admin): por revisar y pendientes de liquidar
// (con marca de atraso), más el conteo por área para la política de 3.
export const liquidaciones = async (usuario) => {
    verificarCajero(usuario);
    const snap = await db.collection(COLECCION).get();
    const todas = snap.docs.map((d) => sinToken({ id: d.id, ...d.data() }));
    const conAtraso = (s) => ({ ...s, atrasada: Boolean(s.liquidarAntes && s.liquidarAntes < ahora()) });

    const pendientes = todas.filter((s) => ESTADOS_PENDIENTES_LIQUIDAR_CC.includes(s.estado));
    const porArea = {};
    pendientes.forEach((s) => {
        porArea[s.areaNombre] = (porArea[s.areaNombre] || 0) + 1;
    });

    return {
        porRevisar: todas.filter((s) => s.estado === ESTADOS_CC.LIQUIDACION_ENVIADA).map(conAtraso)
            .sort((a, b) => a.liquidacion.fechaEnvio.localeCompare(b.liquidacion.fechaEnvio)),
        pendientes: pendientes.filter((s) => s.estado !== ESTADOS_CC.LIQUIDACION_ENVIADA).map(conAtraso)
            .sort((a, b) => a.liquidarAntes.localeCompare(b.liquidarAntes)),
        porArea: Object.entries(porArea).map(([area, n]) => ({ area, pendientes: n, bloqueada: n >= MAX_PENDIENTES_POR_AREA })),
        maximoPorArea: MAX_PENDIENTES_POR_AREA
    };
};

// GET /:id/archivos/:archivoId → ruta del archivo (solicitante, jefe, cajero, admin)
export const archivoLiquidacion = async (id, archivoId, usuario) => {
    const s = await leer(id);
    const puede = s.solicitanteId === usuario.uid || esAprobador(s, usuario.uid) || esCajero(usuario);
    if (!puede) throw new ErrorHttp(403, "No tienes acceso a este archivo.");
    const archivo = (s.liquidacion?.archivos || []).find((a) => a.id === archivoId);
    if (!archivo) throw new ErrorHttp(404, "Archivo no encontrado.");
    return { ruta: path.join(CARPETA_CAJA_CHICA, id, archivo.archivo), archivo };
};

// ---------------------------------------------------------------------------
// Paso 6: aviso de liquidación atrasada (una sola vez por solicitud)
// ---------------------------------------------------------------------------

// Busca entregas cuyo plazo de 3 días ya venció y que aún no se avisaron:
// avisa al jefe (app + correo) y al solicitante (app). Se ejecuta al
// arrancar el servidor y cada 30 minutos (ver server.js).
export const revisarAtrasos = async () => {
    const snap = await db.collection(COLECCION)
        .where("estado", "in", [ESTADOS_CC.ENTREGADA, ESTADOS_CC.LIQUIDACION_DEVUELTA])
        .get();
    const atrasadas = snap.docs
        .map((d) => ({ id: d.id, ref: d.ref, ...d.data() }))
        .filter((s) => s.liquidarAntes && s.liquidarAntes < ahora() && !s.avisoAtrasoEnviado);

    for (const s of atrasadas) {
        // Se marca primero: si el aviso falla, no se repite en cada vuelta.
        await s.ref.update({ avisoAtrasoEnviado: true, fechaAvisoAtraso: ahora() });
        await notificar({
            usuarioIds: aprobadoresDe(s),
            titulo: "Caja chica sin liquidar",
            mensaje: `${s.solicitanteNombre} (${s.areaNombre}) no ha liquidado ${s.numero} por $${s.monto.toFixed(2)}. El plazo venció el ${fechaHoraSV(s.liquidarAntes)}.`,
            enlace: RUTA_JEFE
        });
        await notificar({
            usuarioIds: [s.solicitanteId],
            titulo: "Tu liquidación de caja chica está atrasada",
            mensaje: `El plazo para liquidar ${s.numero} venció el ${fechaHoraSV(s.liquidarAntes)}. Sube tu factura lo antes posible; se avisó a tu jefe.`,
            enlace: RUTA_SOLICITANTE,
            enviarEmail: false
        });
    }
    return atrasadas.length;
};

let temporizadorAtrasos = null;
export const iniciarRevisionAtrasos = (cadaMinutos = 30) => {
    if (temporizadorAtrasos) return;
    const correr = () =>
        Promise.all([revisarAtrasos(), revisarCortesPendientes()])
            .then(([n, c]) => {
                if (n) console.log(`[caja chica] Avisos de atraso enviados: ${n}`);
                if (c) console.log(`[caja chica] Avisos de corte pendiente: ${c}`);
            })
            .catch((e) => console.error("[caja chica] Error en la revisión periódica:", e.message));
    correr();
    temporizadorAtrasos = setInterval(correr, cadaMinutos * 60 * 1000);
};

// ---------------------------------------------------------------------------
// Paso 7: cuadre diario de caja
// ---------------------------------------------------------------------------

// Todos los movimientos de efectivo de caja chica (sin filtrar por día):
//   ENTREGA            → sale efectivo (monto entregado)
//   REINTEGRO          → sale efectivo (diferencia entregada al cerrar)
//   VUELTO             → entra efectivo (vuelto recibido al cerrar)
//   EXACTO             → cierre sin movimiento (se lista para control)
const todosLosMovimientos = (docs) => {
    const movimientos = [];
    docs.forEach((doc) => {
        const s = { id: doc.id, ...doc.data() };
        const base = { solicitudId: s.id, numero: s.numero, solicitanteNombre: s.solicitanteNombre, areaNombre: s.areaNombre, concepto: s.concepto };
        if (s.fechaEntrega) {
            movimientos.push({ ...base, fecha: s.fechaEntrega, tipo: "ENTREGA", salida: s.monto, entrada: 0, cajeroNombre: s.entregadoPorNombre });
        }
        const l = s.liquidacion;
        if (s.estado === ESTADOS_CC.LIQUIDADA && l?.fechaCierre) {
            movimientos.push({
                ...base,
                fecha: l.fechaCierre,
                tipo: l.tipoCierre,
                salida: l.tipoCierre === "REINTEGRO" ? l.diferencia : 0,
                entrada: l.tipoCierre === "VUELTO" ? Math.abs(l.diferencia) : 0,
                cajeroNombre: l.cerradaPorNombre,
                numeroFactura: l.numeroFactura,
                montoGastado: l.montoGastado,
                excedenteNoReconocido: l.excedenteNoReconocido || 0
            });
        }
    });
    return movimientos.sort((a, b) => a.fecha.localeCompare(b.fecha));
};

// Salida neta (salidas − entradas) de los movimientos con fecha en [desde, hasta).
const netoEntre = (movimientos, desde, hasta) =>
    r2(movimientos.filter((m) => m.fecha >= (desde || "") && m.fecha < hasta).reduce((a, m) => a + Number(m.salida || 0) - Number(m.entrada || 0), 0));

// Límites del día en hora de El Salvador (UTC-6, sin horario de verano).
const inicioDiaSV = (d) => `${d}T06:00:00.000Z`;
const finDiaSV = (d) => new Date(Date.parse(inicioDiaSV(d)) + 24 * 3600 * 1000).toISOString();

// ---------------------------------------------------------------------------
// Fondo de caja chica (lo asigna el Administrador) y saldo disponible
// ---------------------------------------------------------------------------
// configuracion/cajaChicaFondo: { montoFondo, desde, historial[] }
//   desde = inicio del ciclo (cuando se asignó el fondo o se repuso). El
//   disponible es el fondo menos la salida neta desde ese momento.
const FONDO = () => db.collection("configuracion").doc("cajaChicaFondo");
const CORTES = "cajaChicaCortes";

const leerFondo = async () => {
    const doc = await FONDO().get();
    return doc.exists ? doc.data() : { montoFondo: 0, desde: null, historial: [] };
};

const estadoFondoCon = (fondo, movimientos, hasta = ahora()) => {
    const usado = netoEntre(movimientos, fondo.desde, hasta);
    return { montoFondo: r2(fondo.montoFondo || 0), desde: fondo.desde || null, usado, disponible: r2((fondo.montoFondo || 0) - usado) };
};

// GET /fondo
export const obtenerFondo = async (usuario) => {
    await verificarLecturaCaja(usuario);
    const [fondo, snap] = await Promise.all([leerFondo(), db.collection(COLECCION).get()]);
    return { ...estadoFondoCon(fondo, todosLosMovimientos(snap.docs)), historial: (fondo.historial || []).slice(-20).reverse() };
};

const verificarAdmin = (u) => {
    if (u.role !== ROLES.ADMIN) throw new ErrorHttp(403, "Solo el Administrador puede cambiar el fondo de caja chica.");
};

// PUT /fondo { montoFondo, motivo } (Admin): cambia el monto asignado sin
// reiniciar lo ya usado.
export const cambiarFondo = async (datos, usuario) => {
    verificarAdmin(usuario);
    const monto = r2(datos.montoFondo);
    if (!Number.isFinite(monto) || monto <= 0 || monto > 1_000_000) throw new ErrorHttp(400, "Indica un monto de fondo válido.");
    const fondo = await leerFondo();
    const nuevo = {
        montoFondo: monto,
        // Primera asignación: cuenta todo lo entregado hasta hoy (ciclo desde el inicio).
        desde: fondo.desde || null,
        historial: [...(fondo.historial || []), { accion: "CAMBIO_FONDO", anterior: fondo.montoFondo || 0, nuevo: monto, motivo: texto(datos.motivo), usuarioNombre: usuario.name || usuario.email, fecha: ahora() }].slice(-100)
    };
    await FONDO().set(nuevo);
    return obtenerFondo(usuario);
};

// POST /fondo/reponer { comentario } (Admin): Contabilidad repuso el
// efectivo gastado; el disponible vuelve al monto del fondo.
export const reponerFondo = async (comentario, usuario) => {
    verificarAdmin(usuario);
    const fondo = await leerFondo();
    if (!fondo.montoFondo) throw new ErrorHttp(409, "Primero asigna el monto del fondo.");
    const actual = await obtenerFondo(usuario);
    await FONDO().set({
        ...fondo,
        desde: ahora(),
        historial: [...(fondo.historial || []), { accion: "REPOSICION", repuesto: actual.usado, motivo: texto(comentario), usuarioNombre: usuario.name || usuario.email, fecha: ahora() }].slice(-100)
    });
    return obtenerFondo(usuario);
};

// Un corte está vigente si existe y no fue reabierto por el Administrador.
const corteVigente = (doc) => doc.exists && doc.data().estado !== "REABIERTA";

// Días anteriores a hoy con movimientos y sin corte vigente, desde que se
// asignó el fondo por primera vez (antes no había corte de caja).
const diasSinCorte = async (movimientos = null) => {
    const fondo = await leerFondo();
    const inicio = fondo.historial?.[0]?.fecha ? diaSV(fondo.historial[0].fecha) : null;
    if (!inicio) return [];
    const hoy = diaSV(ahora());
    const movs = movimientos || todosLosMovimientos((await db.collection(COLECCION).get()).docs);
    const dias = [...new Set(movs.map((m) => diaSV(m.fecha)))].filter((d) => d >= inicio && d < hoy);
    if (!dias.length) return [];
    const cortes = await db.collection(CORTES).get();
    const cortados = new Set(cortes.docs.filter(corteVigente).map((d) => d.id));
    return dias.filter((d) => !cortados.has(d)).sort();
};

// Antes de entregar o pagar un reintegro: sin cortes atrasados, caja de hoy
// abierta (o reabierta por el Admin) y fondo suficiente.
const verificarCajaAbierta = async (montoSalida) => {
    const hoy = diaSV(ahora());
    const pendientes = await diasSinCorte();
    if (pendientes.length) {
        throw new ErrorHttp(409, `Falta el corte de caja del ${pendientes.join(", ")}. Hazlo en Cuadre de caja antes de registrar movimientos.`);
    }
    const corte = await db.collection(CORTES).doc(hoy).get();
    if (corteVigente(corte)) throw new ErrorHttp(409, `La caja ya se cortó hoy (${hoy}). Los movimientos se registran a partir de mañana, salvo que el Administrador la reabra.`);
    if (montoSalida > 0) {
        const { disponible, montoFondo } = await obtenerFondo({ role: ROLES.ADMIN });
        if (!montoFondo) throw new ErrorHttp(409, "La caja chica no tiene fondo asignado. El Administrador debe asignarlo en Cuadre de caja.");
        if (montoSalida > disponible) throw new ErrorHttp(409, `Fondo insuficiente: disponible $${disponible.toFixed(2)}, se necesitan $${montoSalida.toFixed(2)}.`);
    }
};

// ---------------------------------------------------------------------------
// Cuadre del día + corte de caja
// ---------------------------------------------------------------------------
export const cuadreDelDia = async (dia, usuario) => {
    await verificarLecturaCaja(usuario);
    const d = /^\d{4}-\d{2}-\d{2}$/.test(dia || "") ? dia : diaSV(ahora());
    const [snap, fondo, corteDoc] = await Promise.all([db.collection(COLECCION).get(), leerFondo(), db.collection(CORTES).doc(d).get()]);
    const todos = todosLosMovimientos(snap.docs);
    const movimientos = todos.filter((m) => diaSV(m.fecha) === d);

    const suma = (tipo, campo) => r2(movimientos.filter((m) => m.tipo === tipo).reduce((a, m) => a + Number(m[campo] || 0), 0));
    const entregado = suma("ENTREGA", "salida");
    const reintegros = suma("REINTEGRO", "salida");
    const vueltos = suma("VUELTO", "entrada");
    const salidaNeta = r2(entregado + reintegros - vueltos);

    // Saldo de caja al inicio y al final del día (teórico), dentro del ciclo actual.
    const montoFondo = r2(fondo.montoFondo || 0);
    const saldoInicial = r2(montoFondo - netoEntre(todos, fondo.desde, inicioDiaSV(d)));
    const saldoFinal = r2(montoFondo - netoEntre(todos, fondo.desde, finDiaSV(d)));

    return {
        dia: d,
        movimientos,
        resumen: {
            entregas: movimientos.filter((m) => m.tipo === "ENTREGA").length,
            entregado,
            reintegros,
            vueltos,
            salidaNeta,
            liquidacionesCerradas: movimientos.filter((m) => m.tipo !== "ENTREGA").length,
            excedentesNoReconocidos: r2(movimientos.reduce((a, m) => a + Number(m.excedenteNoReconocido || 0), 0))
        },
        fondo: { ...estadoFondoCon(fondo, todos), saldoInicial, saldoFinal },
        corte: corteDoc.exists ? { id: corteDoc.id, ...corteDoc.data() } : null,
        cortesPendientes: await diasSinCorte(todos),
        esHoy: d === diaSV(ahora())
    };
};

// Avisos de control de caja: Administradores + Autorizadores de Finanzas.
const destinatariosControlCaja = async () => {
    const [admins, finanzas] = await Promise.all([obtenerUsuariosPorRol(ROLES.ADMIN), aprobadoresFinanzas(null)]);
    return [...new Set([...admins.map((a) => a.uid), ...finanzas.map((f) => f.uid)])];
};

// POST /cortes { dia, efectivoContado, observacion } (Cajero/Admin): corte de
// caja del día. Uno por día; queda fijo con el cálculo del momento. Después
// del corte de hoy ya no se registran entregas ni cierres hasta mañana.
export const registrarCorte = async (datos, usuario) => {
    verificarCajero(usuario);
    const hoy = diaSV(ahora());
    const dia = /^\d{4}-\d{2}-\d{2}$/.test(datos.dia || "") ? datos.dia : hoy;
    if (dia > hoy) throw new ErrorHttp(400, "No se puede cortar un día futuro.");

    const contado = r2(datos.efectivoContado);
    if (!Number.isFinite(contado) || contado < 0) throw new ErrorHttp(400, "Indica el efectivo contado en caja.");

    const c = await cuadreDelDia(dia, usuario);
    if (!c.fondo.montoFondo) throw new ErrorHttp(409, "La caja chica no tiene fondo asignado.");
    const diferencia = r2(contado - c.fondo.saldoFinal);
    const observacion = texto(datos.observacion).slice(0, 500);
    if (diferencia !== 0 && observacion.length < 3) throw new ErrorHttp(400, "Hay diferencia entre lo contado y el saldo del sistema: explica el motivo.");

    const corte = {
        dia,
        estado: "CORTADA",
        tardio: dia < hoy,
        fondoAsignado: c.fondo.montoFondo,
        saldoInicial: c.fondo.saldoInicial,
        entregado: c.resumen.entregado,
        reintegros: c.resumen.reintegros,
        vueltos: c.resumen.vueltos,
        salidaNeta: c.resumen.salidaNeta,
        saldoTeorico: c.fondo.saldoFinal,
        efectivoContado: contado,
        diferencia,
        observacion,
        movimientos: c.movimientos.length,
        cajeroId: usuario.uid,
        cajeroNombre: usuario.name || usuario.email,
        fecha: ahora()
    };

    const ref = db.collection(CORTES).doc(dia);
    await db.runTransaction(async (t) => {
        const doc = await t.get(ref);
        if (corteVigente(doc)) throw new ErrorHttp(409, `La caja del ${dia} ya fue cortada por ${doc.data().cajeroNombre}.`);
        // Si el Admin la reabrió, se conserva el historial de reaperturas.
        const reaperturas = doc.exists ? doc.data().reaperturas || [] : [];
        corte.reaperturas = reaperturas;
        corte.numeroCorte = reaperturas.length + 1;
        t.set(ref, corte);
    });

    if (corte.tardio) {
        await notificar({
            usuarioIds: await destinatariosControlCaja(),
            titulo: "Corte de caja chica tardío",
            mensaje: `${corte.cajeroNombre} registró hoy el corte del ${dia}, que no se hizo a tiempo.`,
            enlace: "/caja-chica/cuadre",
            enviarEmail: false
        });
    }

    // Faltante o sobrante: Administradores y Autorizadores de Finanzas.
    if (diferencia !== 0) {
        await notificar({
            usuarioIds: await destinatariosControlCaja(),
            titulo: "Corte de caja chica con diferencia",
            mensaje: `${corte.cajeroNombre} cortó la caja del ${dia}: sistema $${corte.saldoTeorico.toFixed(2)}, contado $${contado.toFixed(2)} (${diferencia > 0 ? "sobrante" : "faltante"} $${Math.abs(diferencia).toFixed(2)}). ${observacion}`,
            enlace: "/caja-chica/cuadre"
        });
    }
    return { id: dia, ...corte };
};

// GET /cortes → últimos 30 cortes (más reciente primero)
export const listarCortes = async (usuario) => {
    await verificarLecturaCaja(usuario);
    const snap = await db.collection(CORTES).get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.dia.localeCompare(a.dia)).slice(0, 30);
};

// POST /cortes/:dia/reabrir { motivo } (solo Admin, solo el día de hoy):
// reabre la caja ya cortada para una entrega de emergencia. El corte
// anterior queda en el historial con el motivo; el cajero debe volver a
// cortar al terminar.
export const reabrirCorte = async (dia, motivo, usuario) => {
    if (usuario.role !== ROLES.ADMIN) throw new ErrorHttp(403, "Solo el Administrador puede reabrir la caja.");
    const hoy = diaSV(ahora());
    if (dia !== hoy) throw new ErrorHttp(400, "Solo se puede reabrir la caja del día de hoy.");
    const justificacion = texto(motivo);
    if (justificacion.length < 10) throw new ErrorHttp(400, "Justifica la reapertura (mínimo 10 caracteres).");

    const ref = db.collection(CORTES).doc(dia);
    const reabierto = await db.runTransaction(async (t) => {
        const doc = await t.get(ref);
        if (!corteVigente(doc)) throw new ErrorHttp(409, "La caja de hoy no está cortada.");
        const { reaperturas = [], ...corteAnterior } = doc.data();
        const cambios = {
            estado: "REABIERTA",
            reaperturas: [
                ...reaperturas,
                { motivo: justificacion, adminId: usuario.uid, adminNombre: usuario.name || usuario.email, fecha: ahora(), corteAnterior }
            ]
        };
        t.update(ref, cambios);
        return { id: dia, ...doc.data(), ...cambios };
    });

    const cajeros = await obtenerUsuariosPorRol(ROLES.CAJERO);
    await notificar({
        usuarioIds: cajeros.map((c) => c.uid),
        titulo: "Caja chica reabierta",
        mensaje: `${usuario.name || usuario.email} reabrió la caja de hoy. Motivo: ${justificacion}. Al terminar, vuelve a hacer el corte.`,
        enlace: "/caja-chica/cuadre"
    });
    return reabierto;
};

// Aviso de cortes no realizados (se llama con la revisión de cada 30 min):
// una vez por día faltante, a Administradores y Cajeros.
export const revisarCortesPendientes = async () => {
    const pendientes = await diasSinCorte();
    if (!pendientes.length) return 0;
    const ref = db.collection("configuracion").doc("cajaChicaAvisosCorte");
    const doc = await ref.get();
    const avisados = new Set(doc.exists ? doc.data().dias || [] : []);
    const nuevos = pendientes.filter((d) => !avisados.has(d));
    if (!nuevos.length) return 0;
    await ref.set({ dias: [...avisados, ...nuevos].slice(-120) });
    const [control, cajeros] = await Promise.all([destinatariosControlCaja(), obtenerUsuariosPorRol(ROLES.CAJERO)]);
    await notificar({
        usuarioIds: [...new Set([...control, ...cajeros.map((u) => u.uid)])],
        titulo: "Falta el corte de caja chica",
        mensaje: `No se hizo el corte de caja del ${nuevos.join(", ")}. Hasta registrarlo no se pueden hacer entregas ni cierres de liquidación.`,
        enlace: "/caja-chica/cuadre"
    });
    return nuevos.length;
};
