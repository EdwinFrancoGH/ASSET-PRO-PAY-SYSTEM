// Franja oscura del layout original, reutilizada como encabezado de cada página.
export default function EncabezadoPagina({ titulo, descripcion, children }) {
    return (
        <div className="bg-gradient-to-r from-slate-900 to-slate-700 rounded-2xl p-8 text-white shadow-xl mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
                <h1 className="text-3xl font-bold">{titulo}</h1>
                {descripcion && <p className="text-slate-300 mt-2">{descripcion}</p>}
            </div>
            {children && <div className="flex flex-wrap gap-3">{children}</div>}
        </div>
    );
}
