export default function AuthLayout({ children }) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="mb-8 text-center text-white">
                    <div className="text-4xl font-bold tracking-tight">ASSET PRO</div>
                    <div className="mt-1 text-slate-300">Peticiones de pago</div>
                </div>
                <div className="bg-white rounded-2xl shadow-2xl p-8">{children}</div>
            </div>
        </div>
    );
}
