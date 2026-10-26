import express from "express";
import * as c from "../controllers/planes.controller.js";

// Los permisos (Compras escribe; Compras, Contabilidad y Admin leen) se
// validan en el service, porque dependen del área del usuario.
const router = express.Router();

router.get("/", c.listar);
router.post("/", c.crear);
router.get("/:id", c.obtener);
router.put("/:id", c.modificar);
router.post("/:id/cancelar", c.cancelar);

export default router;
