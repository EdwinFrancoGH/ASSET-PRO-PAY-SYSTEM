export default function Seccion({ titulo, acciones, children, className = "" }) {
    return (
        <section className={`bg-white rounded-2xl shadow-lg p-8 ${className}`}>
            {titulo && (
                <div className="mb-6 border-b pb-3 flex items-center justify-between gap-4">
                    <h2 className="text-xl font-semibold text-slate-700">{titulo}</h2>
                    {acciones}
                </div>
            )}
            {children}
        </section>
    );
}
