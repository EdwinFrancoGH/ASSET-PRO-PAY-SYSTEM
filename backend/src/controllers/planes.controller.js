import * as servicio from "../services/planes.service.js";
import { manejar } from "../utils/errores.js";

// GET /api/planes?estado=&proveedorId=&q=
export const listar = manejar(async (req, res) => {
    res.json({ ok: true, data: await servicio.listar(req.usuario, req.query) });
});

// GET /api/planes/:id
export const obtener = manejar(async (req, res) => {
    res.json({ ok: true, data: await servicio.obtener(req.params.id, req.usuario) });
});

// POST /api/planes
export const crear = manejar(async (req, res) => {
    const data = await servicio.crear(req.body, req.usuario);
    res.status(201).json({ ok: true, message: `Plan ${data.numero} creado.`, data });
});

// PUT /api/planes/:id   { montoTotal, cuotas, concepto?, motivo }
export const modificar = manejar(async (req, res) => {
    const data = await servicio.modificar(req.params.id, req.body, req.usuario);
    res.json({ ok: true, message: `Términos actualizados (versión ${data.version}).`, data });
});

// POST /api/planes/:id/cancelar   { motivo }
export const cancelar = manejar(async (req, res) => {
    const data = await servicio.cancelar(req.params.id, req.body, req.usuario);
    res.json({ ok: true, message: `Plan ${data.numero} cancelado.`, data });
});
