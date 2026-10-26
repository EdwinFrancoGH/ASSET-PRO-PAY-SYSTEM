import { INFO_ESTADO } from "../../utils/estados";

export default function EstadoBadge({ estado }) {
    const info = INFO_ESTADO[estado] || { etiqueta: estado, clase: "bg-white/10 text-slate-200 ring-white/20" };
    return (
        <span className={`inline-flex items-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${info.clase}`}>
            {info.etiqueta}
        </span>
    );
}
