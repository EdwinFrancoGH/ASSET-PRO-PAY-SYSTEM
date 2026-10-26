import { filasCuenta } from "../../utils/bancario";

// Datos bancarios de la cuenta del proveedor en solo lectura, agrupados
// como en la banca (Local: cuenta destino; Exterior: beneficiario, banco
// del beneficiario y banco intermediario).
export default function DatosCuenta({ cuenta, tipo }) {
    const filas = filasCuenta(cuenta, tipo);
    if (!filas.length) return null;

    const grupos = filas.reduce((acc, f) => {
        (acc[f.grupo] ||= []).push(f);
        return acc;
    }, {});

    return (
        <div className="space-y-4 rounded-xl bg-white/5 p-5 ring-1 ring-white/10">
            {Object.entries(grupos).map(([grupo, items]) => (
                <div key={grupo}>
                    <h3 className="mb-2 text-sm font-semibold text-slate-300">{grupo}</h3>
                    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                        {items.map((f) => (
                            <div key={f.etiqueta}>
                                <dt className="text-xs text-slate-400">{f.etiqueta}</dt>
                                <dd className={`text-sm ${f.valor ? "text-white" : "text-slate-500"}`}>{f.valor || "—"}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            ))}
        </div>
    );
}
