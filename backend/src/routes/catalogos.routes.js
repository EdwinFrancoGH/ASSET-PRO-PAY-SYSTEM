import express from "express";
import { listar, crearRegistro, actualizarRegistro, eliminarRegistro } from "../controllers/catalogos.controller.js";
import { verifyRoles } from "../middlewares/auth.middleware.js";
import { ROLES } from "../config/roles.js";

const router = express.Router();

// Cualquier usuario autenticado puede leer (los necesita el formulario).
router.get("/:catalogo", listar);

// Solo Administrador y Contabilidad mantienen los catálogos.
const GESTION = verifyRoles(ROLES.ADMIN, ROLES.CONTABILIDAD);

router.post("/:catalogo", GESTION, crearRegistro);
router.put("/:catalogo/:id", GESTION, actualizarRegistro);
router.delete("/:catalogo/:id", GESTION, eliminarRegistro);

export default router;
