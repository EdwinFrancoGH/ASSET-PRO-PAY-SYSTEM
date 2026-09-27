import fs from "fs";
import * as servicio from "../services/peticiones.service.js";
import { generarExcel } from "../services/exportar.service.js";
import { validarPeticion, validarDecision, validarPago } from "../validators/peticion.validator.js";
import { manejar, ErrorHttp } from "../utils/errores.js";

const validar = (error) => {
    if (error) throw new ErrorHttp(400, error);
};

// GET /api/peticiones
export const listar = manejar(async (req, res) => {
    const data = await servicio.listar(req.usuario, req.query);
    res.json({ ok: true, data });
});

// GET /api/peticiones/pendientes
export const pendientes = manejar(async (req, res) => {
    const data = await servicio.pendientes(req.usuario);
    res.json({ ok: true, data });
});

// GET /api/peticiones/exportar (Contabilidad / Admin) → .xlsx
export const exportar = manejar(async (req, res) => {
    const peticiones = await servicio.listar(req.usuario, req.query);
    const buffer = await generarExcel(peticiones, { generadoPor: req.usuario.name || req.usuario.email });
    const nombre = `peticiones-pago-${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
    res.send(Buffer.from(buffer));
});

// GET /api/peticiones/:id
export const obtener = manejar(async (req, res) => {
    const data = await servicio.obtenerDetalle(req.params.id, req.usuario);
    res.json({ ok: true, data });
});

// POST /api/peticiones   (crea en borrador)
export const crear = manejar(async (req, res) => {
    validar(validarPeticion(req.body));
    const data = await servicio.crear(req.body, req.usuario);
    res.status(201).json({ ok: true, message: `Petición ${data.numero} guardada como borrador.`, data });
});

// PUT /api/peticiones/:id
export const actualizar = manejar(async (req, res) => {
    validar(validarPeticion(req.body));
    const data = await servicio.actualizar(req.params.id, req.body, req.usuario);
    res.json({ ok: true, message: "Petición actualizada.", data });
});

// DELETE /api/peticiones/:id
export const eliminar = manejar(async (req, res) => {
    await servicio.eliminar(req.params.id, req.usuario);
    res.json({ ok: true, message: "Borrador eliminado." });
});

// POST /api/peticiones/:id/enviar
export const enviar = manejar(async (req, res) => {
    const data = await servicio.enviar(req.params.id, req.usuario);
    res.json({ ok: true, message: `Petición ${data.numero} enviada a ${data.autorizadorNombre}.`, data });
});

// POST /api/peticiones/:id/autorizacion   { decision, comentario }
export const autorizar = manejar(async (req, res) => {
    validar(validarDecision(req.body));
    const data = await servicio.decidirAutorizador(req.params.id, req.usuario, req.body);
    res.json({ ok: true, message: req.body.decision === "aprobar" ? "Petición autorizada." : "Petición rechazada.", data });
});

// POST /api/peticiones/:id/contabilidad   { decision, comentario }
export const revisionContable = manejar(async (req, res) => {
    validar(validarDecision(req.body));
    const data = await servicio.decidirContabilidad(req.params.id, req.usuario, req.body);
    res.json({ ok: true, message: req.body.decision === "aprobar" ? "Petición aprobada para pago." : "Petición rechazada.", data });
});

// POST /api/peticiones/:id/pago   multipart: comprobante + fechaPago, referencia, comentario
export const pagar = manejar(async (req, res) => {
    const error = validarPago(req.body);
    if (error) {
        if (req.file) fs.rm(req.file.path, { force: true }, () => {});
        throw new ErrorHttp(400, error);
    }
    const data = await servicio.registrarPago(req.params.id, req.usuario, req.body, req.file);
    res.json({ ok: true, message: `Pago de ${data.numero} registrado.`, data });
});

// POST /api/peticiones/:id/adjuntos   multipart: archivos[]
export const subirAdjuntos = manejar(async (req, res) => {
    if (!req.files?.length) throw new ErrorHttp(400, "No se recibió ningún archivo.");
    const data = await servicio.agregarAdjuntos(req.params.id, req.usuario, req.files);
    res.status(201).json({ ok: true, message: "Adjuntos guardados.", data });
});

// DELETE /api/peticiones/:id/adjuntos/:adjuntoId
export const borrarAdjunto = manejar(async (req, res) => {
    const data = await servicio.eliminarAdjunto(req.params.id, req.params.adjuntoId, req.usuario);
    res.json({ ok: true, message: "Adjunto eliminado.", data });
});

// GET /api/peticiones/:id/adjuntos/:adjuntoId
export const descargarAdjunto = manejar(async (req, res) => {
    const { ruta, adjunto } = await servicio.obtenerArchivoAdjunto(req.params.id, req.params.adjuntoId, req.usuario);
    res.download(ruta, adjunto.nombre);
});
