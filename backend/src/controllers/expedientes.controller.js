import archiver from "archiver";
import * as servicio from "../services/expedientes.service.js";
import { manejar } from "../utils/errores.js";

// GET /api/expedientes?estado=&q=  → { resumen, lista }
export const listar = manejar(async (req, res) => {
    res.json({ ok: true, data: await servicio.listar(req.usuario, req.query) });
});

// GET /api/expedientes/exportar → .xlsx
export const exportar = manejar(async (req, res) => {
    const buffer = await servicio.generarExcel(req.usuario, req.query);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="expediente-anticipos-${new Date().toISOString().slice(0, 10)}.xlsx"`);
    res.send(Buffer.from(buffer));
});

// GET /api/expedientes/:id   (id = id de la petición del anticipo)
export const obtener = manejar(async (req, res) => {
    res.json({ ok: true, data: await servicio.obtener(req.params.id, req.usuario) });
});

// GET /api/expedientes/:id/historial
export const historial = manejar(async (req, res) => {
    res.json({ ok: true, data: await servicio.historial(req.params.id, req.usuario) });
});

// POST /api/expedientes/:id/compensaciones  (multipart: archivo, numeroFactura, fechaFactura, valor, comentario)
export const compensar = manejar(async (req, res) => {
    const data = await servicio.compensar(req.params.id, req.body, req.file, req.usuario);
    const mensaje =
        data.estado === "SALDO_PENDIENTE" ? `Factura registrada. Saldo pendiente por compensar: ${data.saldo.toFixed(2)} ${data.moneda}.`
        : data.estado === "EXCEDENTE" ? `Anticipo compensado con excedente de ${data.excedente.toFixed(2)} ${data.moneda}.`
        : "Anticipo compensado.";
    res.status(201).json({ ok: true, message: mensaje, data });
});

// POST /api/expedientes/:id/compensaciones/:compensacionId/anular  { motivo }
export const anular = manejar(async (req, res) => {
    const data = await servicio.anular(req.params.id, req.params.compensacionId, req.body, req.usuario);
    res.json({ ok: true, message: "Factura anulada.", data });
});

// GET /api/expedientes/:id/compensaciones/:compensacionId/archivo
export const descargar = manejar(async (req, res) => {
    const { ruta, nombre } = await servicio.archivoCompensacion(req.params.id, req.params.compensacionId, req.usuario);
    res.download(ruta, nombre);
});

// GET /api/expedientes/:id/adjuntos/:adjuntoId  (soporte o comprobante de la petición)
export const descargarAdjunto = manejar(async (req, res) => {
    const { ruta, nombre } = await servicio.archivoAdjunto(req.params.id, req.params.adjuntoId, req.usuario);
    res.download(ruta, nombre);
});

// GET /api/expedientes/:id/solicitud  (id = id de la petición; cualquier petición)
// Datos para la hoja imprimible cuando el usuario ve el expediente pero no
// la petición (ej. Compras).
export const solicitud = manejar(async (req, res) => {
    res.json({ ok: true, data: await servicio.solicitud(req.params.id, req.usuario) });
});

// GET /api/expedientes/:id/descargar  → ZIP con solicitud, soporte,
// comprobante y facturas. Se arma en streaming, sin guardar copias.
export const descargarZip = manejar(async (req, res) => {
    const { nombre, entradas } = await servicio.prepararZip(req.params.id, req.usuario);

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${nombre.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(nombre)}`);

    const zip = archiver("zip", { zlib: { level: 6 } });
    zip.on("warning", (error) => console.warn("ZIP expediente:", error.message));
    zip.on("error", (error) => {
        console.error("ZIP expediente:", error);
        res.destroy(error);
    });
    zip.pipe(res);
    for (const e of entradas) {
        if (e.buffer) zip.append(e.buffer, { name: e.nombre });
        else zip.file(e.ruta, { name: e.nombre });
    }
    await zip.finalize();
});
