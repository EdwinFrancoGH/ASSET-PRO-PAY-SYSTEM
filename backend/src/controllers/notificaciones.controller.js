import { obtenerDeUsuario, marcarLeida, marcarTodasLeidas } from "../services/notificaciones.service.js";
import { manejar } from "../utils/errores.js";

export const listar = manejar(async (req, res) => {
    const limite = Math.min(Number(req.query.limite) || 50, 200);
    const data = await obtenerDeUsuario(req.usuario.uid, limite);
    res.json({ ok: true, data });
});

export const leer = manejar(async (req, res) => {
    const ok = await marcarLeida(req.usuario.uid, req.params.id);
    if (!ok) return res.status(404).json({ ok: false, message: "Notificación no encontrada." });
    res.json({ ok: true });
});

export const leerTodas = manejar(async (req, res) => {
    const total = await marcarTodasLeidas(req.usuario.uid);
    res.json({ ok: true, data: { actualizadas: total } });
});
