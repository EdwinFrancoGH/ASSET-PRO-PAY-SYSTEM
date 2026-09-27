import express from "express";
import { listar, leer, leerTodas } from "../controllers/notificaciones.controller.js";

const router = express.Router();

router.get("/", listar);
router.patch("/leer-todas", leerTodas); // antes de /:id
router.patch("/:id/leida", leer);

export default router;
