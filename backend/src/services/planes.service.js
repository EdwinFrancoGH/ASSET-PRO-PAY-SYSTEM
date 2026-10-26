// Planes de pago: una compra (normalmente al exterior) que se paga en
// cuotas, p. ej. 10% anticipo, 40% segundo anticipo y 50% pago final.
//
// - Cada cuota se paga con una petición normal (mismo flujo de
//   autorización, contabilidad y pago), vinculada al plan.
// - Las cuotas se solicitan en orden: la siguiente se habilita cuando la
//   anterior está PAGADA.
// - Los términos se pueden modificar (el monto final puede variar por
//   disponibilidad), pero las cuotas que ya tienen petición quedan fijas.
//   Cada cambio exige un motivo y guarda la versión anterior y la nueva en
//   el historial, para trazabilidad.
import crypto from "crypto";
import db from "../config/firebase.js";
import { ROLES } from "../config/roles.js";
import { ESTADOS, MONEDAS } from "../config/estados.js";
import { origenDeProveedor } from "../config/bancario.js";
import { obtenerPorId as obtenerCatalogo } from "./catalogos.service.js";
import { esCompras } from "./permisos.service.js";
import { ErrorHttp } from "../utils/errores.js";

const COLECCION = "planesPago";
export const ESTADOS_PLAN = { ABIERTO: "ABIERTO", COMPLETADO: "COMPLETADO", CANCELADO: "CANCELADO" };

const MAX_CUOTAS = 10;
const ahora = () => new Date().toISOString();
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const texto = (v) => (v === undefined || v === null ? "" : String(v).trim());
const fechaValida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(v).getTime());

// ---------------------------------------------------------------------------
// Permisos
// ---------------------------------------------------------------------------
const puedeLeer = async (usuario) =>
    [ROLES.ADMIN, ROLES.CONTABILIDAD].includes(usuario.role) || (await esCompras(usuario));

const verificarLectura = async (usuario) => {
    if (!(await puedeLeer(usuario))) throw new ErrorHttp(403, "No tienes acceso a los planes de pago.");
};

const verificarEscritura = async (usuario) => {
    if (!(await esCompras(usuario))) throw new ErrorHttp(403, "Solo el área de Compras puede crear o modificar planes de pago.");
};

// ---------------------------------------------------------------------------
// Correlativo PL-AAAA-00001
// ---------------------------------------------------------------------------
const generarNumero = async () => {
    const anio = new Date().getFullYear();
    const ref = db.collection("contadores").doc(`planes-${anio}`);
    const siguiente = await db.runTransaction(async (t) => {
        const doc = await t.get(ref);
        const valor = (doc.exists ? doc.data().valor : 0) + 1;
        t.set(ref, { valor, actualizado: ahora() });
        return valor;
    });
    return `PL-${anio}-${String(siguiente).padStart(5, "0")}`;
};

// ---------------------------------------------------------------------------
// Cuotas
// ---------------------------------------------------------------------------
// Las cuotas llegan con su monto (el navegador lo calcula desde el % y la
// última cuota absorbe los centavos). Aquí se valida que sumen el total y
// se recalcula el % de cada una.
const normalizarCuotas = (cuotas, montoTotal) => {
    if (!Array.isArray(cuotas) || cuotas.length === 0) throw new ErrorHttp(400, "Agrega al menos una cuota.");
    if (cuotas.length > MAX_CUOTAS) throw new ErrorHttp(400, `Un plan admite máximo ${MAX_CUOTAS} cuotas.`);

    const lista = cuotas.map((c, i) => {
        const monto = r2(c.monto);
        if (!texto(c.nombre)) throw new ErrorHttp(400, `Cuota ${i + 1}: indica el nombre (p. ej. "Primer anticipo").`);
        if (!Number.isFinite(monto) || monto <= 0) throw new ErrorHttp(400, `Cuota ${i + 1}: el monto debe ser mayor a 0.`);
        if (c.fechaEstimada && !fechaValida(c.fechaEstimada)) throw new ErrorHttp(400, `Cuota ${i + 1}: la fecha estimada no es válida.`);
        return {
            id: c.id || crypto.randomUUID(),
            numero: i + 1,
            nombre: texto(c.nombre).slice(0, 80),
            monto,
            porcentaje: r2((monto / montoTotal) * 100),
            condicion: texto(c.condicion).slice(0, 200),
            fechaEstimada: c.fechaEstimada || null,
            peticionId: c.peticionId || null,
            peticionNumero: c.peticionNumero || null
        };
    });

    const suma = r2(lista.reduce((acc, c) => acc + c.monto, 0));
    if (Math.abs(suma - montoTotal) > 0.009) {
        throw new ErrorHttp(400, `Las cuotas suman ${suma.toFixed(2)} y el total es ${montoTotal.toFixed(2)}. Deben coincidir (100%).`);
    }
    return lista;
};

