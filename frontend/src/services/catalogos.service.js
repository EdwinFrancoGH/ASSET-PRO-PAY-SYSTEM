import api from "./api";

// catalogo: "areas" | "terminos-pago" | "proveedores"
export const obtenerCatalogo = (catalogo, soloActivos = false) =>
    api.get(`/catalogos/${catalogo}`, { params: soloActivos ? { activos: "true" } : {} });

export const crearEnCatalogo = (catalogo, datos) => api.post(`/catalogos/${catalogo}`, datos);

export const actualizarEnCatalogo = (catalogo, id, datos) => api.put(`/catalogos/${catalogo}/${id}`, datos);

export const eliminarDeCatalogo = (catalogo, id) => api.delete(`/catalogos/${catalogo}/${id}`);
