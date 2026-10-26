export default function Seccion({ titulo, acciones, children, className = "" }) {
    return (
        <section className={`bg-slate-800/35 backdrop-blur-xl ring-1 ring-white/15 rounded-3xl shadow-2xl shadow-black/40 p-5 sm:p-8 ${className}`}>
            {titulo && (
                <div className="mb-6 border-b pb-3 flex items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold text-slate-200">{titulo}</h2>
                    {acciones}
                </div>
            )}
            {children}
        </section>
    );
}
