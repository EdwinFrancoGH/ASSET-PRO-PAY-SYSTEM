import express from "express";
import * as c from "../controllers/cajaChica.controller.js";
import { uploadFacturasCC } from "../middlewares/uploadCajaChica.middleware.js";

// Caja chica. Los permisos se validan en el service porque dependen del
// usuario (solicitante, jefe del área, cajero o administrador).
const router = express.Router();

router.get("/contexto", c.contexto);
router.get("/mias", c.listarMias);
router.get("/aprobaciones", c.aprobaciones);
router.get("/entregas", c.movimientosDelDia);
router.post("/entregas/buscar", c.buscarPorToken);
router.get("/liquidaciones", c.liquidaciones);
router.get("/cuadre", c.cuadre);
router.get("/cuadre/exportar", c.exportarCuadre);
router.get("/fondo", c.obtenerFondo);
router.put("/fondo", c.cambiarFondo);
router.post("/fondo/reponer", c.reponerFondo);
router.get("/cortes", c.listarCortes);
router.post("/cortes", c.registrarCorte);
router.post("/cortes/:dia/reabrir", c.reabrirCorte);
router.post("/", c.crear);
router.get("/:id", c.obtener);
router.post("/:id/anular", c.anular);
router.post("/:id/aprobar", c.aprobar);
router.post("/:id/rechazar", c.rechazar);
router.post("/:id/regenerar-token", c.regenerarToken);
router.post("/:id/entregar", c.entregar);
router.post("/:id/rechazar-caja", c.rechazarEnCaja);
router.post("/:id/liquidacion", uploadFacturasCC, c.enviarLiquidacion);
router.post("/:id/liquidacion/cerrar", c.cerrarLiquidacion);
router.post("/:id/liquidacion/devolver", c.devolverLiquidacion);
router.get("/:id/archivos/:archivoId", c.descargarArchivo);

export default router;
