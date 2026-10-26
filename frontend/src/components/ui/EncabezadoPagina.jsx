// Franja oscura del layout original, reutilizada como encabezado de cada página.
// oscuro: estilo "vidrio" del login (prueba de diseño nocturno).
export default function EncabezadoPagina({ titulo, descripcion, children, oscuro = true }) {
    const fondo = oscuro
        ? "rounded-3xl border border-white/15 bg-slate-800/35 backdrop-blur-xl shadow-2xl shadow-black/40"
        : "bg-gradient-to-r from-slate-900 to-slate-700 rounded-2xl shadow-xl";
    return (
        <div className={`${fondo} p-5 sm:p-8 text-white mb-6 sm:mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between`}>
            <div>
                <h1 className="text-2xl font-bold sm:text-3xl">{titulo}</h1>
                {descripcion && <p className="text-slate-300 mt-2">{descripcion}</p>}
            </div>
            {children && <div className="flex flex-wrap gap-3">{children}</div>}
        </div>
    );
}
