import api from "./api";

// Caja chica — ver backend/src/services/cajaChica.service.js
export const obtenerContextoCajaChica = () => api.get("/caja-chica/contexto");
export const obtenerMisSolicitudesCC = () => api.get("/caja-chica/mias");
export const obtenerSolicitudCC = (id) => api.get(`/caja-chica/${id}`);
// datos: { monto, concepto }
export const crearSolicitudCC = (datos) => api.post("/caja-chica", datos);
export const anularSolicitudCC = (id, motivo = "") => api.post(`/caja-chica/${id}/anular`, { motivo });

// Jefe de área
export const obtenerAprobacionesCC = () => api.get("/caja-chica/aprobaciones");
export const aprobarSolicitudCC = (id, comentario = "") => api.post(`/caja-chica/${id}/aprobar`, { comentario });
export const rechazarSolicitudCC = (id, motivo) => api.post(`/caja-chica/${id}/rechazar`, { motivo });

// Solicitante: token nuevo cuando el anterior venció (sin volver a aprobar)
export const regenerarTokenCC = (id) => api.post(`/caja-chica/${id}/regenerar-token`);

// Cajero
export const buscarPorTokenCC = (token) => api.post("/caja-chica/entregas/buscar", { token });
export const entregarCC = (id, token) => api.post(`/caja-chica/${id}/entregar`, { token });
export const rechazarEnCajaCC = (id, token, motivo) => api.post(`/caja-chica/${id}/rechazar-caja`, { token, motivo });
export const obtenerMovimientosCajaCC = (dia) => api.get("/caja-chica/entregas", { params: dia ? { dia } : {} });

// Liquidación
// datos: { numeroFactura, montoGastado, comentario, archivos: File[] }
export const enviarLiquidacionCC = (id, { numeroFactura, montoGastado, comentario, archivos }) => {
    const form = new FormData();
    form.append("numeroFactura", numeroFactura);
    form.append("montoGastado", montoGastado);
    form.append("comentario", comentario || "");
    archivos.forEach((a) => form.append("archivos", a));
    return api.post(`/caja-chica/${id}/liquidacion`, form);
};
export const obtenerLiquidacionesCC = () => api.get("/caja-chica/liquidaciones");
export const cerrarLiquidacionCC = (id, comentario = "") => api.post(`/caja-chica/${id}/liquidacion/cerrar`, { comentario });
export const devolverLiquidacionCC = (id, motivo) => api.post(`/caja-chica/${id}/liquidacion/devolver`, { motivo });
export const descargarArchivoCC = (id, archivoId) => api.get(`/caja-chica/${id}/archivos/${archivoId}`, { responseType: "blob" });

// Cuadre diario (Cajero/Admin)
export const obtenerCuadreCC = (dia) => api.get("/caja-chica/cuadre", { params: dia ? { dia } : {} });
export const exportarCuadreCC = (dia) => api.get("/caja-chica/cuadre/exportar", { params: dia ? { dia } : {}, responseType: "blob" });

// Fondo de caja (Admin cambia / repone) y corte diario (Cajero)
export const obtenerFondoCC = () => api.get("/caja-chica/fondo");
export const cambiarFondoCC = (montoFondo, motivo = "") => api.put("/caja-chica/fondo", { montoFondo, motivo });
export const reponerFondoCC = (comentario = "") => api.post("/caja-chica/fondo/reponer", { comentario });
export const obtenerCortesCC = () => api.get("/caja-chica/cortes");
export const registrarCorteCC = (datos) => api.post("/caja-chica/cortes", datos);
// Admin: reabrir la caja de hoy (ya cortada) con justificación
export const reabrirCorteCC = (dia, motivo) => api.post(`/caja-chica/cortes/${dia}/reabrir`, { motivo });
