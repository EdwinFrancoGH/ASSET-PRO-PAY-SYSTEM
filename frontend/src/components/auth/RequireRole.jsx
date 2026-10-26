"use client";

import { FaLock } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";

// Capa de interfaz: la protección real de los datos está en el backend
// (verifyRoles en auth.middleware.js).
export default function RequireRole({ roles, children }) {
    const { userRole } = useAuth();

    if (!roles.includes(userRole)) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                <FaLock size={40} className="mb-4 text-slate-400" />
                <h2 className="text-xl font-bold text-slate-100">Acceso denegado</h2>
                <p>Tu rol no tiene acceso a esta página.</p>
            </div>
        );
    }

    return <>{children}</>;
}
