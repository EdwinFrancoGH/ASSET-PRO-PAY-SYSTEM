import { formatoMonto } from "../../utils/formato";

// Barra de avance del plan: pagado (verde), en proceso (ámbar) y saldo.
export default function AvancePlan({ plan, compacto = false }) {
    const { montoTotal, moneda, resumen } = plan;
    const pct = (v) => (montoTotal ? Math.min(100, (v / montoTotal) * 100) : 0);

    return (
        <div>
            <div className={`flex w-full overflow-hidden rounded-full bg-white/10 ${compacto ? "h-2" : "h-3"}`} role="img" aria-label={`Pagado ${resumen.porcentajePagado}%`}>
                <div className="bg-emerald-400" style={{ width: `${pct(resumen.pagado)}%` }} />
                <div className="bg-amber-300/80" style={{ width: `${pct(resumen.enProceso)}%` }} />
            </div>
            {!compacto && (
                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <span className="text-emerald-300">● Pagado {formatoMonto(resumen.pagado, moneda)} ({resumen.porcentajePagado}%)</span>
                    <span className="text-amber-200">● En proceso {formatoMonto(resumen.enProceso, moneda)}</span>
                    <span className="text-slate-300">● Saldo {formatoMonto(resumen.saldo, moneda)}</span>
                </div>
            )}
        </div>
    );
}
