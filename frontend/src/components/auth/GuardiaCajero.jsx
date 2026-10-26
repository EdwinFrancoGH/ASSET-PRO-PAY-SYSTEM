"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import { ROLES_SOLO_CAJA_CHICA, RUTAS_CAJA_CHICA, INICIO_CAJA_CHICA } from "../../utils/roles";
import Cargando from "../ui/Cargando";

// Cajero y Solicitante caja chica solo pueden abrir Caja chica,
// Notificaciones y Perfil. Si entran a otra ruta (por ejemplo /dashboard
// después del login, o escribiendo la URL) se les lleva a su pantalla de
// inicio. Los demás roles no se ven afectados.
// Capa de interfaz: la protección real está en el backend (bloquearSoloCajaChica).
export default function GuardiaCajero({ children }) {
    const { userRole } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const restringido = ROLES_SOLO_CAJA_CHICA.includes(userRole);
    const permitida = !restringido || RUTAS_CAJA_CHICA.some((r) => pathname === r || pathname.startsWith(`${r}/`));

    useEffect(() => {
        if (!permitida) router.replace(INICIO_CAJA_CHICA[userRole]);
    }, [permitida, router, userRole]);

    if (!permitida) return <Cargando />;
    return <>{children}</>;
}
