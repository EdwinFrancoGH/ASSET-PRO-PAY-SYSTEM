import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { UPLOADS_DIR } from "./upload.middleware.js";

// Facturas que compensan anticipos (módulo Expediente). Se guardan en
// UPLOADS_DIR/expedientes/<idPeticion>/, separadas de los adjuntos de las
// peticiones. Mismos tipos y tamaño máximo que el resto de la aplicación.
const TIPOS_PERMITIDOS = new Map([
    ["application/pdf", ".pdf"],
    ["image/png", ".png"],
    ["image/jpeg", ".jpg"],
    ["image/webp", ".webp"]
]);

export const CARPETA_EXPEDIENTES = path.join(UPLOADS_DIR, "expedientes");

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(req.params.id || "")) {
            const error = new Error("Anticipo no válido.");
            error.status = 400;
            return cb(error);
        }
        const carpeta = path.join(CARPETA_EXPEDIENTES, req.params.id);
        fs.mkdirSync(carpeta, { recursive: true });
        cb(null, carpeta);
    },
    filename: (req, file, cb) => {
        const extension = TIPOS_PERMITIDOS.get(file.mimetype) || path.extname(file.originalname);
        cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${extension}`);
    }
});

const fileFilter = (req, file, cb) => {
    file.originalname = Buffer.from(file.originalname, "latin1").toString("utf8");
    if (!TIPOS_PERMITIDOS.has(file.mimetype)) {
        const error = new Error("La factura debe ser PDF o imagen (PNG, JPG, WEBP).");
        error.status = 400;
        return cb(error);
    }
    cb(null, true);
};

export const uploadFactura = multer({
    storage,
    fileFilter,
    limits: { fileSize: (Number(process.env.MAX_FILE_MB) || 10) * 1024 * 1024 }
});
