import { ESTADOS_FACTURA, TIPOS_FACTURA } from "../../utils/facturas";

const base = "inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset";

export function EstadoFacturaBadge({ estado }) {
    const info = ESTADOS_FACTURA[estado] || { etiqueta: estado, clase: "bg-white/10 text-slate-200 ring-white/20" };
    return <span className={`${base} ${info.clase}`}>{info.etiqueta}</span>;
}

export function TipoFacturaBadge({ tipo }) {
    const info = TIPOS_FACTURA[tipo] || { etiqueta: tipo, clase: "bg-white/10 text-slate-200 ring-white/20" };
    return <span className={`${base} ${info.clase}`}>{info.etiqueta}</span>;
}