// Foto de los términos, para el historial (antes / después).
const terminos = (plan) => ({
    montoTotal: plan.montoTotal,
    cuotas: plan.cuotas.map(({ numero, nombre, porcentaje, monto, condicion, fechaEstimada }) => ({
        numero, nombre, porcentaje, monto, condicion, fechaEstimada
    }))
});

const entradaHistorial = (usuario, accion, { motivo = "", antes = null, despues = null, version, detalle = "" } = {}) => ({
    accion,
    motivo: texto(motivo),
    detalle,
    version: version ?? null,
    antes,
    despues,
    usuarioId: usuario.uid,
    usuarioNombre: usuario.name || usuario.email,
    fecha: ahora()
});

// ---------------------------------------------------------------------------
// Lectura: se completa cada cuota con el estado de su petición y se
// calcula el avance (pagado / en proceso / saldo) y la siguiente cuota.
// ---------------------------------------------------------------------------
const leerPeticiones = async (ids) => {
    const unicos = [...new Set(ids.filter(Boolean))];
    if (!unicos.length) return new Map();
    const docs = await db.getAll(...unicos.map((id) => db.collection("peticiones").doc(id)));
    return new Map(docs.filter((d) => d.exists).map((d) => [d.id, d.data()]));
};

const completar = (plan, peticiones) => {
    let anteriorPagada = true;
    let pagado = 0;
    let enProceso = 0;

    const cuotas = plan.cuotas.map((c) => {
        const p = c.peticionId ? peticiones.get(c.peticionId) : null;
        const estadoPeticion = p?.estado || null;
        const pagada = estadoPeticion === ESTADOS.PAGADA;
        if (pagada) pagado += c.monto;
        else if (p) enProceso += c.monto;

        const habilitada = plan.estado === ESTADOS_PLAN.ABIERTO && !c.peticionId && anteriorPagada;
        anteriorPagada = anteriorPagada && pagada;
        return { ...c, estadoPeticion, habilitada };
    });

    const completo = cuotas.every((c) => c.estadoPeticion === ESTADOS.PAGADA);
    return {
        ...plan,
        estado: plan.estado === ESTADOS_PLAN.ABIERTO && completo ? ESTADOS_PLAN.COMPLETADO : plan.estado,
        cuotas,
        resumen: {
            pagado: r2(pagado),
            enProceso: r2(enProceso),
            saldo: r2(plan.montoTotal - pagado),
            porcentajePagado: plan.montoTotal ? r2((pagado / plan.montoTotal) * 100) : 0,
            siguienteCuotaId: cuotas.find((c) => c.habilitada)?.id || null
        }
    };
};

const leer = async (id) => {
    const doc = await db.collection(COLECCION).doc(id).get();
    if (!doc.exists) throw new ErrorHttp(404, "Plan de pago no encontrado.");
    return { id: doc.id, ...doc.data() };
};

export const obtener = async (id, usuario) => {
    await verificarLectura(usuario);
    const plan = await leer(id);
    return completar(plan, await leerPeticiones(plan.cuotas.map((c) => c.peticionId)));
};

export const listar = async (usuario, filtros = {}) => {
    await verificarLectura(usuario);
    const snap = await db.collection(COLECCION).get();
    const planes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const peticiones = await leerPeticiones(planes.flatMap((p) => p.cuotas.map((c) => c.peticionId)));
    let lista = planes.map((p) => completar(p, peticiones));

    if (filtros.estado) lista = lista.filter((p) => p.estado === filtros.estado);
    if (filtros.proveedorId) lista = lista.filter((p) => p.proveedorId === filtros.proveedorId);
    if (filtros.q) {
        const q = String(filtros.q).toLowerCase();
        lista = lista.filter((p) => [p.numero, p.proveedorNombre, p.ordenELM, p.concepto].some((v) => (v || "").toLowerCase().includes(q)));
    }
    return lista.sort((a, b) => (b.fechaCreacion || "").localeCompare(a.fechaCreacion || ""));
};

