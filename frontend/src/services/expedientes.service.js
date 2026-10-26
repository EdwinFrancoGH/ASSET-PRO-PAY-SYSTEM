import api from "./api";

const limpiar = (f) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== "" && v !== null && v !== undefined));

// Expediente de anticipos (id = id de la petición del anticipo).
export const obtenerExpedientes = (filtros = {}) => api.get("/expedientes", { params: limpiar(filtros) });
export const obtenerExpediente = (id) => api.get(`/expedientes/${id}`);
export const obtenerHistorialExpediente = (id) => api.get(`/expedientes/${id}/historial`);
export const exportarExpedientes = (filtros = {}) => api.get("/expedientes/exportar", { params: limpiar(filtros), responseType: "blob" });

export const compensarAnticipo = (id, { numeroFactura, fechaFactura, valor, comentario, archivo }) => {
    const datos = new FormData();
    datos.append("numeroFactura", numeroFactura);
    datos.append("fechaFactura", fechaFactura);
    datos.append("valor", valor);
    datos.append("comentario", comentario || "");
    datos.append("archivo", archivo);
    return api.post(`/expedientes/${id}/compensaciones`, datos);
};

export const anularCompensacion = (id, compensacionId, motivo) =>
    api.post(`/expedientes/${id}/compensaciones/${compensacionId}/anular`, { motivo });

export const descargarFacturaCompensacion = (id, compensacionId) =>
    api.get(`/expedientes/${id}/compensaciones/${compensacionId}/archivo`, { responseType: "blob" });

// Soporte o comprobante de pago de la petición, con los permisos del expediente.
export const descargarAdjuntoExpediente = (id, adjuntoId) =>
    api.get(`/expedientes/${id}/adjuntos/${adjuntoId}`, { responseType: "blob" });

// Datos de la petición para la hoja imprimible (cuando el usuario ve el
// expediente pero no la petición, ej. Compras).
export const obtenerSolicitudExpediente = (id) => api.get(`/expedientes/${id}/solicitud`);

// ZIP con solicitud, soporte, comprobante y facturas (solo peticiones Pagadas).
export const descargarExpedienteZip = (id) => api.get(`/expedientes/${id}/descargar`, { responseType: "blob" });
