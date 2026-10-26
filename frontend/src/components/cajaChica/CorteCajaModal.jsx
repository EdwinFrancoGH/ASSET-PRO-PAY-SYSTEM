"use client";

import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import Campo from "../ui/Campo";
import { claseInput, botonPrimario, botonSecundario } from "../ui/estilos";
import { alertaError, toastExito, confirmar } from "../ui/alertas";
import { registrarCorteCC } from "../../services/cajaChica.service";
import { formatoMonto, mensajeError } from "../../utils/formato";

const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

// Corte de caja del día: el cajero cuenta el efectivo y lo compara con el
// saldo que calcula el sistema. Si no cuadra, debe explicar la diferencia.
export default function CorteCajaModal({ abierto, cuadre, onCerrar, onRegistrado }) {
    const [contado, setContado] = useState("");
    const [observacion, setObservacion] = useState("");
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (abierto) {
            setContado("");
            setObservacion("");
        }
    }, [abierto]);

    if (!cuadre) return null;
    const f = cuadre.fondo;
    const r = cuadre.resumen;
    const diferencia = contado === "" ? null : r2(Number(contado) - f.saldoFinal);

    const guardar = async (e) => {
        e.preventDefault();
        const ok = await confirmar({
            titulo: `Cortar la caja del ${cuadre.dia}`,
            texto: "El corte queda registrado y ya no se podrán hacer entregas ni cierres de liquidación hoy.",
            confirmar: "Registrar corte"
        });
        if (!ok) return;
        setGuardando(true);
        try {
            const { data } = await registrarCorteCC({ dia: cuadre.dia, efectivoContado: Number(contado), observacion });
            toastExito(data.message);
            onRegistrado();
        } catch (err) {
            alertaError(mensajeError(err));
        } finally {
            setGuardando(false);
        }
    };

    const fila = (etiqueta, valor, clase = "text-slate-100") => (
        <div className="flex justify-between gap-4 py-1.5">
            <span className="text-slate-300">{etiqueta}</span>
            <span className={`font-semibold ${clase}`}>{valor}</span>
        </div>
    );

    return (
        <Modal abierto={abierto} titulo={`Corte de caja — ${cuadre.dia}`} onCerrar={() => !guardando && onCerrar()}>
            <form onSubmit={guardar} className="space-y-5">
                <div className="rounded-xl bg-white/5 p-4 text-sm ring-1 ring-white/10">
                    {fila("Saldo al inicio del día", formatoMonto(f.saldoInicial))}
                    {fila("(−) Entregas", formatoMonto(r.entregado))}
                    {fila("(−) Reintegros entregados", formatoMonto(r.reintegros))}
                    {fila("(+) Vueltos recibidos", formatoMonto(r.vueltos))}
                    <div className="mt-2 border-t border-white/10 pt-2">{fila("Debe haber en caja (sistema)", formatoMonto(f.saldoFinal), "text-white text-base")}</div>
                </div>

                <Campo etiqueta="Efectivo contado (USD)" htmlFor="contadoCorte" requerido ayuda="Cuenta billetes y monedas que hay físicamente en la caja.">
                    <input id="contadoCorte" type="number" required min="0" step="0.01" autoFocus value={contado} onChange={(e) => setContado(e.target.value)} className={claseInput} placeholder="0.00" />
                </Campo>

                {diferencia !== null && (
                    <p className={`rounded-lg p-3 text-sm font-semibold ring-1 ${diferencia === 0 ? "bg-emerald-500/10 text-emerald-200 ring-emerald-400/30" : "bg-red-500/10 text-red-200 ring-red-400/30"}`}>
                        {diferencia === 0 ? "La caja cuadra." : `${diferencia > 0 ? "Sobrante" : "Faltante"} de ${formatoMonto(Math.abs(diferencia))}. Explica el motivo; se avisará al Administrador.`}
                    </p>
                )}

                <Campo etiqueta="Observación" htmlFor="obsCorte" requerido={diferencia !== null && diferencia !== 0}>
                    <textarea id="obsCorte" rows={2} maxLength={500} required={diferencia !== null && diferencia !== 0} value={observacion} onChange={(e) => setObservacion(e.target.value)} className={claseInput} />
                </Campo>

                <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={onCerrar} disabled={guardando} className={botonSecundario}>Cancelar</button>
                    <button type="submit" disabled={guardando || contado === ""} className={botonPrimario}>{guardando ? "Registrando..." : "Registrar corte"}</button>
                </div>
            </form>
        </Modal>
    );
}
