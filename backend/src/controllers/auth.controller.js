import { esCompras } from "../services/permisos.service.js";
import { esJefeCajaChica, esFinanzasCajaChica } from "../services/cajaChica.service.js";
import { manejar } from "../utils/errores.js";

// GET /api/auth/me — datos del usuario logueado (rol, nombre, área).
// El frontend lo usa en AuthContext en lugar de leer Firestore directo,
// así las reglas de Firestore pueden quedar cerradas: solo el backend
// (Firebase Admin) lee y escribe la base de datos.
// esCompras: el área del usuario está marcada como "Área de Compras" (o es
// Administrador); habilita el menú "Planes de pago".
// esJefeCajaChica: es jefe de caja chica de al menos un área; habilita el
// menú "Aprobaciones caja chica". esFinanzasCajaChica: Autorizador de un área de
// Finanzas; ve "Cuadre de caja" en solo lectura.
export const me = manejar(async (req, res) => {
    const { uid, email, name, role, areaId, photoURL } = req.usuario;
    res.json({
        ok: true,
        data: { uid, email, name, role, areaId: areaId || null, photoURL: photoURL || null, esCompras: await esCompras(req.usuario), esJefeCajaChica: await esJefeCajaChica(req.usuario), esFinanzasCajaChica: await esFinanzasCajaChica(req.usuario) }
    });
});
