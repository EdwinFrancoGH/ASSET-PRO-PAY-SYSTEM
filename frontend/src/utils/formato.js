export const formatoMonto = (monto, moneda = "USD") => {
    if (monto === null || monto === undefined || monto === "") return "—";
    return new Intl.NumberFormat("es-SV", { style: "currency", currency: moneda || "USD" }).format(Number(monto));
};

// "2026-09-22" → "22 sep 2026" (sin desfase de zona horaria)
export const formatoFecha = (fecha) => {
    if (!fecha) return "—";
    const [a, m, d] = String(fecha).slice(0, 10).split("-").map(Number);
    return new Date(a, m - 1, d).toLocaleDateString("es-SV", { day: "2-digit", month: "short", year: "numeric" });
};

export const formatoFechaHora = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("es-SV", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export const tiempoRelativo = (iso) => {
    const seg = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
    if (seg < 60) return "hace un momento";
    const min = Math.round(seg / 60);
    if (min < 60) return `hace ${min} min`;
    const h = Math.round(min / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.round(h / 24);
    return d < 30 ? `hace ${d} d` : formatoFechaHora(iso);
};

export const formatoTamano = (bytes = 0) =>
    bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

export const hoyISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const mensajeError = (error, porDefecto = "Ocurrió un error. Inténtalo de nuevo.") =>
    error?.response?.data?.message || porDefecto;
