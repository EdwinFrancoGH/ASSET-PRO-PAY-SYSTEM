import api from "./api";

export const obtenerPeticiones = (filtros = {}) => api.get("/peticiones", { params: limpiar(filtros) });

export const obtenerPendientes = () => api.get("/peticiones/pendientes");

export const obtenerPeticion = (id) => api.get(`/peticiones/${id}`);

export const crearPeticion = (datos) => api.post("/peticiones", datos);

export const actualizarPeticion = (id, datos) => api.put(`/peticiones/${id}`, datos);

export const eliminarPeticion = (id) => api.delete(`/peticiones/${id}`);

export const enviarPeticion = (id) => api.post(`/peticiones/${id}/enviar`);

export const decidirAutorizacion = (id, decision, comentario) =>
    api.post(`/peticiones/${id}/autorizacion`, { decision, comentario });

export const decidirContabilidad = (id, decision, comentario) =>
    api.post(`/peticiones/${id}/contabilidad`, { decision, comentario });

export const registrarPago = (id, { fechaPago, referencia, comentario, comprobante }) => {
    const datos = new FormData();
    datos.append("fechaPago", fechaPago);
    datos.append("referencia", referencia || "");
    datos.append("comentario", comentario || "");
    datos.append("comprobante", comprobante);
    return api.post(`/peticiones/${id}/pago`, datos);
};

export const subirAdjuntos = (id, archivos) => {
    const datos = new FormData();
    archivos.forEach((a) => datos.append("archivos", a));
    return api.post(`/peticiones/${id}/adjuntos`, datos);
};

export const eliminarAdjunto = (id, adjuntoId) => api.delete(`/peticiones/${id}/adjuntos/${adjuntoId}`);

export const descargarAdjunto = (id, adjuntoId) =>
    api.get(`/peticiones/${id}/adjuntos/${adjuntoId}`, { responseType: "blob" });

export const exportarExcel = (filtros = {}) =>
    api.get("/peticiones/exportar", { params: limpiar(filtros), responseType: "blob" });

function limpiar(filtros) {
    return Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== "" && v !== null && v !== undefined));
}
