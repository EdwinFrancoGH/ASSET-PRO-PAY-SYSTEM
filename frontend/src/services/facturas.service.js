import api from "./api";

const limpiar = (f) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== "" && v !== null && v !== undefined));

export const obtenerFacturas = (filtros = {}) => api.get("/facturas", { params: limpiar(filtros) });
export const obtenerFactura = (id) => api.get(`/facturas/${id}`);
// datos: { tipo, numeroFactura, proveedorId, montoOC, fechaFactura }
export const crearFactura = (datos) => api.post("/facturas", datos);
export const modificarFactura = (id, datos) => api.put(`/facturas/${id}`, datos);
// No se borra: queda en estado ELIMINADA (visible para Contabilidad).
export const eliminarFactura = (id, motivo = "") => api.delete(`/facturas/${id}`, { data: { motivo } });
export const recibirFacturas = (ids, comentario = "") => api.post("/facturas/recibir", { ids, comentario });
export const devolverFactura = (id, motivo) => api.post(`/facturas/${id}/devolver`, { motivo });
export const exportarFacturas = (filtros = {}) => api.get("/facturas/exportar", { params: limpiar(filtros), responseType: "blob" });
