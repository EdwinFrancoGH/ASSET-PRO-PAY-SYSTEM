// Prepara una base de datos nueva:
//   1. Crea el primer Administrador (no hay auto-registro).
//   2. Carga los términos de pago y monedas iniciales si no existen.
//
// Uso:
//   npm run seed -- admin@empresa.com "ContraseñaSegura" "Nombre Apellido"
import { auth, db } from "../src/config/firebase.js";

const [email, password, name = "Administrador"] = process.argv.slice(2);

if (!email || !password) {
    console.error('Uso: npm run seed -- correo@empresa.com "contraseña" "Nombre"');
    process.exit(1);
}

const TERMINOS = [
    { nombre: "Contado", dias: 0 },
    { nombre: "Anticipo", dias: 0 },
    { nombre: "15 días", dias: 15 },
    { nombre: "30 días", dias: 30 },
    { nombre: "45 días", dias: 45 },
    { nombre: "60 días", dias: 60 },
    { nombre: "90 días", dias: 90 }
];

const crearAdmin = async () => {
    let usuario;
    try {
        usuario = await auth.getUserByEmail(email);
        console.log(`• El usuario ${email} ya existía en Firebase Auth.`);
    } catch {
        usuario = await auth.createUser({ email, password, displayName: name });
        console.log(`• Usuario ${email} creado en Firebase Auth.`);
    }

    await db.collection("usuarios").doc(usuario.uid).set({
        email,
        name,
        role: "Administrador",
        areaId: null,
        activo: true,
        createdAt: new Date().toISOString()
    }, { merge: true });

    console.log("• Rol Administrador asignado.");
};

const cargarTerminos = async () => {
    const existentes = await db.collection("terminosPago").limit(1).get();
    if (!existentes.empty) {
        console.log("• Los términos de pago ya existían; no se modificaron.");
        return;
    }
    const batch = db.batch();
    const fecha = new Date().toISOString();
    TERMINOS.forEach((t) => batch.set(db.collection("terminosPago").doc(), { ...t, activo: true, fechaRegistro: fecha, fechaActualizacion: fecha }));
    await batch.commit();
    console.log(`• ${TERMINOS.length} términos de pago cargados.`);
};

try {
    await crearAdmin();
    await cargarTerminos();
    console.log("\nListo. Inicia sesión con ese usuario y crea áreas, proveedores y usuarios desde la aplicación.");
    process.exit(0);
} catch (error) {
    console.error("Error en el seed:", error.message);
    process.exit(1);
}
