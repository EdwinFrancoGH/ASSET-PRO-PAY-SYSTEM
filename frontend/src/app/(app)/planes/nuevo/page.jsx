"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import Seccion from "../../../../components/ui/Seccion";
import Campo from "../../../../components/ui/Campo";
import Cargando from "../../../../components/ui/Cargando";
import BuscadorProveedor from "../../../../components/peticiones/BuscadorProveedor";
import TipoBadge from "../../../../components/peticiones/TipoBadge";
import CuotasEditor from "../../../../components/planes/CuotasEditor";
import { claseInput, botonPrimario, botonSecundario } from "../../../../components/ui/estilos";
import { alertaError, toastExito } from "../../../../components/ui/alertas";

import { useAuth } from "../../../../context/AuthContext";
import { obtenerCatalogo } from "../../../../services/catalogos.service";
import { crearPlan } from "../../../../services/planes.service";
import { MONEDAS } from "../../../../utils/peticion";
import { origenDeProveedor } from "../../../../utils/bancario";
import { PLANTILLAS, cuotaVacia, recalcularMontos, sumaCuotas } from "../../../../utils/planes";
import { mensajeError } from "../../../../utils/formato";

const cuotasIniciales = () => PLANTILLAS[0].cuotas.map(([n, p]) => cuotaVacia(n, p));

export default function NuevoPlanPage() {
    const router = useRouter();
    const { userData } = useAuth();
    const [proveedores, setProveedores] = useState(null);
    const [form, setForm] = useState({ proveedorId: "", ordenELM: "", moneda: "USD", montoTotal: "", concepto: "", cuotas: cuotasIniciales() });
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        obtenerCatalogo("proveedores", true)
            .then(({ data }) => setProveedores(data.data))
            .catch((e) => { setProveedores([]); alertaError(mensajeError(e)); });
    }, []);

    const proveedor = useMemo(() => proveedores?.find((p) => p.id === form.proveedorId) || null, [proveedores, form.proveedorId]);

    const cambiar = (campo, valor) =>
        setForm((f) => (campo === "montoTotal" ? { ...f, montoTotal: valor, cuotas: recalcularMontos(f.cuotas, valor) } : { ...f, [campo]: valor }));

    const guardar = async (e) => {
        e.preventDefault();
        const total = Number(form.montoTotal);
        if (!form.proveedorId) return alertaError("Selecciona el proveedor.");
        if (!total || total <= 0) return alertaError("Indica el monto total.");
        if (!form.concepto.trim()) return alertaError("Indica el concepto de la compra.");
        if (Math.abs(sumaCuotas(form.cuotas) - total) >= 0.01) return alertaError("Las cuotas deben sumar el monto total (100%).");

        setGuardando(true);
        try {
            const { data } = await crearPlan({ ...form, montoTotal: total, cuotas: form.cuotas.map((c) => ({ ...c, monto: Number(c.monto) })) });
            toastExito(data.message);
            router.replace(`/planes/${data.data.id}`);
        } catch (err) {
            alertaError(mensajeError(err, "No se pudo crear el plan."));
            setGuardando(false);
        }
    };

    if (!userData?.esCompras) {
        return <Seccion><p className="text-slate-300">Solo el área de Compras puede crear planes de pago.</p></Seccion>;
    }
    if (!proveedores) return <Cargando texto="Cargando proveedores..." />;

    return (
        <form onSubmit={guardar} className="space-y-8" noValidate>
            <Seccion titulo="Compra" className="relative z-20">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                    <Campo etiqueta="Proveedor" htmlFor="proveedorId" requerido className="lg:col-span-2">
                        <BuscadorProveedor proveedores={proveedores} seleccionado={proveedor} onSeleccionar={(id) => cambiar("proveedorId", id)} mostrarTipo />
                    </Campo>
                    <Campo etiqueta="Tipo" htmlFor="tipo" ayuda="Según el origen del proveedor.">
                        <div id="tipo" className="mt-2 flex h-[50px] items-center">
                            {proveedor ? <TipoBadge tipo={origenDeProveedor(proveedor)} className="text-sm" /> : <span className="text-sm text-slate-400">—</span>}
                        </div>
                    </Campo>
                    <Campo etiqueta="Orden ELM" htmlFor="ordenELM">
                        <input id="ordenELM" maxLength={60} value={form.ordenELM} onChange={(e) => cambiar("ordenELM", e.target.value)} className={claseInput} />
                    </Campo>
                    <Campo etiqueta="Monto total" htmlFor="montoTotal" requerido ayuda={proveedor && origenDeProveedor(proveedor) === "LOCAL" ? "Sin IVA." : undefined}>
                        <input id="montoTotal" type="number" min="0" step="0.01" inputMode="decimal" value={form.montoTotal} onChange={(e) => cambiar("montoTotal", e.target.value)} className={claseInput} />
                    </Campo>
                    <Campo etiqueta="Moneda" htmlFor="moneda" requerido>
                        <select id="moneda" value={form.moneda} onChange={(e) => cambiar("moneda", e.target.value)} className={claseInput}>
                            {MONEDAS.map((m) => <option key={m}>{m}</option>)}
                        </select>
                    </Campo>
                    <Campo etiqueta="Concepto de la compra" htmlFor="concepto" requerido className="md:col-span-2 lg:col-span-4">
                        <textarea id="concepto" rows={3} maxLength={2000} value={form.concepto} onChange={(e) => cambiar("concepto", e.target.value)} className={claseInput} />
                    </Campo>
                </div>
            </Seccion>

            <Seccion titulo="Términos de pago (cuotas)">
                <p className="mb-4 text-sm text-slate-300">
                    Cada cuota se paga con una petición normal. Se solicitan en orden: la siguiente se habilita cuando la anterior está pagada.
                </p>
                <CuotasEditor cuotas={form.cuotas} montoTotal={form.montoTotal} moneda={form.moneda} onChange={(cuotas) => setForm((f) => ({ ...f, cuotas }))} />
            </Seccion>

            <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => router.back()} disabled={guardando} className={botonSecundario}>Cancelar</button>
                <button type="submit" disabled={guardando} className={botonPrimario}>{guardando ? "Guardando..." : "Crear plan"}</button>
            </div>
        </form>
    );
}
