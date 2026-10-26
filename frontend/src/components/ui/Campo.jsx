// Etiqueta + control. "requerido" agrega el asterisco; "error" pinta el
// mensaje debajo del control.
export default function Campo({ etiqueta, htmlFor, requerido, ayuda, error, className = "", children }) {
    return (
        <div className={className}>
            <label htmlFor={htmlFor} className="text-sm font-medium text-slate-300">
                {etiqueta}
                {requerido && <span className="text-red-500"> *</span>}
            </label>
            {children}
            {error ? (
                <p className="mt-1 text-xs text-red-400">{error}</p>
            ) : ayuda ? (
                <p className="mt-1 text-xs text-slate-400">{ayuda}</p>
            ) : null}
        </div>
    );
}
