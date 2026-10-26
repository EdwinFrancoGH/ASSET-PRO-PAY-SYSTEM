// Única fuente de verdad de los roles del sistema. El frontend tiene una
// copia equivalente en src/utils/roles.js.
export const ROLES = {
    ADMIN: "Administrador",
    EMPLEADO: "Empleado",
    AUTORIZADOR: "Autorizador",
    CONTABILIDAD: "Contabilidad",
    // Caja chica: solo entrega efectivo con token. No usa el resto del sistema.
    CAJERO: "Cajero",
    // Solo pide caja chica; no ve ni usa los módulos de pagos.
    SOLICITANTE_CC: "Solicitante caja chica"
};

// Roles que solo trabajan en Caja chica (menú y APIs restringidos).
export const ROLES_SOLO_CAJA_CHICA = [ROLES.CAJERO, ROLES.SOLICITANTE_CC];

export const LISTA_ROLES = Object.values(ROLES);
