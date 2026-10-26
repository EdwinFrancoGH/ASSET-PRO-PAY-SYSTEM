"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import Cargando from "../../../../components/ui/Cargando";
import PeticionForm from "../../../../components/peticiones/PeticionForm";
import { obtenerPlan } from "../../../../services/planes.service";
import { mensajeError } from "../../../../utils/formato";

// El título y subtítulo de esta página los muestra la barra superior (Navbar).
// Con ?plan=ID&cuota=ID la petición paga una cuota de un plan de pago.
function NuevaPeticion() {
    const params = useSearchParams();
    const planId = params.get("plan");
    const cuotaId = params.get("cuota");
    const [desdePlan, setDesdePlan] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        if (!planId) return;
        obtenerPlan(planId)
            .then(({ data }) => {
                const plan = data.data;
                const cuota = plan.cuotas.find((c) => c.id === cuotaId);
                if (!cuota) return setError("La cuota no existe en el plan.");
                if (!cuota.habilitada) return setError("Esta cuota ya fue solicitada o aún no le toca (la anterior debe estar pagada).");
                setDesdePlan({ plan, cuota });
            })
            .catch((e) => setError(mensajeError(e, "No se pudo cargar el plan.")));
    }, [planId, cuotaId]);

    if (!planId) return <PeticionForm />;
    if (error) {
        return (
            <div className="rounded-2xl bg-slate-800/35 p-10 text-center shadow-lg ring-1 ring-white/15 backdrop-blur-xl">
                <p className="text-slate-200">{error}</p>
                <Link href={`/planes/${planId}`} className="mt-4 inline-block text-blue-400 hover:underline">Volver al plan</Link>
            </div>
        );
    }
    if (!desdePlan) return <Cargando texto="Cargando plan..." />;
    return <PeticionForm desdePlan={desdePlan} />;
}

export default function NuevaPeticionPage() {
    return (
        <Suspense fallback={<Cargando />}>
            <NuevaPeticion />
        </Suspense>
    );
}
