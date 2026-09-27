export default function Cargando({ texto = "Cargando..." }) {
    return (
        <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
            <div className="h-6 w-6 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
            {texto}
        </div>
    );
}
