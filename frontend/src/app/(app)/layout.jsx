"use client";

import { useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import ProtectedRoute from "../../components/auth/ProtectedRoute";
import InactividadSesion from "../../components/auth/InactividadSesion";
import FondoNocturno from "../../components/ui/FondoNocturno";
import GuardiaCajero from "../../components/auth/GuardiaCajero";

// Todo el sistema usa el tema nocturno del login: el fondo cubre el menú
// lateral, la barra superior (que queda "flotando") y el área de trabajo.
export default function AppLayout({ children }) {
    const [menuAbierto, setMenuAbierto] = useState(false);

    return (
        <ProtectedRoute>
            {/* Cierre de sesión por inactividad (1 min + 30 s de aviso) */}
            <InactividadSesion />

            <div className="tema-nocturno app-fondo relative flex min-h-screen text-slate-100">
                <FondoNocturno />
                <Sidebar abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />

                <div className="relative flex-1 min-w-0 flex flex-col">
                    <Navbar oscuro onAbrirMenu={() => setMenuAbierto(true)} />
                    <main className="relative flex-1 p-4 md:p-8">
                        <div className="relative z-10 max-w-7xl mx-auto">
                            {/* El Cajero solo puede abrir Caja chica, Notificaciones y Perfil */}
                            <GuardiaCajero>{children}</GuardiaCajero>
                        </div>
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
