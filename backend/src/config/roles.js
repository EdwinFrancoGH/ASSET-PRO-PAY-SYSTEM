// Única fuente de verdad de los roles del sistema. El frontend tiene una
// copia equivalente en src/utils/roles.js.
export const ROLES = {
    ADMIN: "Administrador",
    EMPLEADO: "Empleado",
    AUTORIZADOR: "Autorizador",
    CONTABILIDAD: "Contabilidad"
};

export const LISTA_ROLES = Object.values(ROLES);
