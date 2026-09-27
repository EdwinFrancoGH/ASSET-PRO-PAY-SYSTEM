// Etiqueta + control. "requerido" agrega el asterisco; "error" pinta el
// mensaje debajo del control.
export default function Campo({ etiqueta, htmlFor, requerido, ayuda, error, className = "", children }) {
    return (
        <div className={className}>
            <label htmlFor={htmlFor} className="text-sm font-medium text-gray-600">
                {etiqueta}
                {requerido && <span className="text-red-500"> *</span>}
            </label>
            {children}
            {error ? (
                <p className="mt-1 text-xs text-red-600">{error}</p>
            ) : ayuda ? (
                <p className="mt-1 text-xs text-slate-500">{ayuda}</p>
            ) : null}
        </div>
    );
}
