"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import EncabezadoPagina from "../../../../../components/ui/EncabezadoPagina";
import Cargando from "../../../../../components/ui/Cargando";
import PeticionForm from "../../../../../components/peticiones/PeticionForm";
import { obtenerPeticion } from "../../../../../services/peticiones.service";
import { useAuth } from "../../../../../context/AuthContext";
import { ESTADOS_EDITABLES } from "../../../../../utils/estados";
import { mensajeError } from "../../../../../utils/formato";

export default function EditarPeticionPage() {
    const { id } = useParams();
    const { userData } = useAuth();
    const [peticion, setPeticion] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        obtenerPeticion(id)
            .then(({ data }) => {
                const p = data.data;
                if (p.solicitanteId !== userData.uid || !ESTADOS_EDITABLES.includes(p.estado)) {
                    setError("Esta petición ya no se puede editar.");
                } else {
                    setPeticion(p);
                }
            })
            .catch((e) => setError(mensajeError(e, "No se pudo cargar la petición.")));
    }, [id, userData.uid]);

    if (error) {
        return (
            <div className="rounded-2xl bg-slate-800/35 backdrop-blur-xl ring-1 ring-white/15 p-10 text-center shadow-lg">
                <p className="text-slate-200">{error}</p>
                <Link href={`/peticiones/${id}`} className="mt-4 inline-block text-blue-400 hover:underline">Ver la petición</Link>
            </div>
        );
    }
    if (!peticion) return <Cargando />;

    return (
        <>
            <EncabezadoPagina titulo={`Editar ${peticion.numero}`} descripcion="Actualiza la información y vuelve a enviarla cuando esté lista." />
            <PeticionForm peticion={peticion} />
        </>
    );
}
