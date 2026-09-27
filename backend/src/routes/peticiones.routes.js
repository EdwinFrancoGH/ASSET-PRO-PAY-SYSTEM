import express from "express";
import * as c from "../controllers/peticiones.controller.js";
import { verifyRoles } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";
import { ROLES } from "../config/roles.js";

const router = express.Router();

// Rutas fijas antes de /:id
router.get("/pendientes", c.pendientes);
router.get("/exportar", verifyRoles(ROLES.CONTABILIDAD, ROLES.ADMIN), c.exportar);

router.get("/", c.listar);
router.post("/", c.crear);
router.get("/:id", c.obtener);
router.put("/:id", c.actualizar);
router.delete("/:id", c.eliminar);

// Flujo
router.post("/:id/enviar", c.enviar);
router.post("/:id/autorizacion", verifyRoles(ROLES.AUTORIZADOR), c.autorizar);
router.post("/:id/contabilidad", verifyRoles(ROLES.CONTABILIDAD), c.revisionContable);
router.post("/:id/pago", verifyRoles(ROLES.CONTABILIDAD), upload.single("comprobante"), c.pagar);

// Adjuntos
router.post("/:id/adjuntos", upload.array("archivos", 10), c.subirAdjuntos);
router.get("/:id/adjuntos/:adjuntoId", c.descargarAdjunto);
router.delete("/:id/adjuntos/:adjuntoId", c.borrarAdjunto);

export default router;
