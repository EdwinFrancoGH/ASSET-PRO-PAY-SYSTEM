import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Los adjuntos se guardan en disco del servidor, en
// UPLOADS_DIR/peticiones/<idPeticion>/. Se eligió disco (y no Firebase
// Storage) para que funcione en el plan gratuito de Firebase; si luego se
// migra a Storage/S3, solo cambia este archivo y services/archivos.service.js.
export const UPLOADS_DIR = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.resolve(__dirname, "../../uploads");

const TIPOS_PERMITIDOS = new Map([
    ["application/pdf", ".pdf"],
    ["image/png", ".png"],
    ["image/jpeg", ".jpg"],
    ["image/webp", ".webp"],
    ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"],
    ["application/vnd.ms-excel", ".xls"],
    ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"],
    ["application/msword", ".doc"]
]);

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // El id viene de la URL: se valida para que nadie pueda escribir
        // fuera de la carpeta de uploads (ej. "../").
        if (!/^[A-Za-z0-9_-]{1,64}$/.test(req.params.id || "")) {
            const error = new Error("Petición no válida.");
            error.status = 400;
            return cb(error);
        }
        const carpeta = path.join(UPLOADS_DIR, "peticiones", req.params.id);
        fs.mkdirSync(carpeta, { recursive: true });
        cb(null, carpeta);
    },
    filename: (req, file, cb) => {
        const extension = TIPOS_PERMITIDOS.get(file.mimetype) || path.extname(file.originalname);
        cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${extension}`);
    }
});

const fileFilter = (req, file, cb) => {
    // multer entrega el nombre original en latin1; se corrige para que las
    // tildes y eñes se guarden bien.
    file.originalname = Buffer.from(file.originalname, "latin1").toString("utf8");

    if (!TIPOS_PERMITIDOS.has(file.mimetype)) {
        const error = new Error("Tipo de archivo no permitido. Usa PDF, imagen (PNG/JPG/WEBP), Excel o Word.");
        error.status = 400;
        return cb(error);
    }
    cb(null, true);
};

export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: (Number(process.env.MAX_FILE_MB) || 10) * 1024 * 1024 }
});
