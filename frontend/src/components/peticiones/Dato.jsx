export default function Dato({ etiqueta, children, className = "", largo = false }) {
    const vacio = children === null || children === undefined || children === "";
    return (
        <div className={className}>
            <dt className="text-sm font-medium text-gray-500">{etiqueta}</dt>
            <dd className={`mt-1 text-slate-900 ${largo ? "whitespace-pre-line" : ""} ${vacio ? "text-slate-400" : ""}`}>{vacio ? "—" : children}</dd>
        </div>
    );
}
