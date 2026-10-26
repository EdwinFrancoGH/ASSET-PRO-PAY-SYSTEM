import db from "../config/firebase.js";
import { enviarCorreo, construirHtmlAviso } from "../utils/mailer.js";
import { ETIQUETAS_ESTADO } from "../config/estados.js";

const COLECCION = "notificaciones";

const formatoMonto = (monto, moneda) =>
    `${moneda || "USD"} ${Number(monto || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Obtiene los usuarios activos de un rol (ej. todo Contabilidad).
export const obtenerUsuariosPorRol = async (rol) => {
    const snapshot = await db.collection("usuarios").where("role", "==", rol).get();
    return snapshot.docs
        .map((doc) => ({ uid: doc.id, ...doc.data() }))
        .filter((u) => u.activo !== false);
};

// Crea una notificación en la app para cada usuario y, si enviarEmail es
// true, les manda el aviso por correo. Se llama DESPUÉS de guardar el
// cambio de estado; si algo falla aquí, solo se registra en consola.
// enlace (opcional): ruta de la app a la que lleva la notificación (ej. caja
// chica). Si no se indica, se usa la petición como siempre.
export const notificar = async ({ usuarioIds, titulo, mensaje, peticion, enviarEmail = true, enlace = null }) => {
    try {
        const ids = [...new Set((usuarioIds || []).filter(Boolean))];
        if (ids.length === 0) return;

        const fecha = new Date().toISOString();
        const batch = db.batch();

        ids.forEach((usuarioId) => {
            const ref = db.collection(COLECCION).doc();
            batch.set(ref, {
                usuarioId,
                titulo,
                mensaje,
                peticionId: peticion?.id || null,
                peticionNumero: peticion?.numero || null,
                enlace: enlace || null,
                leida: false,
                fecha
            });
        });

        await batch.commit();

        if (!enviarEmail) return;

        const usuarios = await Promise.all(ids.map((id) => db.collection("usuarios").doc(id).get()));
        const correos = usuarios.filter((d) => d.exists).map((d) => d.data().email);

        const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";

        await enviarCorreo({
            para: correos,
            asunto: `ASSET PRO · ${titulo}${peticion?.numero ? ` (${peticion.numero})` : ""}`,
            html: construirHtmlAviso({
                titulo,
                mensaje,
                enlace: enlace ? `${baseUrl}${enlace}` : peticion?.id ? `${baseUrl}/peticiones/${peticion.id}` : null,
                detalle: peticion ? [
                    ["Número", peticion.numero],
                    ["Estado", ETIQUETAS_ESTADO[peticion.estado]],
                    ["Solicitante", peticion.solicitanteNombre],
                    ["Proveedor", peticion.proveedorNombre],
                    ["Monto a pagar", formatoMonto(peticion.montoPagar, peticion.moneda)]
                ] : []
            })
        });
    } catch (error) {
        console.error("[notificaciones] No se pudo notificar:", error.message);
    }
};

export const obtenerDeUsuario = async (usuarioId, limite = 50) => {
    const snapshot = await db.collection(COLECCION).where("usuarioId", "==", usuarioId).get();

    // Se ordena en memoria para no requerir un índice compuesto en Firestore.
    const todas = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => b.fecha.localeCompare(a.fecha));

    return {
        noLeidas: todas.filter((n) => !n.leida).length,
        notificaciones: todas.slice(0, limite)
    };
};

export const marcarLeida = async (usuarioId, id) => {
    const ref = db.collection(COLECCION).doc(id);
    const doc = await ref.get();

    if (!doc.exists || doc.data().usuarioId !== usuarioId) return false;

    await ref.update({ leida: true });
    return true;
};

export const marcarTodasLeidas = async (usuarioId) => {
    const snapshot = await db.collection(COLECCION)
        .where("usuarioId", "==", usuarioId)
        .where("leida", "==", false)
        .get();

    // Firestore limita un batch a 500 operaciones.
    for (let i = 0; i < snapshot.docs.length; i += 450) {
        const batch = db.batch();
        snapshot.docs.slice(i, i + 450).forEach((doc) => batch.update(doc.ref, { leida: true }));
        await batch.commit();
    }

    return snapshot.size;
};
