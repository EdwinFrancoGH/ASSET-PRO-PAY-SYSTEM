import express from "express";
import * as c from "../controllers/expedientes.controller.js";
import { uploadFactura } from "../middlewares/uploadExpediente.middleware.js";

// Expediente de anticipos. Los permisos se validan en el service.
const router = express.Router();

router.get("/", c.listar);
router.get("/exportar", c.exportar);
router.get("/:id", c.obtener);
router.get("/:id/historial", c.historial);
router.post("/:id/compensaciones", uploadFactura.single("archivo"), c.compensar);
router.post("/:id/compensaciones/:compensacionId/anular", c.anular);
router.get("/:id/compensaciones/:compensacionId/archivo", c.descargar);
router.get("/:id/adjuntos/:adjuntoId", c.descargarAdjunto);
router.get("/:id/solicitud", c.solicitud);
router.get("/:id/descargar", c.descargarZip);

export default router;
