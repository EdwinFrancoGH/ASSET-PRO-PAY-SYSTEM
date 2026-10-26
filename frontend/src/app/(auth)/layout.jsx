import LogoAssetPro from "../../components/auth/LogoAssetPro";

// Posiciones fijas de las "luciérnagas" (fijas para evitar diferencias
// entre servidor y cliente al hidratar).
const LUCES = [
    { top: "12%", left: "8%", size: 6, delay: "0s", dur: "7s" },
    { top: "28%", left: "18%", size: 4, delay: "2s", dur: "9s" },
    { top: "62%", left: "6%", size: 8, delay: "1s", dur: "8s" },
    { top: "80%", left: "16%", size: 5, delay: "3s", dur: "10s" },
    { top: "88%", left: "30%", size: 7, delay: "0.5s", dur: "6s" },
    { top: "45%", left: "27%", size: 3, delay: "4s", dur: "9s" },
    { top: "18%", left: "78%", size: 5, delay: "1.5s", dur: "8s" },
    { top: "35%", left: "90%", size: 7, delay: "2.5s", dur: "7s" },
    { top: "58%", left: "84%", size: 4, delay: "0.8s", dur: "11s" },
    { top: "72%", left: "94%", size: 6, delay: "3.5s", dur: "8s" },
    { top: "85%", left: "76%", size: 8, delay: "1.2s", dur: "9s" },
    { top: "50%", left: "72%", size: 3, delay: "5s", dur: "10s" },
    { top: "8%", left: "55%", size: 4, delay: "2.2s", dur: "12s" },
    { top: "92%", left: "58%", size: 5, delay: "4.2s", dur: "7s" }
];

export default function AuthLayout({ children }) {
    return (
        <div className="auth-fondo relative flex h-screen flex-col overflow-y-auto overflow-x-hidden text-slate-100">
            {/* Luces decorativas */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                {LUCES.map((l, i) => (
                    <span
                        key={i}
                        className="luciernaga"
                        style={{ top: l.top, left: l.left, width: l.size, height: l.size, animationDelay: l.delay, animationDuration: l.dur }}
                    />
                ))}
            </div>

            {/* Encabezado */}
            <header className="relative z-10 mx-4 mt-4 flex items-center gap-4 rounded-2xl border border-white/10 bg-slate-900/40 px-6 py-4 backdrop-blur-md md:mx-12">
                <LogoAssetPro className="h-11 w-11" />
                <div className="leading-tight">
                    <div className="text-2xl font-bold tracking-tight">
                        ASSET <span className="text-blue-500">PRO PAY</span>
                    </div>
                    <div className="text-sm text-slate-300">Gestión Inteligente de Activos</div>
                </div>
            </header>

            {/* Tarjeta */}
            <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-6">
                <div className="w-full max-w-xl rounded-3xl border border-white/15 bg-slate-800/35 p-8 shadow-2xl shadow-black/50 backdrop-blur-xl sm:p-12">
                    {children}
                </div>
            </main>
        </div>
    );
}
