"use client";

import { useState } from "react";
import Sidebar from "../../components/layout/Sidebar";
import Navbar from "../../components/layout/Navbar";
import ProtectedRoute from "../../components/auth/ProtectedRoute";

export default function AppLayout({ children }) {
    const [menuAbierto, setMenuAbierto] = useState(false);

    return (
        <ProtectedRoute>
            <div className="flex bg-slate-100 min-h-screen">
                <Sidebar abierto={menuAbierto} onCerrar={() => setMenuAbierto(false)} />

                <div className="flex-1 min-w-0 flex flex-col">
                    <Navbar onAbrirMenu={() => setMenuAbierto(true)} />
                    <main className="p-4 md:p-8">
                        <div className="max-w-7xl mx-auto">{children}</div>
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
