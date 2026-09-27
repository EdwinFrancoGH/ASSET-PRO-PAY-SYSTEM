// Copia de backend/src/config/roles.js
export const ROLES = {
    ADMIN: "Administrador",
    EMPLEADO: "Empleado",
    AUTORIZADOR: "Autorizador",
    CONTABILIDAD: "Contabilidad"
};

export const LISTA_ROLES = [ROLES.EMPLEADO, ROLES.AUTORIZADOR, ROLES.CONTABILIDAD, ROLES.ADMIN];

export const DESCRIPCION_ROLES = {
    Empleado: "Crea y da seguimiento a sus peticiones.",
    Autorizador: "Aprueba o rechaza las peticiones que le asignan.",
    Contabilidad: "Revisa las autorizadas, registra pagos y exporta a Excel.",
    Administrador: "Gestiona usuarios y catálogos; ve todas las peticiones."
};

// Texto de bienvenida en Inicio (segunda persona).
export const BIENVENIDA_ROLES = {
    Empleado: "Crea tus peticiones de pago y sigue su avance hasta el pago.",
    Autorizador: "Revisa las peticiones que te asignan y crea las tuyas.",
    Contabilidad: "Revisa las peticiones autorizadas, registra los pagos y exporta a Excel.",
    Administrador: "Gestiona usuarios y catálogos, y consulta todas las peticiones."
};
