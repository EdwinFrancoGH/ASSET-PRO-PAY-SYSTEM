// Expediente de anticipos: cuando un anticipo termina su ciclo (petición
// con término "Anticipo" en estado PAGADA), se le asocian una o varias
// facturas que lo compensan. Los anticipos que aún van en el flujo
// (enviados, en revisión, aprobados) se muestran como "En proceso de pago"
// para tener la vista completa, pero no se pueden compensar.
//
//   EN_PROCESO_PAGO     → anticipo enviado, aún no pagado (solo consulta).
//   PENDIENTE_COMPENSAR → aún no tiene factura.
//   SALDO_PENDIENTE     → las facturas no cubren todo el anticipo.
//   COMPENSADO          → las facturas suman exactamente el anticipo.
//   EXCEDENTE           → las facturas suman más que el anticipo.
//
// Módulo independiente: solo LEE las peticiones (nunca las modifica). Sus
// datos viven en la colección "expedientes" (un documento por anticipo,
// con el mismo id de la petición). Las compensaciones no se borran: se
// anulan con motivo, para conservar la trazabilidad.
import fs from "fs";
import path from "path";
import crypto from "crypto";
import ExcelJS from "exceljs";
import db from "../config/firebase.js";
import { ROLES } from "../config/roles.js";
import { ESTADOS } from "../config/estados.js";
import { montoFinal } from "../config/impuestos.js";
import { tipoDePeticion } from "../config/bancario.js";
import { esCompras } from "./permisos.service.js";
import { CARPETA_EXPEDIENTES } from "../middlewares/uploadExpediente.middleware.js";
import { UPLOADS_DIR } from "../middlewares/upload.middleware.js";
import { generarSolicitudPdf } from "./solicitudPdf.service.js";
import { ErrorHttp } from "../utils/errores.js";

const COLECCION = "expedientes";
export const ESTADOS_EXPEDIENTE = {
    EN_PROCESO_PAGO: "EN_PROCESO_PAGO",
    PENDIENTE_COMPENSAR: "PENDIENTE_COMPENSAR",
    SALDO_PENDIENTE: "SALDO_PENDIENTE",
    COMPENSADO: "COMPENSADO",
    EXCEDENTE: "EXCEDENTE"
};
const ETIQUETAS = {
    EN_PROCESO_PAGO: "En proceso de pago",
    PENDIENTE_COMPENSAR: "Pendiente de compensar",
    SALDO_PENDIENTE: "Saldo pendiente",
    COMPENSADO: "Compensado",
    EXCEDENTE: "Compensado con excedente"
};

