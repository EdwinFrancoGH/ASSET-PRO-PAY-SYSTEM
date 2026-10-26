import { formatoMonto } from "../../utils/formato";
import { TOPE_CAJA_CHICA } from "../../utils/cajaChica";

// Tabla del cálculo de la liquidación: entregado, gastado, reconocido,
// excedente no reconocido y movimiento en caja.
export default function ResumenCierreCC({ entregado, cierre, textoMovimiento }) {
    const fila = (etiqueta, valor, clase = "text-slate-100") => (
        <div className="flex justify-between gap-4 py-1.5">
            <span className="text-slate-300">{etiqueta}</span>
            <span className={`font-semibold ${clase}`}>{valor}</span>
        </div>
    );
    return (
        <div className="rounded-xl bg-white/5 p-4 text-sm ring-1 ring-white/10">
            {fila("Entregado", formatoMonto(entregado))}
            {fila("Gastado (factura)", formatoMonto(cierre.montoGastado))}
            {fila(`Reconocido (tope ${formatoMonto(TOPE_CAJA_CHICA)})`, formatoMonto(cierre.montoReconocido))}
            {cierre.excedenteNoReconocido > 0 && fila("Excedente no reconocido (gasto del usuario)", formatoMonto(cierre.excedenteNoReconocido), "text-amber-300")}
            <div className="mt-2 border-t border-white/10 pt-2">
                {fila("Movimiento en caja", textoMovimiento, cierre.tipoCierre === "VUELTO" ? "text-emerald-300" : cierre.tipoCierre === "REINTEGRO" ? "text-orange-300" : "text-slate-100")}
            </div>
        </div>
    );
}
