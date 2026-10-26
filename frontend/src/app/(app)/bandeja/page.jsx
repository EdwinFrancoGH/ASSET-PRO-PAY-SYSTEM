"use client";

import { useEffect, useState } from "react";

import EncabezadoPagina from "../../../components/ui/EncabezadoPagina";
import Cargando from "../../../components/ui/Cargando";
import TablaPeticiones from "../../../components/peticiones/TablaPeticiones";
import RequireRole from "../../../components/auth/RequireRole";
import { alertaError } from "../../../components/ui/alertas";

import { useAuth } from "../../../context/AuthContext";
import { obtenerPendientes } from "../../../services/peticiones.service";
import { ROLES } from "../../../utils/roles";
import { mensajeError } from "../../../utils/formato";

const GRUPOS_POR_ROL = {
    [ROLES.AUTORIZADOR]: [
        { titulo: "Por autorizar", accion: "Autorizar", vacio: "No tienes peticiones por autorizar." }
    ],
    [ROLES.CONTABILIDAD]: [
        { titulo: "Por revisar", accion: "Revisión contable", vacio: "No hay peticiones autorizadas esperando revisión." },
        { titulo: "Por pagar", accion: "Registrar pago", vacio: "No hay peticiones aprobadas pendientes de pago." }
    ]
};

function Bandeja() {
    const { userRole } = useAuth();
    const [pendientes, setPendientes] = useState(null);

    useEffect(() => {
        obtenerPendientes()
            .then(({ data }) => setPendientes(data.data))
            .catch((e) => {
                setPendientes([]);
                alertaError(mensajeError(e));
            });
    }, []);

    const grupos = GRUPOS_POR_ROL[userRole] || [];

    return (
        <>
            <EncabezadoPagina
                titulo="Bandeja"
                descripcion={userRole === ROLES.AUTORIZADOR ? "Peticiones que te asignaron para autorizar." : "Peticiones autorizadas que requieren revisión contable o registro de pago."}
            />

            <div className="space-y-8">
                {grupos.map((g) => {
                    const lista = (pendientes || []).filter((p) => p.accionPendiente === g.accion);
                    return (
                        <section key={g.titulo} className="bg-slate-800/35 backdrop-blur-xl ring-1 ring-white/15 rounded-2xl shadow-lg overflow-hidden">
                            <h2 className="px-8 pt-6 pb-4 text-xl font-semibold text-slate-200 border-b">
                                {g.titulo} {pendientes && <span className="ml-2 rounded-full bg-white/10 px-2.5 py-0.5 text-sm text-slate-300">{lista.length}</span>}
                            </h2>
                            {pendientes === null ? <Cargando /> : <TablaPeticiones peticiones={lista} vacio={g.vacio} />}
                        </section>
                    );
                })}
            </div>
        </>
    );
}

export default function BandejaPage() {
    return (
        <RequireRole roles={[ROLES.AUTORIZADOR, ROLES.CONTABILIDAD]}>
            <Bandeja />
        </RequireRole>
    );
}
