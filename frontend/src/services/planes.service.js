import api from "./api";

const limpiar = (f) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== "" && v !== null && v !== undefined));

export const obtenerPlanes = (filtros = {}) => api.get("/planes", { params: limpiar(filtros) });
export const obtenerPlan = (id) => api.get(`/planes/${id}`);
export const crearPlan = (datos) => api.post("/planes", datos);
// datos: { montoTotal, cuotas, concepto?, motivo }
export const modificarPlan = (id, datos) => api.put(`/planes/${id}`, datos);
export const cancelarPlan = (id, motivo) => api.post(`/planes/${id}/cancelar`, { motivo });
