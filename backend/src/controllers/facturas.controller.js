import * as servicio from "../services/facturas.service.js";
import { generarExcelFacturas } from "../services/facturasExcel.service.js";
import { manejar } from "../utils/errores.js";

// GET /api/facturas?estado=&tipo=&proveedorId=&q=&desde=&hasta=&diaEntrega=&diaRecepcion=
export const listar = manejar(async (req, res) => {
    res.json({ ok: true, data: await servicio.listar(req.usuario, req.query) });
});

// GET /api/facturas/exportar (mismos filtros) → .xlsx
export const exportar = manejar(async (req, res) => {
    const facturas = await servicio.listar(req.usuario, req.query);
    const buffer = await generarExcelFacturas(facturas, { generadoPor: req.usuario.name || req.usuario.email });
    const nombre = `entrega-facturas-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${nombre}"`);
    res.send(Buffer.from(buffer));
});

// GET /api/facturas/:id
export const obtener = manejar(async (req, res) => {
    res.json({ ok: true, data: await servicio.obtener(req.params.id, req.usuario) });
});

// POST /api/facturas   { tipo, numeroFactura, proveedorId, montoOC, fechaFactura }
export const crear = manejar(async (req, res) => {
    const data = await servicio.crear(req.body, req.usuario);
    res.status(201).json({ ok: true, message: `Factura ${data.numeroFactura} entregada.`, data });
});

// PUT /api/facturas/:id   (mismos campos + comentario opcional)
export const modificar = manejar(async (req, res) => {
    const data = await servicio.modificar(req.params.id, req.body, req.usuario);
    res.json({ ok: true, message: `Factura ${data.numeroFactura} actualizada.`, data });
});

// DELETE /api/facturas/:id   { motivo? }  → no se borra: queda ELIMINADA
export const eliminar = manejar(async (req, res) => {
    const data = await servicio.eliminar(req.params.id, req.body?.motivo, req.usuario);
    res.json({ ok: true, message: `Factura ${data.numeroFactura} eliminada.`, data });
});

// POST /api/facturas/recibir   { ids: [...], comentario? }
export const recibir = manejar(async (req, res) => {
    const { recibidas, omitidas } = await servicio.recibir(req.body.ids, req.usuario, req.body.comentario);
    const extra = omitidas.length ? ` ${omitidas.length} ya no estaban pendientes y se omitieron.` : "";
    res.json({ ok: true, message: `${recibidas} factura(s) recibida(s).${extra}`, data: { recibidas, omitidas } });
});

// POST /api/facturas/:id/devolver   { motivo }
export const devolver = manejar(async (req, res) => {
    const data = await servicio.devolver(req.params.id, req.body.motivo, req.usuario);
    res.json({ ok: true, message: `Factura ${data.numeroFactura} devuelta a Compras.`, data });
});
