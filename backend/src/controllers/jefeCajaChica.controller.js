import { db } from "../config/firebase.js";
import { ROLES } from "../config/roles.js";
import { manejar } from "../utils/errores.js";

// PUT /api/catalogos/areas/:id/jefe-caja-chica  { jefeId | null, apruebaJefes? }  (solo Administrador)
// apruebaJefes: los Autorizadores de esta área (Finanzas/Contabilidad)
// aprueban la caja chica cuando quien pide es el jefe de su propia área.
// Define quién aprueba las solicitudes de caja chica del área. Un mismo jefe
// puede asignarse a varias áreas. No pasa por la edición general del
// catálogo, así Contabilidad (que sí edita áreas) no puede cambiarlo.
export const asignarJefeCajaChica = manejar(async (req, res) => {
    const areaRef = db.collection("areas").doc(req.params.id);
    const area = await areaRef.get();
    if (!area.exists) return res.status(404).json({ ok: false, message: "Área no encontrada." });

    const { jefeId, apruebaJefes } = req.body;
    let cambios = { jefeCajaChicaId: null, jefeCajaChicaNombre: null };

    if (jefeId) {
        const jefe = await db.collection("usuarios").doc(jefeId).get();
        if (!jefe.exists) return res.status(400).json({ ok: false, message: "El usuario seleccionado no existe." });
        const datos = jefe.data();
        if (datos.role !== ROLES.AUTORIZADOR) {
            return res.status(400).json({ ok: false, message: "El jefe de caja chica debe tener el rol Autorizador." });
        }
        if (datos.activo === false) {
            return res.status(400).json({ ok: false, message: "El usuario seleccionado está desactivado." });
        }
        cambios = { jefeCajaChicaId: jefe.id, jefeCajaChicaNombre: datos.name || datos.email };
    }

    if (apruebaJefes !== undefined) cambios.apruebaCajaChicaJefes = apruebaJefes === true || apruebaJefes === "true";

    await areaRef.update({ ...cambios, fechaActualizacion: new Date().toISOString() });

    res.json({
        ok: true,
        message: cambios.jefeCajaChicaId
            ? `${cambios.jefeCajaChicaNombre} aprobará la caja chica de ${area.data().nombre}.`
            : `Se quitó el jefe de caja chica de ${area.data().nombre}.`,
        data: { id: area.id, ...cambios }
    });
});
