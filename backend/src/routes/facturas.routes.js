import express from "express";
import * as c from "../controllers/facturas.controller.js";

// Entrega de facturas. Los permisos (Compras registra; Contabilidad y
// Admin reciben o devuelven) se validan en el service, porque dependen
// del área del usuario.
const router = express.Router();

router.get("/", c.listar);
router.get("/exportar", c.exportar);
router.post("/", c.crear);
router.post("/recibir", c.recibir);
router.get("/:id", c.obtener);
router.put("/:id", c.modificar);
router.delete("/:id", c.eliminar);
router.post("/:id/devolver", c.devolver);

export default router;
