import nodemailer from "nodemailer";

// Mismo enfoque que VetCare: si SMTP no está configurado, el flujo sigue
// funcionando (las notificaciones dentro de la app se guardan igual) y
// solo se omite el envío del correo.
let transportadorCache;

function obtenerTransportador() {
    if (transportadorCache !== undefined) return transportadorCache;

    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

    if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
        transportadorCache = null;
        return transportadorCache;
    }

    const puerto = Number(SMTP_PORT) || 587;

    transportadorCache = nodemailer.createTransport({
        host: SMTP_HOST,
        port: puerto,
        secure: puerto === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS }
    });

    return transportadorCache;
}

const escapar = (texto = "") =>
    String(texto).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export function construirHtmlAviso({ titulo, mensaje, enlace, detalle = [] }) {
    const filas = detalle
        .filter(([, valor]) => valor !== undefined && valor !== null && valor !== "")
        .map(([etiqueta, valor]) => `
            <tr>
                <td style="padding:6px 0;color:#64748b;width:40%;">${escapar(etiqueta)}</td>
                <td style="padding:6px 0;color:#0f172a;font-weight:600;">${escapar(valor)}</td>
            </tr>`)
        .join("");

    return `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e293b;">
            <div style="background:#0f172a;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0;">
                <div style="font-size:18px;font-weight:bold;">ASSET PRO</div>
                <div style="font-size:13px;color:#cbd5e1;">Peticiones de pago</div>
            </div>
            <div style="border:1px solid #e2e8f0;border-top:none;padding:24px;border-radius:0 0 12px 12px;">
                <h2 style="margin:0 0 8px;font-size:18px;color:#0f172a;">${escapar(titulo)}</h2>
                <p style="margin:0 0 16px;line-height:1.5;">${escapar(mensaje)}</p>
                ${filas ? `<table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:20px;">${filas}</table>` : ""}
                ${enlace ? `<a href="${enlace}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;">Ver petición</a>` : ""}
                <p style="font-size:12px;color:#94a3b8;margin-top:24px;">Correo automático de ASSET PRO. No respondas a este mensaje.</p>
            </div>
        </div>`;
}

// Nunca lanza: devuelve { enviado, motivo } para que un fallo de correo no
// revierta una aprobación ya guardada.
export const enviarCorreo = async ({ para, asunto, html }) => {
    const destinatarios = (Array.isArray(para) ? para : [para]).filter(Boolean);

    if (destinatarios.length === 0) return { enviado: false, motivo: "SIN_CORREO" };

    const transportador = obtenerTransportador();

    if (!transportador) {
        console.warn("[mailer] SMTP no configurado (ver backend/.env.example) — se omitió el correo:", asunto);
        return { enviado: false, motivo: "SMTP_NO_CONFIGURADO" };
    }

    try {
        await transportador.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: destinatarios.join(","),
            subject: asunto,
            html
        });
        return { enviado: true };
    } catch (error) {
        console.error("[mailer] Error enviando correo:", error.message);
        return { enviado: false, motivo: "ERROR_ENVIO", detalle: error.message };
    }
};
