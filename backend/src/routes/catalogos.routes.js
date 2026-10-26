import express from "express";
import { listar, crearRegistro, actualizarRegistro, eliminarRegistro } from "../controllers/catalogos.controller.js";
import { verifyRoles } from "../middlewares/auth.middleware.js";
import { ROLES } from "../config/roles.js";
import { registrar, agregarCuenta, definirClasificacion } from "../controllers/proveedores.controller.js";
import { asignarJefeCajaChica } from "../controllers/jefeCajaChica.controller.js";

const router = express.Router();

// Cualquier usuario autenticado puede leer (los necesita el formulario).
router.get("/:catalogo", listar);

// Cualquier usuario puede registrar un proveedor (queda "Pendiente SAP") o
// agregarle una cuenta bancaria desde la petición. Del exterior: solo Compras.
router.post("/proveedores/registro", registrar);
router.post("/proveedores/:id/cuentas", agregarCuenta);
router.put("/proveedores/:id/clasificacion", definirClasificacion);

// Caja chica: el jefe que aprueba por área lo asigna solo el Administrador.
router.put("/areas/:id/jefe-caja-chica", verifyRoles(ROLES.ADMIN), asignarJefeCajaChica);

// Solo Administrador y Contabilidad mantienen los catálogos.
const GESTION = verifyRoles(ROLES.ADMIN, ROLES.CONTABILIDAD);

router.post("/:catalogo", GESTION, crearRegistro);
router.put("/:catalogo/:id", GESTION, actualizarRegistro);
router.delete("/:catalogo/:id", GESTION, eliminarRegistro);

export default router;