// ---------------------------------------------------------------------------
// Crear y modificar
// ---------------------------------------------------------------------------
const validarGenerales = (datos) => {
    const montoTotal = r2(datos.montoTotal);
    if (!Number.isFinite(montoTotal) || montoTotal <= 0) throw new ErrorHttp(400, "El monto total debe ser mayor a 0.");
    if (!texto(datos.concepto)) throw new ErrorHttp(400, "Indica el concepto de la compra.");
    if (texto(datos.concepto).length > 2000) throw new ErrorHttp(400, "El concepto admite máximo 2000 caracteres.");
    if (texto(datos.ordenELM).length > 60) throw new ErrorHttp(400, "La Orden ELM admite máximo 60 caracteres.");
    const moneda = datos.moneda || "USD";
    if (!MONEDAS.includes(moneda)) throw new ErrorHttp(400, `Moneda no válida. Usa: ${MONEDAS.join(", ")}.`);
    return { montoTotal, moneda };
};

export const crear = async (datos, usuario) => {
    await verificarEscritura(usuario);
    const { montoTotal, moneda } = validarGenerales(datos);

    const proveedor = await obtenerCatalogo("proveedores", datos.proveedorId);
    if (!proveedor) throw new ErrorHttp(400, "Selecciona un proveedor válido.");

    const cuotas = normalizarCuotas(
        (datos.cuotas || []).map(({ id, peticionId, peticionNumero, ...c }) => c), // al crear, ninguna tiene petición
        montoTotal
    );

    const plan = {
        estado: ESTADOS_PLAN.ABIERTO,
        proveedorId: proveedor.id,
        proveedorNombre: proveedor.nombre,
        codigoSAP: proveedor.codigoSAP || "",
        tipo: origenDeProveedor(proveedor),
        ordenELM: texto(datos.ordenELM),
        concepto: texto(datos.concepto),
        moneda,
        montoTotal,
        cuotas,
        version: 1,
        creadoPorId: usuario.uid,
        creadoPorNombre: usuario.name || usuario.email,
        fechaCreacion: ahora(),
        fechaActualizacion: ahora()
    };
    plan.historial = [entradaHistorial(usuario, "CREADO", { version: 1, despues: terminos(plan) })];
    plan.numero = await generarNumero();

    const ref = await db.collection(COLECCION).add(plan);
    return obtener(ref.id, usuario);
};

// Modificar términos: monto total y cuotas pendientes. Las cuotas que ya
// tienen petición no se pueden cambiar ni quitar.
export const modificar = async (id, datos, usuario) => {
    await verificarEscritura(usuario);
    if (!texto(datos.motivo)) throw new ErrorHttp(400, "Indica el motivo del cambio (queda en el historial).");
    const { montoTotal } = validarGenerales({ ...datos, concepto: datos.concepto ?? "x" });

    const ref = db.collection(COLECCION).doc(id);
    await db.runTransaction(async (t) => {
        const doc = await t.get(ref);
        if (!doc.exists) throw new ErrorHttp(404, "Plan de pago no encontrado.");
        const plan = { id: doc.id, ...doc.data() };
        if (plan.estado !== ESTADOS_PLAN.ABIERTO) throw new ErrorHttp(409, "El plan ya no está abierto.");

        const bloqueadas = plan.cuotas.filter((c) => c.peticionId);
        const recibidas = datos.cuotas || [];

        // Las cuotas con petición deben venir primero, en el mismo orden y sin cambios de monto.
        bloqueadas.forEach((b, i) => {
            const r = recibidas[i];
            if (!r || r.id !== b.id) {
                throw new ErrorHttp(409, `La cuota "${b.nombre}" ya tiene la petición ${b.peticionNumero} y no se puede quitar ni mover.`);
            }
            if (Math.abs(r2(r.monto) - b.monto) > 0.009) {
                throw new ErrorHttp(409, `La cuota "${b.nombre}" ya tiene la petición ${b.peticionNumero}; su monto no se puede cambiar.`);
            }
        });

        const cuotas = normalizarCuotas(
            recibidas.map((r, i) =>
                i < bloqueadas.length
                    ? { ...bloqueadas[i] } // se conservan tal cual
                    : { ...r, peticionId: null, peticionNumero: null }
            ),
            montoTotal
        );

        const antes = terminos(plan);
        const version = (plan.version || 1) + 1;
        const cambios = {
            montoTotal,
            cuotas,
            concepto: datos.concepto !== undefined ? texto(datos.concepto) || plan.concepto : plan.concepto,
            version,
            fechaActualizacion: ahora()
        };
        cambios.historial = [
            ...(plan.historial || []),
            entradaHistorial(usuario, "MODIFICADO", { motivo: datos.motivo, version, antes, despues: terminos({ ...plan, ...cambios }) })
        ];
        t.update(ref, cambios);
    });

    return obtener(id, usuario);
};

