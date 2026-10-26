import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import usersRoutes from "./routes/users.routes.js";
import catalogosRoutes from "./routes/catalogos.routes.js";
import peticionesRoutes from "./routes/peticiones.routes.js";
import notificacionesRoutes from "./routes/notificaciones.routes.js";
import planesRoutes from "./routes/planes.routes.js";
import expedientesRoutes from "./routes/expedientes.routes.js";
import facturasRoutes from "./routes/facturas.routes.js";
import cajaChicaRoutes from "./routes/cajaChica.routes.js";

import { verifyToken, bloquearSoloCajaChica } from "./middlewares/auth.middleware.js";

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || true,
    // Content-Disposition trae el nombre del Excel y de los adjuntos.
    exposedHeaders: ["Content-Disposition"]
}));
app.use(express.json({ limit: "2mb" }));

// Todas las rutas requieren sesión. No hay auto-registro: los usuarios
// los crea un Administrador desde /usuarios (o el script de seed).
app.use("/api/auth", verifyToken, authRoutes);
app.use("/api/users", verifyToken, usersRoutes);
// bloquearSoloCajaChica: Cajero y Solicitante caja chica no entran a los módulos de pagos.
app.use("/api/catalogos", verifyToken, bloquearSoloCajaChica, catalogosRoutes);
app.use("/api/peticiones", verifyToken, bloquearSoloCajaChica, peticionesRoutes);
app.use("/api/notificaciones", verifyToken, notificacionesRoutes);
app.use("/api/planes", verifyToken, bloquearSoloCajaChica, planesRoutes);
app.use("/api/expedientes", verifyToken, bloquearSoloCajaChica, expedientesRoutes);
app.use("/api/facturas", verifyToken, bloquearSoloCajaChica, facturasRoutes);
// Caja chica: abierta a todos los roles; los permisos se validan en el service.
app.use("/api/caja-chica", verifyToken, cajaChicaRoutes);

app.get("/", (req, res) => {
    res.json({ mensaje: "ASSET PRO - Peticiones de Pago API funcionando" });
});

// Errores no controlados (incluye los de multer: archivo muy grande o
// tipo no permitido).
app.use((err, req, res, next) => {
    if (err?.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ ok: false, message: `El archivo supera el máximo de ${process.env.MAX_FILE_MB || 10} MB.` });
    }
    if (err?.status) {
        return res.status(err.status).json({ ok: false, message: err.message });
    }
    console.error(err);
    res.status(500).json({ ok: false, message: "Error interno del servidor.", error: err?.message });
});

export default app;
