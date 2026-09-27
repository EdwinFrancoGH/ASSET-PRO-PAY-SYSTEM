import { auth, db } from "../config/firebase.js";
import { LISTA_ROLES, ROLES } from "../config/roles.js";
import { manejar } from "../utils/errores.js";

const limpiar = (uid, datos) => ({
    uid,
    email: datos.email,
    name: datos.name,
    role: datos.role,
    areaId: datos.areaId || null,
    activo: datos.activo !== false,
    createdAt: datos.createdAt
});

// GET /api/users (Admin)
export const getUsers = manejar(async (req, res) => {
    const snapshot = await db.collection("usuarios").get();
    const data = snapshot.docs
        .map((doc) => limpiar(doc.id, doc.data()))
        .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));
    res.json({ ok: true, data });
});

// GET /api/users/autorizadores (cualquier usuario autenticado): lista para
// el campo "Autoriza" del formulario.
export const getAutorizadores = manejar(async (req, res) => {
    const snapshot = await db.collection("usuarios").where("role", "==", ROLES.AUTORIZADOR).get();
    const data = snapshot.docs
        .map((doc) => ({ uid: doc.id, ...doc.data() }))
        .filter((u) => u.activo !== false && u.uid !== req.usuario.uid) // nadie se autoriza a sí mismo
        .map((u) => ({ uid: u.uid, name: u.name, email: u.email }))
        .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));
    res.json({ ok: true, data });
});

// POST /api/users (Admin)
export const createUser = manejar(async (req, res) => {
    const { email, password, role, name, areaId } = req.body;

    if (!email || !password || !role || !name) {
        return res.status(400).json({ ok: false, message: "Nombre, correo, contraseña y rol son obligatorios." });
    }
    if (!LISTA_ROLES.includes(role)) {
        return res.status(400).json({ ok: false, message: "Rol inválido." });
    }
    if (password.length < 6) {
        return res.status(400).json({ ok: false, message: "La contraseña debe tener al menos 6 caracteres." });
    }

    try {
        const userRecord = await auth.createUser({ email, password, displayName: name });

        const nuevo = {
            email,
            name,
            role,
            areaId: areaId || null,
            activo: true,
            createdAt: new Date().toISOString()
        };

        await db.collection("usuarios").doc(userRecord.uid).set(nuevo);

        res.status(201).json({ ok: true, message: "Usuario creado correctamente.", data: limpiar(userRecord.uid, nuevo) });
    } catch (error) {
        if (error.code === "auth/email-already-exists") {
            return res.status(400).json({ ok: false, message: "Ya existe un usuario con ese correo." });
        }
        throw error;
    }
});

// PUT /api/users/:uid (Admin)
export const updateUser = manejar(async (req, res) => {
    const { uid } = req.params;
    const { email, name, role, password, areaId, activo } = req.body;

    if (!email || !name || !role) {
        return res.status(400).json({ ok: false, message: "Nombre, correo y rol son obligatorios." });
    }
    if (!LISTA_ROLES.includes(role)) {
        return res.status(400).json({ ok: false, message: "Rol inválido." });
    }
    if (req.usuario.uid === uid && (role !== ROLES.ADMIN || activo === false)) {
        return res.status(403).json({ ok: false, message: "No puedes quitarte el rol de Administrador ni desactivarte a ti mismo." });
    }

    const datosAuth = { email, displayName: name, disabled: activo === false };
    if (password) {
        if (password.length < 6) {
            return res.status(400).json({ ok: false, message: "La contraseña debe tener al menos 6 caracteres." });
        }
        datosAuth.password = password;
    }

    await auth.updateUser(uid, datosAuth);

    const cambios = {
        email,
        name,
        role,
        areaId: areaId || null,
        activo: activo !== false,
        updatedAt: new Date().toISOString()
    };

    await db.collection("usuarios").doc(uid).update(cambios);

    res.json({ ok: true, message: "Usuario actualizado correctamente.", data: limpiar(uid, cambios) });
});

// DELETE /api/users/:uid (Admin)
// Recomendado: desactivar en vez de eliminar, para conservar el historial.
export const deleteUser = manejar(async (req, res) => {
    const { uid } = req.params;

    if (req.usuario.uid === uid) {
        return res.status(403).json({ ok: false, message: "No puedes eliminar tu propia cuenta." });
    }

    await auth.deleteUser(uid);
    await db.collection("usuarios").doc(uid).delete();

    res.json({ ok: true, message: "Usuario eliminado correctamente." });
});

// PUT /api/users/profile (cualquier usuario): nombre y contraseña propios.
export const updateProfile = manejar(async (req, res) => {
    const { uid } = req.usuario;
    const { name, password } = req.body;

    if (!name && !password) {
        return res.status(400).json({ ok: false, message: "No hay datos para actualizar." });
    }
    if (password && password.length < 6) {
        return res.status(400).json({ ok: false, message: "La contraseña debe tener al menos 6 caracteres." });
    }

    const datosAuth = {};
    if (name) datosAuth.displayName = name;
    if (password) datosAuth.password = password;
    await auth.updateUser(uid, datosAuth);

    if (name) {
        await db.collection("usuarios").doc(uid).update({ name, updatedAt: new Date().toISOString() });
    }

    res.json({ ok: true, message: "Perfil actualizado correctamente." });
});
