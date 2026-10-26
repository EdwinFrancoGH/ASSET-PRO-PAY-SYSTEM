// Copia de backend/src/config/roles.js
export const ROLES = {
    ADMIN: "Administrador",
    EMPLEADO: "Empleado",
    AUTORIZADOR: "Autorizador",
    CONTABILIDAD: "Contabilidad",
    CAJERO: "Cajero",
    SOLICITANTE_CC: "Solicitante caja chica"
};

export const LISTA_ROLES = [ROLES.EMPLEADO, ROLES.AUTORIZADOR, ROLES.CONTABILIDAD, ROLES.CAJERO, ROLES.SOLICITANTE_CC, ROLES.ADMIN];

// Roles que solo trabajan en Caja chica: menú restringido y, si abren otra
// ruta, se les lleva a su pantalla de inicio.
export const ROLES_SOLO_CAJA_CHICA = [ROLES.CAJERO, ROLES.SOLICITANTE_CC];
export const INICIO_CAJA_CHICA = {
    [ROLES.CAJERO]: "/caja-chica/entregas",
    [ROLES.SOLICITANTE_CC]: "/caja-chica/solicitudes"
};
export const RUTAS_CAJA_CHICA = ["/caja-chica", "/notificaciones", "/perfil"];

export const DESCRIPCION_ROLES = {
    Empleado: "Crea y da seguimiento a sus peticiones.",
    Autorizador: "Aprueba o rechaza las peticiones que le asignan.",
    Contabilidad: "Revisa las autorizadas, registra pagos y exporta a Excel.",
    Cajero: "Solo Caja chica: entrega el efectivo con el token de la solicitud. Asígnale el área Contabilidad.",
    "Solicitante caja chica": "Solo Caja chica: pide efectivo (máx. $50) y lo liquida. Debe tener área asignada.",
    Administrador: "Gestiona usuarios y catálogos; ve todas las peticiones."
};

// Texto de bienvenida en Inicio (segunda persona).
export const BIENVENIDA_ROLES = {
    Empleado: "Crea tus peticiones de pago y sigue su avance hasta el pago.",
    Autorizador: "Revisa las peticiones que te asignan y crea las tuyas.",
    Contabilidad: "Revisa las peticiones autorizadas, registra los pagos y exporta a Excel.",
    Cajero: "Ingresa el token de la solicitud y registra la entrega del efectivo.",
    "Solicitante caja chica": "Pide efectivo de caja chica y liquídalo con tu factura.",
    Administrador: "Gestiona usuarios y catálogos, y consulta todas las peticiones."
};