const ahora = () => new Date().toISOString();
const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
const texto = (v) => (v === undefined || v === null ? "" : String(v).trim());
const fechaValida = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00Z`).getTime());
const hoySV = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/El_Salvador" });
const normalizarNumero = (v) => texto(v).toUpperCase().replace(/\s+/g, "");

// ---------------------------------------------------------------------------
// Permisos
// ---------------------------------------------------------------------------
// Ven todos los anticipos: Compras, Contabilidad y Administrador. Los demás
// usuarios ven solo los anticipos que ellos solicitaron.
const veTodo = async (usuario) =>
    [ROLES.ADMIN, ROLES.CONTABILIDAD].includes(usuario.role) || (await esCompras(usuario));

// Compensar: quien solicitó el anticipo, Compras, Contabilidad o Admin.
const puedeCompensar = async (peticion, usuario) => peticion.solicitanteId === usuario.uid || (await veTodo(usuario));

// ¿La petición es un anticipo? Además del término nuevo ("ANTICIPO"), se
// reconocen las peticiones anteriores a ese campo: término del catálogo
// antiguo llamado "Anticipo" y cuotas de un plan que no son la última.
const sinTildes = (v) => texto(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const esAnticipo = (p) => {
    if (p.terminoPago) return p.terminoPago === "ANTICIPO";
    if (sinTildes(p.terminoPagoNombre).includes("anticipo")) return true;
    return Boolean(p.planId) && Number(p.cuotaNumero) > 0 && Number(p.cuotaNumero) < Number(p.cuotasTotal);
};
// Estados que entran al expediente: pagados y los que siguen en el flujo.
// Borradores y rechazados quedan fuera (aún los puede corregir el solicitante).
const ESTADOS_EN_PROCESO = [ESTADOS.ENVIADA, ESTADOS.EN_REVISION, ESTADOS.APROBADA_AUTORIZADOR, ESTADOS.APROBADA_CONTABILIDAD];
const ESTADOS_VISIBLES = [...ESTADOS_EN_PROCESO, ESTADOS.PAGADA];
const estaPagada = (p) => p.estado === ESTADOS.PAGADA;
const esAnticipoVisible = (p) => ESTADOS_VISIBLES.includes(p.estado) && esAnticipo(p);

// ---------------------------------------------------------------------------
// Armado del expediente (petición + compensaciones)
// ---------------------------------------------------------------------------
const armar = (peticion, expediente) => {
    const compensaciones = expediente?.compensaciones || [];
    const vigentes = compensaciones.filter((c) => !c.anulada);
    const montoAnticipo = r2(montoFinal(peticion) || 0);
    const compensado = r2(vigentes.reduce((a, c) => a + Number(c.valor || 0), 0));
    const diferencia = r2(montoAnticipo - compensado);

    let estado = ESTADOS_EXPEDIENTE.PENDIENTE_COMPENSAR;
    if (!estaPagada(peticion)) estado = ESTADOS_EXPEDIENTE.EN_PROCESO_PAGO;
    else if (vigentes.length) {
        if (diferencia > 0.005) estado = ESTADOS_EXPEDIENTE.SALDO_PENDIENTE;
        else if (diferencia < -0.005) estado = ESTADOS_EXPEDIENTE.EXCEDENTE;
        else estado = ESTADOS_EXPEDIENTE.COMPENSADO;
    }

    return {
        id: peticion.id,
        peticionId: peticion.id,
        numero: peticion.numero,
        solicitanteId: peticion.solicitanteId,
        solicitanteNombre: peticion.solicitanteNombre,
        areaNombre: peticion.areaNombre,
        proveedorId: peticion.proveedorId,
        proveedorNombre: peticion.proveedorNombre,
        codigoSAP: peticion.codigoSAP,
        tipo: tipoDePeticion(peticion),
        estadoPeticion: peticion.estado,
        pagada: estaPagada(peticion),
        moneda: peticion.moneda || "USD",
        conceptoCompra: peticion.conceptoCompra,
        ordenELM: peticion.ordenELM,
        planNumero: peticion.planNumero || null,
        cuotaNombre: peticion.cuotaNombre || null,
        fechaPago: estaPagada(peticion) ? peticion.pago?.fechaPago || peticion.fechaPago || peticion.fechaActualizacion || null : null,
        fechaSolicitud: peticion.fechaCreacion || null,
        montoAnticipo,
        compensado,
        // Mientras no esté pagado no hay saldo por liquidar.
        saldo: estaPagada(peticion) && diferencia > 0 ? diferencia : 0,
        excedente: diferencia < 0 ? -diferencia : 0,
        estado,
        compensaciones
    };
};

const leerPeticion = async (id) => {
    const doc = await db.collection("peticiones").doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

const leerExpediente = async (id) => {
    const doc = await db.collection(COLECCION).doc(id).get();
    return doc.exists ? doc.data() : null;
};

const obtenerAnticipo = async (id, usuario) => {
    const peticion = await leerPeticion(id);
    if (!peticion || !esAnticipoVisible(peticion)) throw new ErrorHttp(404, "Anticipo no encontrado.");
    if (peticion.solicitanteId !== usuario.uid && !(await veTodo(usuario))) throw new ErrorHttp(404, "Anticipo no encontrado.");
    return peticion;
};

// ---------------------------------------------------------------------------
// Lectura
// ---------------------------------------------------------------------------
const sumarPorMoneda = (lista, campo) =>
    lista.reduce((acc, e) => {
        acc[e.moneda] = r2((acc[e.moneda] || 0) + Number(e[campo] || 0));
        return acc;
    }, {});

const resumir = (lista) => {
    const de = (estado) => lista.filter((e) => e.estado === estado);
    const pendientes = de(ESTADOS_EXPEDIENTE.PENDIENTE_COMPENSAR);
    const conSaldo = de(ESTADOS_EXPEDIENTE.SALDO_PENDIENTE);
    const excedentes = de(ESTADOS_EXPEDIENTE.EXCEDENTE);
    const enProceso = de(ESTADOS_EXPEDIENTE.EN_PROCESO_PAGO);
    return {
        enProceso: { cantidad: enProceso.length, monto: sumarPorMoneda(enProceso, "montoAnticipo") },
        pendientes: { cantidad: pendientes.length, monto: sumarPorMoneda(pendientes, "montoAnticipo") },
        conSaldo: { cantidad: conSaldo.length, saldo: sumarPorMoneda(conSaldo, "saldo") },
        compensados: { cantidad: de(ESTADOS_EXPEDIENTE.COMPENSADO).length },
        excedentes: { cantidad: excedentes.length, monto: sumarPorMoneda(excedentes, "excedente") }
    };
};

// Filtros: estado, q (número, proveedor, solicitante, Orden ELM, N° factura).
export const listar = async (usuario, filtros = {}) => {
    // Una sola condición (sin índices compuestos); el término se filtra aquí.
    const snap = await db.collection("peticiones").where("estado", "in", ESTADOS_VISIBLES).get();
    let peticiones = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter(esAnticipoVisible);
    if (!(await veTodo(usuario))) peticiones = peticiones.filter((p) => p.solicitanteId === usuario.uid);

    const docs = peticiones.length
        ? await db.getAll(...peticiones.map((p) => db.collection(COLECCION).doc(p.id)))
        : [];
    const expedientes = new Map(docs.filter((d) => d.exists).map((d) => [d.id, d.data()]));

    const todos = peticiones.map((p) => armar(p, expedientes.get(p.id)));
    // El resumen siempre considera todos los anticipos visibles (sin filtros).
    const resumen = resumir(todos);

    let lista = todos;
    if (filtros.estado) lista = lista.filter((e) => e.estado === filtros.estado);
    if (filtros.q) {
        const q = String(filtros.q).toLowerCase();
        lista = lista.filter((e) =>
            [e.numero, e.proveedorNombre, e.solicitanteNombre, e.ordenELM, e.planNumero, ...e.compensaciones.map((c) => c.numeroFactura)]
                .some((v) => String(v || "").toLowerCase().includes(q))
        );
    }
    // Primero los pagados (más recientes arriba); al final los que están en proceso.
    lista.sort((a, b) => Number(b.pagada) - Number(a.pagada) || String(b.fechaPago || b.fechaSolicitud || "").localeCompare(String(a.fechaPago || a.fechaSolicitud || "")));
    return { resumen, lista };
};

// Documentos de la petición (solo datos, sin la ruta en disco): soporte y
// comprobante de pago. Se muestran en "Documentos del expediente".
const datosAdjunto = (a) => ({
    id: a.id,
    nombre: a.nombre,
    tipo: a.tipo,
    tamano: a.tamano,
    subidoPorNombre: a.subidoPorNombre,
    fecha: a.fecha
});

const documentosDe = (peticion) => {
    const adjuntos = peticion.adjuntos || [];
    // Peticiones antiguas pueden no tener categoría: se toman como soporte.
    const esComprobante = (a) => a.categoria === "COMPROBANTE" || (peticion.pago?.comprobanteId && a.id === peticion.pago.comprobanteId);
    return {
        soporte: adjuntos.filter((a) => !esComprobante(a)).map(datosAdjunto),
        comprobantes: adjuntos.filter(esComprobante).map(datosAdjunto)
    };
};

export const obtener = async (id, usuario) => {
    const peticion = await obtenerAnticipo(id, usuario);
    const expediente = armar(peticion, await leerExpediente(id));
    return {
        ...expediente,
        documentos: documentosDe(peticion),
        puedeCompensar: estaPagada(peticion) && (await puedeCompensar(peticion, usuario))
    };
};

// ---------------------------------------------------------------------------
// Compensar (asociar una factura)
// ---------------------------------------------------------------------------
export const compensar = async (id, datos, archivo, usuario) => {
    const borrar = () => archivo && fs.rm(archivo.path, { force: true }, () => {});
    try {
        const peticion = await obtenerAnticipo(id, usuario);
        if (!estaPagada(peticion)) throw new ErrorHttp(409, "El anticipo aún no está pagado; podrás compensarlo cuando Contabilidad lo marque como Pagado.");
        if (!(await puedeCompensar(peticion, usuario))) throw new ErrorHttp(403, "Solo quien solicitó el anticipo, Compras o Contabilidad pueden compensarlo.");
        if (!archivo) throw new ErrorHttp(400, "Adjunta la factura (PDF o imagen).");

        const numeroFactura = texto(datos.numeroFactura);
        if (!numeroFactura) throw new ErrorHttp(400, "Indica el número de factura.");
        if (numeroFactura.length > 60) throw new ErrorHttp(400, "El número de factura admite máximo 60 caracteres.");
        const fechaFactura = texto(datos.fechaFactura);
        if (!fechaValida(fechaFactura)) throw new ErrorHttp(400, "Indica una fecha de factura válida.");
        if (fechaFactura > hoySV()) throw new ErrorHttp(400, "La fecha de la factura no puede ser futura.");
        const valor = r2(datos.valor);
        if (!Number.isFinite(valor) || valor <= 0) throw new ErrorHttp(400, "El valor de la factura debe ser mayor a 0.");
        if (valor > 99_999_999.99) throw new ErrorHttp(400, "El valor de la factura no es válido.");
        const comentario = texto(datos.comentario).slice(0, 500);

        const compensacion = {
            id: crypto.randomUUID(),
            numeroFactura,
            numeroFacturaNorm: normalizarNumero(numeroFactura),
            fechaFactura,
            valor,
            comentario,
            archivo: { nombre: archivo.originalname, archivo: archivo.filename, tipo: archivo.mimetype, tamano: archivo.size },
            registradoPorId: usuario.uid,
            registradoPorNombre: usuario.name || usuario.email,
            fecha: ahora(),
            anulada: false
        };

        const ref = db.collection(COLECCION).doc(id);
        await db.runTransaction(async (t) => {
            const doc = await t.get(ref);
            const actual = doc.exists ? doc.data() : { peticionId: id, compensaciones: [], historial: [] };
            const estadoActual = armar(peticion, actual);

            if ([ESTADOS_EXPEDIENTE.COMPENSADO, ESTADOS_EXPEDIENTE.EXCEDENTE].includes(estadoActual.estado)) {
                throw new ErrorHttp(409, "Este anticipo ya está compensado por completo.");
            }
            if (actual.compensaciones.some((c) => !c.anulada && c.numeroFacturaNorm === compensacion.numeroFacturaNorm)) {
                throw new ErrorHttp(409, `La factura ${numeroFactura} ya está registrada en este anticipo.`);
            }

            const saldoDespues = r2(estadoActual.saldo - valor);
            t.set(ref, {
                peticionId: id,
                peticionNumero: peticion.numero,
                compensaciones: [...actual.compensaciones, compensacion],
                historial: [
                    ...(actual.historial || []),
                    {
                        accion: "COMPENSADA",
                        detalle: `Factura ${numeroFactura} por ${valor.toFixed(2)}${saldoDespues > 0 ? `; saldo ${saldoDespues.toFixed(2)}` : saldoDespues < 0 ? `; excedente ${(-saldoDespues).toFixed(2)}` : "; anticipo compensado"}`,
                        usuarioNombre: usuario.name || usuario.email,
                        fecha: ahora()
                    }
                ],
                fechaActualizacion: ahora()
            });
        });

        return obtener(id, usuario);
    } catch (error) {
        borrar();
        throw error;
    }
};

// Anular una compensación (factura cargada por error). No se borra.
export const anular = async (id, compensacionId, { motivo }, usuario) => {
    const peticion = await obtenerAnticipo(id, usuario);
    if (!texto(motivo)) throw new ErrorHttp(400, "Indica el motivo de la anulación.");

    const ref = db.collection(COLECCION).doc(id);
    await db.runTransaction(async (t) => {
        const doc = await t.get(ref);
        const actual = doc.exists ? doc.data() : null;
        const c = actual?.compensaciones.find((x) => x.id === compensacionId);
        if (!c || c.anulada) throw new ErrorHttp(404, "Compensación no encontrada.");
        const esRevisor = [ROLES.ADMIN, ROLES.CONTABILIDAD].includes(usuario.role);
        if (c.registradoPorId !== usuario.uid && !esRevisor) {
            throw new ErrorHttp(403, "Solo quien cargó la factura o Contabilidad pueden anularla.");
        }
        t.update(ref, {
            compensaciones: actual.compensaciones.map((x) =>
                x.id === compensacionId
                    ? { ...x, anulada: true, motivoAnulacion: texto(motivo).slice(0, 500), anuladaPorNombre: usuario.name || usuario.email, fechaAnulacion: ahora() }
                    : x
            ),
            historial: [
                ...(actual.historial || []),
                { accion: "ANULADA", detalle: `Factura ${c.numeroFactura}: ${texto(motivo)}`, usuarioNombre: usuario.name || usuario.email, fecha: ahora() }
            ],
            fechaActualizacion: ahora()
        });
    });
    return obtener(peticion.id, usuario);
};

export const archivoCompensacion = async (id, compensacionId, usuario) => {
    await obtenerAnticipo(id, usuario);
    const expediente = await leerExpediente(id);
    const c = expediente?.compensaciones.find((x) => x.id === compensacionId);
    if (!c) throw new ErrorHttp(404, "Factura no encontrada.");
    const ruta = path.join(CARPETA_EXPEDIENTES, id, path.basename(c.archivo.archivo));
    if (!fs.existsSync(ruta)) throw new ErrorHttp(404, "El archivo ya no está disponible en el servidor.");
    return { ruta, nombre: c.archivo.nombre };
};

// Soporte o comprobante de la petición del anticipo. Solo lectura: usa los
// permisos del expediente (así Compras puede descargarlos aunque no vea la
// petición en el módulo Peticiones).
export const archivoAdjunto = async (id, adjuntoId, usuario) => {
    const peticion = await obtenerAnticipo(id, usuario);
    const adjunto = (peticion.adjuntos || []).find((a) => a.id === adjuntoId);
    if (!adjunto) throw new ErrorHttp(404, "Documento no encontrado.");
    const ruta = path.join(UPLOADS_DIR, "peticiones", id, path.basename(adjunto.archivo));
    if (!fs.existsSync(ruta)) throw new ErrorHttp(404, "El archivo ya no está disponible en el servidor.");
    return { ruta, nombre: adjunto.nombre };
};

// ---------------------------------------------------------------------------
// Solicitud imprimible y descarga del expediente completo (ZIP)
// ---------------------------------------------------------------------------
// Quién puede ver los documentos de una petición: quien la ve en el módulo
// Peticiones (mismo criterio que puedeVer de peticiones.service.js) o, si es
// un anticipo, quien ve su expediente (solicitante, Compras, Contabilidad,
// Admin).
const puedeVerPeticion = (p, usuario) => {
    if (p.solicitanteId === usuario.uid) return true;
    if (p.estado === ESTADOS.BORRADOR) return false;
    if (p.autorizadorId === usuario.uid) return true;
    return [ROLES.CONTABILIDAD, ROLES.ADMIN].includes(usuario.role);
};

const peticionConDocumentos = async (id, usuario) => {
    const peticion = await leerPeticion(id);
    if (!peticion) throw new ErrorHttp(404, "Petición no encontrada.");
    if (puedeVerPeticion(peticion, usuario)) return peticion;
    if (esAnticipoVisible(peticion) && (peticion.solicitanteId === usuario.uid || (await veTodo(usuario)))) return peticion;
    throw new ErrorHttp(404, "Petición no encontrada.");
};

// Datos de la petición para la hoja imprimible (sin rutas de archivos en disco).
export const solicitud = async (id, usuario) => {
    const peticion = await peticionConDocumentos(id, usuario);
    return { ...peticion, adjuntos: (peticion.adjuntos || []).map((a) => ({ ...datosAdjunto(a), categoria: a.categoria })) };
};

// Nombre de archivo válido en Windows (sin \ / : * ? " < > |), sin
// caracteres de control y de largo razonable.
const nombreSeguro = (v, porDefecto = "archivo") => {
    const limpio = texto(v)
        .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
        .replace(/\s+/g, " ")
        .replace(/^[.\s]+|[.\s]+$/g, "")
        .slice(0, 120);
    return limpio || porDefecto;
};

const extension = (nombre) => {
    const m = /\.[A-Za-z0-9]{1,6}$/.exec(texto(nombre));
    return m ? m[0].toLowerCase() : "";
};

// Arma la lista de archivos del ZIP. El controlador la escribe en streaming
// (no se guardan copias en el servidor). Solo peticiones Pagadas.
//   01_Solicitud_<numero>.pdf · 02_Soporte/ · 03_Comprobante_pago/ ·
//   04_Facturas/ (anticipos; las anuladas en 04_Facturas/Anuladas/) · LEEME.txt
export const prepararZip = async (id, usuario) => {
    const peticion = await peticionConDocumentos(id, usuario);
    if (!estaPagada(peticion)) throw new ErrorHttp(409, "El expediente se puede descargar cuando la petición está Pagada.");

    const numero = nombreSeguro(peticion.numero, peticion.id);
    const entradas = [];
    const faltantes = [];
    const usados = new Set();
    const agregarArchivo = (ruta, destino) => {
        let final = destino;
        for (let n = 2; usados.has(final.toLowerCase()); n++) final = destino.replace(/(\.[^./]+)?$/, ` (${n})$1`);
        usados.add(final.toLowerCase());
        if (fs.existsSync(ruta)) entradas.push({ ruta, nombre: final });
        else faltantes.push(final);
        return final;
    };

    entradas.push({ buffer: await generarSolicitudPdf(peticion, usuario.name || usuario.email), nombre: `01_Solicitud_${numero}.pdf` });

    const carpetaPeticion = path.join(UPLOADS_DIR, "peticiones", peticion.id);
    const { soporte, comprobantes } = documentosDe(peticion);
    const original = new Map((peticion.adjuntos || []).map((a) => [a.id, a]));
    const indice = [];

    soporte.forEach((a, i) => {
        const destino = agregarArchivo(
            path.join(carpetaPeticion, path.basename(original.get(a.id).archivo || "")),
            `02_Soporte/${String(i + 1).padStart(2, "0")}_${nombreSeguro(a.nombre)}`
        );
        indice.push(`  ${destino}${faltantes.includes(destino) ? "  (NO DISPONIBLE)" : ""}`);
    });
    comprobantes.forEach((a) => {
        const destino = agregarArchivo(
            path.join(carpetaPeticion, path.basename(original.get(a.id).archivo || "")),
            `03_Comprobante_pago/${nombreSeguro(a.nombre)}`
        );
        indice.push(`  ${destino}${faltantes.includes(destino) ? "  (NO DISPONIBLE)" : ""}`);
    });

    const facturas = esAnticipo(peticion) ? (await leerExpediente(peticion.id))?.compensaciones || [] : [];
    facturas.forEach((c, i) => {
        const carpeta = c.anulada ? "04_Facturas/Anuladas" : "04_Facturas";
        const destino = agregarArchivo(
            path.join(CARPETA_EXPEDIENTES, peticion.id, path.basename(c.archivo?.archivo || "")),
            `${carpeta}/${String(i + 1).padStart(2, "0")}_Factura_${nombreSeguro(c.numeroFactura)}${extension(c.archivo?.nombre)}`
        );
        indice.push(`  ${destino}${faltantes.includes(destino) ? "  (NO DISPONIBLE)" : ""}  (valor ${r2(c.valor).toFixed(2)} ${peticion.moneda || "USD"}${c.anulada ? `, ANULADA: ${texto(c.motivoAnulacion)}` : ""})`);
    });

    const lineas = [
        `Expediente de pago ${peticion.numero || peticion.id}`,
        `Proveedor: ${texto(peticion.proveedorNombre)}`,
        `Solicitante: ${texto(peticion.solicitanteNombre)}`,
        `Pago efectivo: ${r2(montoFinal(peticion) || 0).toFixed(2)} ${peticion.moneda || "USD"}`,
        `Fecha de pago: ${texto(peticion.pago?.fechaPago || peticion.fechaPago)}`,
        `Generado: ${new Date().toLocaleString("es-SV", { timeZone: "America/El_Salvador" })} por ${usuario.name || usuario.email}`,
        "",
        "Contenido:",
        `  01_Solicitud_${numero}.pdf`,
        ...indice
    ];
    if (faltantes.length) {
        lineas.push("", "ATENCIÓN - archivos registrados que ya no están en el servidor (no se incluyeron):", ...faltantes.map((f) => `  ${f}`));
    }
    entradas.push({ buffer: Buffer.from(`\ufeff${lineas.join("\r\n")}\r\n`, "utf8"), nombre: "LEEME.txt" });

    const proveedor = nombreSeguro(peticion.proveedorNombre, "").replace(/\s+/g, "_").slice(0, 40);
    return { nombre: `Expediente_${numero}${proveedor ? `_${proveedor}` : ""}.zip`, entradas };
};

export const historial = async (id, usuario) => {
    await obtenerAnticipo(id, usuario);
    return (await leerExpediente(id))?.historial || [];
};

// ---------------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------------
export const generarExcel = async (usuario, filtros) => {
    const { lista } = await listar(usuario, filtros);
    const libro = new ExcelJS.Workbook();
    const hoja = libro.addWorksheet("Expediente anticipos", { views: [{ state: "frozen", ySplit: 1 }] });
    hoja.columns = [
        { header: "Petición", key: "numero", width: 16 },
        { header: "Fecha de pago", key: "fechaPago", width: 13 },
        { header: "Solicitante", key: "solicitante", width: 22 },
        { header: "Área", key: "area", width: 16 },
        { header: "Proveedor", key: "proveedor", width: 28 },
        { header: "Tipo", key: "tipo", width: 9 },
        { header: "Moneda", key: "moneda", width: 8 },
        { header: "Monto anticipo", key: "anticipo", width: 15 },
        { header: "Compensado", key: "compensado", width: 14 },
        { header: "Saldo pendiente", key: "saldo", width: 15 },
        { header: "Excedente", key: "excedente", width: 12 },
        { header: "Estado", key: "estado", width: 24 },
        { header: "Facturas", key: "facturas", width: 40 }
    ];
    lista.forEach((e) =>
        hoja.addRow({
            numero: e.numero,
            fechaPago: e.fechaPago || "",
            solicitante: e.solicitanteNombre,
            area: e.areaNombre,
            proveedor: e.proveedorNombre,
            tipo: e.tipo === "EXTERIOR" ? "Exterior" : "Local",
            moneda: e.moneda,
            anticipo: e.montoAnticipo,
            compensado: e.compensado,
            saldo: e.saldo,
            excedente: e.excedente,
            estado: ETIQUETAS[e.estado],
            facturas: e.compensaciones.filter((c) => !c.anulada).map((c) => `${c.numeroFactura} (${c.valor.toFixed(2)})`).join(", ")
        })
    );
    ["anticipo", "compensado", "saldo", "excedente"].forEach((k) => (hoja.getColumn(k).numFmt = "#,##0.00"));
    const encabezado = hoja.getRow(1);
    encabezado.eachCell((c) => {
        c.font = { bold: true, color: { argb: "FFFFFFFF" } };
        c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
    });
    hoja.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: hoja.columns.length } };
    return libro.xlsx.writeBuffer();
};
