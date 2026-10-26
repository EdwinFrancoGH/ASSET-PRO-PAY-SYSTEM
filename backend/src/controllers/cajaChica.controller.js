import * as servicio from "../services/cajaChica.service.js";
import { manejar } from "../utils/errores.js";
import { borrarSubidos } from "../middlewares/uploadCajaChica.middleware.js";
import { generarExcelCuadre } from "../services/cajaChicaExcel.service.js";

// GET /api/caja-chica/contexto → área, jefe, solicitud abierta y si puede crear
export const contexto = manejar(async (req, res) => {
    res.json({ ok: true, data: await servicio.contexto(req.usuario) });
});

// GET /api/caja-chica/mias
export const listarMias = manejar(async (req, res) => {
    res.json({ ok: true, data: await servicio.listarMias(req.usuario) });
});

// GET /api/caja-chica/:id
export const obtener = manejar(async (req, res) => {
    res.json({ ok: true, data: await servicio.obtener(req.params.id, req.usuario) });
});

// POST /api/caja-chica   { monto, concepto }
export const crear = manejar(async (req, res) => {
    const data = await servicio.crear(req.body, req.usuario);
    res.status(201).json({ ok: true, message: `Solicitud ${data.numero} enviada a ${data.jefeNombre} para su aprobación.`, data });
});

// POST /api/caja-chica/:id/anular   { motivo? }
export const anular = manejar(async (req, res) => {
    const data = await servicio.anular(req.params.id, req.body?.motivo, req.usuario);
    res.json({ ok: true, message: `Solicitud ${data.numero} anulada.`, data });
});

// GET /api/caja-chica/aprobaciones (jefe: sus áreas; Admin: todas)
export const aprobaciones = manejar(async (req, res) => {
    res.json({ ok: true, data: await servicio.aprobaciones(req.usuario) });
});

// POST /api/caja-chica/:id/aprobar   { comentario? }
export const aprobar = manejar(async (req, res) => {
    const data = await servicio.aprobar(req.params.id, req.body?.comentario, req.usuario);
    res.json({ ok: true, message: `Solicitud ${data.numero} aprobada. Se envió el token a ${data.solicitanteNombre}.`, data });
});

// POST /api/caja-chica/:id/rechazar   { motivo }
export const rechazar = manejar(async (req, res) => {
    const data = await servicio.rechazar(req.params.id, req.body?.motivo, req.usuario);
    res.json({ ok: true, message: `Solicitud ${data.numero} rechazada.`, data });
});

// POST /api/caja-chica/:id/regenerar-token
export const regenerarToken = manejar(async (req, res) => {
    const data = await servicio.regenerarToken(req.params.id, req.usuario);
    res.json({ ok: true, message: "Se generó un token nuevo. Vence en 48 horas.", data });
});

// --- Cajero ---

// POST /api/caja-chica/entregas/buscar   { token }
export const buscarPorToken = manejar(async (req, res) => {
    res.json({ ok: true, data: await servicio.buscarPorToken(req.body?.token, req.usuario) });
});

// GET /api/caja-chica/entregas?dia=AAAA-MM-DD
export const movimientosDelDia = manejar(async (req, res) => {
    res.json({ ok: true, data: await servicio.movimientosDelDia(req.query.dia, req.usuario) });
});

// POST /api/caja-chica/:id/entregar   { token }
export const entregar = manejar(async (req, res) => {
    const data = await servicio.entregar(req.params.id, req.body?.token, req.usuario);
    res.json({ ok: true, message: `Entrega de $${data.monto.toFixed(2)} registrada (${data.numero}).`, data });
});

// POST /api/caja-chica/:id/rechazar-caja   { token, motivo }
export const rechazarEnCaja = manejar(async (req, res) => {
    const data = await servicio.rechazarEnCaja(req.params.id, req.body?.token, req.body?.motivo, req.usuario);
    res.json({ ok: true, message: `Solicitud ${data.numero} rechazada en caja.`, data });
});

// --- Liquidación ---

