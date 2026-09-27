import api from "./api";

export const obtenerNotificaciones = (limite = 50) => api.get("/notificaciones", { params: { limite } });

export const marcarLeida = (id) => api.patch(`/notificaciones/${id}/leida`);

export const marcarTodasLeidas = () => api.patch("/notificaciones/leer-todas");
