import { FaClock, FaHourglassHalf, FaBalanceScale, FaCheckCircle, FaPlusCircle } from "react-icons/fa";
import { formatoMonto } from "../../utils/formato";

const montos = (porMoneda) => {
    const lista = Object.entries(porMoneda || {});
    return lista.length ? lista.map(([m, v]) => formatoMonto(v, m)).join(" + ") : formatoMonto(0, "USD");
};

// Tarjetas de resumen del expediente. Al hacer clic se filtra la tabla.
export default function ResumenExpediente({ resumen, estado, onFiltrar }) {
    const tarjetas = [
        { clave: "EN_PROCESO_PAGO", titulo: "En proceso de pago", cantidad: resumen.enProceso?.cantidad ?? 0, monto: montos(resumen.enProceso?.monto), detalle: "aún no pagados", icono: FaClock, color: "text-sky-300", anillo: "ring-sky-400/40" },
        { clave: "PENDIENTE_COMPENSAR", titulo: "Pendientes de compensar", cantidad: resumen.pendientes.cantidad, monto: montos(resumen.pendientes.monto), detalle: "anticipos sin factura", icono: FaHourglassHalf, color: "text-amber-300", anillo: "ring-amber-400/40" },
        { clave: "SALDO_PENDIENTE", titulo: "Con saldo pendiente de liquidar", cantidad: resumen.conSaldo.cantidad, monto: montos(resumen.conSaldo.saldo), detalle: "saldo por compensar", icono: FaBalanceScale, color: "text-orange-300", anillo: "ring-orange-400/40" },
        { clave: "COMPENSADO", titulo: "Compensados", cantidad: resumen.compensados.cantidad, monto: null, detalle: "anticipos liquidados", icono: FaCheckCircle, color: "text-emerald-300", anillo: "ring-emerald-400/40" },
        { clave: "EXCEDENTE", titulo: "Con excedente", cantidad: resumen.excedentes.cantidad, monto: montos(resumen.excedentes.monto), detalle: "facturado de más", icono: FaPlusCircle, color: "text-violet-300", anillo: "ring-violet-400/40" }
    ];

    return (
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
            {tarjetas.map((t) => {
                const activa = estado === t.clave;
                const Icono = t.icono;
                return (
                    <button
                        key={t.clave}
                        type="button"
                        onClick={() => onFiltrar(activa ? "" : t.clave)}
                        aria-pressed={activa}
                        className={`rounded-2xl bg-slate-800/35 p-5 text-left shadow-lg ring-1 backdrop-blur-xl transition hover:bg-slate-800/60 ${activa ? `ring-2 ${t.anillo}` : "ring-white/15"}`}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-slate-300">{t.titulo}</p>
                            <Icono className={`text-xl ${t.color}`} />
                        </div>
                        <p className="mt-3 text-3xl font-bold text-white">{t.cantidad}</p>
                        <p className={`mt-1 text-sm ${t.color}`}>{t.monto ? `${t.monto} · ${t.detalle}` : t.detalle}</p>
                    </button>
                );
            })}
        </div>
    );
}
