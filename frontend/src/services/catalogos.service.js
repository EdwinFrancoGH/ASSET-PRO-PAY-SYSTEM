import api from "./api";

// catalogo: "areas" | "terminos-pago" | "proveedores"
export const obtenerCatalogo = (catalogo, soloActivos = false) =>
    api.get(`/catalogos/${catalogo}`, { params: soloActivos ? { activos: "true" } : {} });

export const crearEnCatalogo = (catalogo, datos) => api.post(`/catalogos/${catalogo}`, datos);

export const actualizarEnCatalogo = (catalogo, id, datos) => api.put(`/catalogos/${catalogo}/${id}`, datos);

export const eliminarDeCatalogo = (catalogo, id) => api.delete(`/catalogos/${catalogo}/${id}`);

// Cualquier usuario: registrar un proveedor (queda "Pendiente SAP") o
// agregarle una cuenta bancaria desde la petición.
export const registrarProveedor = (datos) => api.post("/catalogos/proveedores/registro", datos);

export const definirClasificacionProveedor = (proveedorId, clasificacion) =>
    api.put(`/catalogos/proveedores/${proveedorId}/clasificacion`, { clasificacion });

// Solo Administrador: jefe que aprueba la caja chica del área (jefeId null = quitar)
// y si los Autorizadores del área aprueban la caja chica de los jefes (Finanzas).
export const asignarJefeCajaChica = (areaId, jefeId, apruebaJefes) =>
    api.put(`/catalogos/areas/${areaId}/jefe-caja-chica`, { jefeId, ...(apruebaJefes !== undefined ? { apruebaJefes } : {}) });

export const agregarCuentaProveedor = (proveedorId, cuenta) => api.post(`/catalogos/proveedores/${proveedorId}/cuentas`, cuenta);
