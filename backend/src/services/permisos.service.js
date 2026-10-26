import { ROLES } from "../config/roles.js";
import { obtenerPorId as obtenerCatalogo } from "./catalogos.service.js";

// Área de Compras: el área del usuario (Usuarios → Área) tiene marcada la
// casilla "Área de Compras" en Catálogos → Áreas. El Administrador siempre
// cuenta como Compras. Habilita proveedores del exterior, Orden ELM, los
// tipos Cliente/Retail/Stock B2B y los planes de pago.
export const esCompras = async (usuario) => {
    if (usuario.role === ROLES.ADMIN) return true;
    const area = await obtenerCatalogo("areas", usuario.areaId);
    return area?.permiteExterior === true;
};
