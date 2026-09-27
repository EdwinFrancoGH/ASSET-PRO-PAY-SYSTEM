// Error con código HTTP. Los services lo lanzan (ej. 403 si alguien intenta
// aprobar una petición que no le toca) y el controlador lo traduce a la
// respuesta { ok: false, message } de siempre.
export class ErrorHttp extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

// Envuelve un controlador async: cualquier ErrorHttp se responde con su
// status; cualquier otro error, con 500. Evita repetir try/catch en cada
// función del controlador.
export const manejar = (fn) => async (req, res, next) => {
    try {
        await fn(req, res, next);
    } catch (error) {
        if (error instanceof ErrorHttp) {
            return res.status(error.status).json({ ok: false, message: error.message });
        }
        console.error(error);
        res.status(500).json({ ok: false, message: "Error interno del servidor.", error: error.message });
    }
};