export const cancelar = async (id, { motivo }, usuario) => {
    await verificarEscritura(usuario);
    if (!texto(motivo)) throw new ErrorHttp(400, "Indica el motivo de la cancelación.");

    const plan = await obtener(id, usuario);
    if (plan.estado !== ESTADOS_PLAN.ABIERTO) throw new ErrorHttp(409, "El plan ya no está abierto.");
    const enProceso = plan.cuotas.find((c) => c.peticionId && c.estadoPeticion !== ESTADOS.PAGADA);
    if (enProceso) {
        throw new ErrorHttp(409, `La cuota "${enProceso.nombre}" tiene la petición ${enProceso.peticionNumero} en proceso. Termínala o elimínala antes de cancelar el plan.`);
    }

    await db.collection(COLECCION).doc(id).update({
        estado: ESTADOS_PLAN.CANCELADO,
        fechaActualizacion: ahora(),
        historial: [...(plan.historial || []), entradaHistorial(usuario, "CANCELADO", { motivo, version: plan.version })]
    });
    return obtener(id, usuario);
};

// ---------------------------------------------------------------------------
// Integración con peticiones
// ---------------------------------------------------------------------------

// Antes de crear la petición de una cuota: valida que se pueda solicitar
// y devuelve los datos que la petición debe tomar del plan.
export const datosParaCuota = async (planId, cuotaId, usuario) => {
    await verificarEscritura(usuario);
    const plan = await obtener(planId, usuario);
    const cuota = plan.cuotas.find((c) => c.id === cuotaId);
    if (!cuota) throw new ErrorHttp(400, "La cuota no existe en el plan.");
    if (plan.estado !== ESTADOS_PLAN.ABIERTO) throw new ErrorHttp(409, "El plan ya no está abierto.");
    if (cuota.peticionId) throw new ErrorHttp(409, `Esta cuota ya tiene la petición ${cuota.peticionNumero}.`);
    if (!cuota.habilitada) throw new ErrorHttp(409, "Las cuotas se solicitan en orden: la anterior debe estar pagada.");

    return {
        plan,
        cuota,
        camposPeticion: {
            proveedorId: plan.proveedorId,
            ordenELM: plan.ordenELM,
            moneda: plan.moneda,
            monto: cuota.monto,
            porcentaje: 100
        },
        vinculo: {
            planId: plan.id,
            planNumero: plan.numero,
            cuotaId: cuota.id,
            cuotaNumero: cuota.numero,
            cuotaNombre: cuota.nombre,
            cuotasTotal: plan.cuotas.length
        }
    };
};

// Marca la cuota como solicitada. Si otra persona la tomó al mismo tiempo,
// falla y la petición recién creada se debe eliminar.
export const vincularCuota = async (planId, cuotaId, peticion, usuario) => {
    const ref = db.collection(COLECCION).doc(planId);
    await db.runTransaction(async (t) => {
        const doc = await t.get(ref);
        const plan = doc.data();
        const cuota = plan.cuotas.find((c) => c.id === cuotaId);
        if (!cuota || cuota.peticionId) throw new ErrorHttp(409, "Otra persona ya solicitó esta cuota. Recarga el plan.");
        t.update(ref, {
            cuotas: plan.cuotas.map((c) => (c.id === cuotaId ? { ...c, peticionId: peticion.id, peticionNumero: peticion.numero } : c)),
            fechaActualizacion: ahora(),
            historial: [
                ...(plan.historial || []),
                entradaHistorial(usuario, "CUOTA_SOLICITADA", { version: plan.version, detalle: `${cuota.nombre}: petición ${peticion.numero}` })
            ]
        });
    });
};

// Al eliminar el borrador de una cuota, la cuota vuelve a quedar pendiente.
export const liberarCuota = async (planId, cuotaId, peticion, usuario) => {
    const ref = db.collection(COLECCION).doc(planId);
    await db.runTransaction(async (t) => {
        const doc = await t.get(ref);
        if (!doc.exists) return;
        const plan = doc.data();
        const cuota = plan.cuotas.find((c) => c.id === cuotaId);
        if (!cuota || cuota.peticionId !== peticion.id) return;
        t.update(ref, {
            cuotas: plan.cuotas.map((c) => (c.id === cuotaId ? { ...c, peticionId: null, peticionNumero: null } : c)),
            fechaActualizacion: ahora(),
            historial: [
                ...(plan.historial || []),
                entradaHistorial(usuario, "CUOTA_LIBERADA", { version: plan.version, detalle: `${cuota.nombre}: se eliminó el borrador ${peticion.numero}` })
            ]
        });
    });
};
