// GET /api/auth/me — datos del usuario logueado (rol, nombre, área).
// El frontend lo usa en AuthContext en lugar de leer Firestore directo,
// así las reglas de Firestore pueden quedar cerradas: solo el backend
// (Firebase Admin) lee y escribe la base de datos.
export const me = (req, res) => {
    const { uid, email, name, role, areaId, photoURL } = req.usuario;
    res.json({ ok: true, data: { uid, email, name, role, areaId: areaId || null, photoURL: photoURL || null } });
};
