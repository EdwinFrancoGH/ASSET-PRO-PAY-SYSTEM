import api from "./api";

export const obtenerUsuarios = () => api.get("/users");

export const obtenerAutorizadores = () => api.get("/users/autorizadores");

export const crearUsuario = (datos) => api.post("/users", datos);

export const actualizarUsuario = (uid, datos) => api.put(`/users/${uid}`, datos);

export const eliminarUsuario = (uid) => api.delete(`/users/${uid}`);

export const actualizarPerfil = (datos) => api.put("/users/profile", datos);
