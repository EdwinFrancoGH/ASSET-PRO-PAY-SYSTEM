"use client";

import EncabezadoPagina from "../../../../components/ui/EncabezadoPagina";
import PeticionForm from "../../../../components/peticiones/PeticionForm";

export default function NuevaPeticionPage() {
    return (
        <>
            <EncabezadoPagina
                titulo="Nueva Petición de Pago"
                descripcion="Complete la información para generar una nueva solicitud de pago."
            />
            <PeticionForm />
        </>
    );
}
