import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { UPLOADS_DIR } from "./upload.middleware.js";
import { MAX_ARCHIVOS_LIQUIDACION } from "../config/cajaChica.js";

// Facturas de la liquidación de caja chica: UPLOADS_DIR/cajaChica/<id>/.
// Solo PDF o foto. No modifica el middleware de peticiones.
export const CARPETA_CAJA_CHICA = path.join(UPLOADS_DIR, "cajaChica");

const TIPOS = new Map([
    ["application/pdf", ".pdf"],
    ["image/png", ".png"],
    ["image/jpeg", ".jpg"],
    ["image/webp", ".webp"]
]);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(req.params.id || "")) {
            const error = new Error("Solicitud no válida.");
            error.status = 400;
            return cb(error);
        }
        const carpeta = path.join(CARPETA_CAJA_CHICA, req.params.id);
        fs.mkdirSync(carpeta, { recursive: true });
        cb(null, carpeta);
    },
    filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${TIPOS.get(file.mimetype)}`)
});

const fileFilter = (req, file, cb) => {
    file.originalname = Buffer.from(file.originalname, "latin1").toString("utf8");
    if (!TIPOS.has(file.mimetype)) {
        const error = new Error("La factura debe ser PDF o foto (PNG, JPG o WEBP).");
        error.status = 400;
        return cb(error);
    }
    cb(null, true);
};

const subir = multer({
    storage,
    fileFilter,
    limits: { fileSize: (Number(process.env.MAX_FILE_MB) || 10) * 1024 * 1024, files: MAX_ARCHIVOS_LIQUIDACION }
}).array("archivos", MAX_ARCHIVOS_LIQUIDACION);

// Errores de multer → 400 con mensaje claro.
export const uploadFacturasCC = (req, res, next) =>
    subir(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            err.status = 400;
            if (err.code === "LIMIT_FILE_SIZE") err.message = `Cada archivo debe pesar máximo ${Number(process.env.MAX_FILE_MB) || 10} MB.`;
            else if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") err.message = `Máximo ${MAX_ARCHIVOS_LIQUIDACION} archivos por liquidación.`;
        }
        next(err);
    });

// Si la liquidación no se acepta, se borran los archivos recién subidos.
export const borrarSubidos = (files = []) => files.forEach((f) => fs.promises.unlink(f.path).catch(() => {}));
