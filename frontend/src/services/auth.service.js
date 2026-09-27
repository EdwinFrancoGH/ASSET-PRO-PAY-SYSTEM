import api from "./api";

export const obtenerMiUsuario = () => api.get("/auth/me");
