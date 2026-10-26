import { INFO_ESTADO_PLAN } from "../../utils/planes";

export default function EstadoPlanBadge({ estado }) {
    const info = INFO_ESTADO_PLAN[estado] || { etiqueta: estado, clase: "bg-white/10 text-slate-200 ring-white/20" };
    return <span className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${info.clase}`}>{info.etiqueta}</span>;
}
