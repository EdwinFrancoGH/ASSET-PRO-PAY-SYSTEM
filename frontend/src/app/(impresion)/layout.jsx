"use client";

import ProtectedRoute from "../../components/auth/ProtectedRoute";
import InactividadSesion from "../../components/auth/InactividadSesion";

// Páginas para imprimir (ej. Solicitud de pago): sin menú lateral ni barra
// superior, fondo neutro en pantalla y solo la hoja al imprimir.
export default function ImpresionLayout({ children }) {
    return (
        <ProtectedRoute>
            {/* Mismo cierre de sesión por inactividad que el resto del sistema */}
            <div className="print:hidden"><InactividadSesion /></div>
            <div className="impresion min-h-screen bg-slate-300 print:bg-white">{children}</div>
        </ProtectedRoute>
    );
}