// POST /api/caja-chica/:id/liquidacion   multipart: archivos[], numeroFactura, montoGastado, comentario
export const enviarLiquidacion = async (req, res) => {
    try {
        const data = await servicio.enviarLiquidacion(req.params.id, req.body || {}, req.files, req.usuario);
        res.json({ ok: true, message: `Liquidación de ${data.numero} enviada a caja.`, data });
    } catch (error) {
        borrarSubidos(req.files);
        res.status(error.status || 500).json({ ok: false, message: error.status ? error.message : "Error interno del servidor." });
        if (!error.status) console.error(error);
    }
};

// GET /api/caja-chica/liquidaciones (Cajero/Admin)
export const liquidaciones = manejar(async (req, res) => {
    res.json({ ok: true, data: await servicio.liquidaciones(req.usuario) });
});

// POST /api/caja-chica/:id/liquidacion/cerrar   { comentario? }
export const cerrarLiquidacion = manejar(async (req, res) => {
    const data = await servicio.cerrarLiquidacion(req.params.id, req.body?.comentario, req.usuario);
    res.json({ ok: true, message: `Liquidación de ${data.numero} cerrada.`, data });
});

// POST /api/caja-chica/:id/liquidacion/devolver   { motivo }
export const devolverLiquidacion = manejar(async (req, res) => {
    const data = await servicio.devolverLiquidacion(req.params.id, req.body?.motivo, req.usuario);
    res.json({ ok: true, message: `Liquidación de ${data.numero} devuelta al solicitante.`, data });
});

// GET /api/caja-chica/:id/archivos/:archivoId
export const descargarArchivo = manejar(async (req, res) => {
    const { ruta, archivo } = await servicio.archivoLiquidacion(req.params.id, req.params.archivoId, req.usuario);
    res.download(ruta, archivo.nombre);
});

// --- Cuadre diario ---

// GET /api/caja-chica/cuadre?dia=AAAA-MM-DD
export const cuadre = manejar(async (req, res) => {
    res.json({ ok: true, data: await servicio.cuadreDelDia(req.query.dia, req.usuario) });
});

// GET /api/caja-chica/cuadre/exportar?dia=AAAA-MM-DD → .xlsx
export const exportarCuadre = manejar(async (req, res) => {
    const cuadre = await servicio.cuadreDelDia(req.query.dia, req.usuario);
    const buffer = await generarExcelCuadre(cuadre, { generadoPor: req.usuario.name || req.usuario.email });
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="cuadre-caja-chica-${cuadre.dia}.xlsx"`);
    res.send(Buffer.from(buffer));
});

// --- Fondo y corte de caja ---

// GET /api/caja-chica/fondo
export const obtenerFondo = manejar(async (req, res) => {
    res.json({ ok: true, data: await servicio.obtenerFondo(req.usuario) });
});

// PUT /api/caja-chica/fondo   { montoFondo, motivo } (Admin)
export const cambiarFondo = manejar(async (req, res) => {
    const data = await servicio.cambiarFondo(req.body || {}, req.usuario);
    res.json({ ok: true, message: `Fondo de caja chica actualizado a $${data.montoFondo.toFixed(2)}.`, data });
});

// POST /api/caja-chica/fondo/reponer   { comentario } (Admin)
export const reponerFondo = manejar(async (req, res) => {
    const data = await servicio.reponerFondo(req.body?.comentario, req.usuario);
    res.json({ ok: true, message: `Fondo repuesto. Disponible: $${data.disponible.toFixed(2)}.`, data });
});

// GET /api/caja-chica/cortes
export const listarCortes = manejar(async (req, res) => {
    res.json({ ok: true, data: await servicio.listarCortes(req.usuario) });
});

// POST /api/caja-chica/cortes   { dia?, efectivoContado, observacion }
export const registrarCorte = manejar(async (req, res) => {
    const data = await servicio.registrarCorte(req.body || {}, req.usuario);
    res.status(201).json({ ok: true, message: `Corte de caja del ${data.dia} registrado.`, data });
});

// POST /api/caja-chica/cortes/:dia/reabrir   { motivo } (Admin)
export const reabrirCorte = manejar(async (req, res) => {
    const data = await servicio.reabrirCorte(req.params.dia, req.body?.motivo, req.usuario);
    res.json({ ok: true, message: `Caja del ${data.id} reabierta. El cajero debe volver a cortar al terminar.`, data });
});
