import { ORIGENES, ETIQUETA_ORIGEN } from "../../utils/bancario";

// Etiqueta Local / Exterior (proveedores y peticiones).
export default function TipoBadge({ tipo, className = "" }) {
    const exterior = tipo === ORIGENES.EXTERIOR;
    return (
        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${exterior ? "bg-violet-500/15 text-violet-300" : "bg-sky-500/15 text-sky-300"} ${className}`}>
            {ETIQUETA_ORIGEN[tipo] || ETIQUETA_ORIGEN.LOCAL}
        </span>
    );
}
