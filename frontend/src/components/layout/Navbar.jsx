"use client";

import Link from "next/link";
import { FaBars, FaUserCircle } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import NotificacionesBell from "./NotificacionesBell";

export default function Navbar({ onAbrirMenu }) {
    const { userData } = useAuth();

    return (
        <header className="h-16 bg-white shadow flex items-center justify-between px-4 md:px-8">
            <div className="flex items-center gap-3">
                <button onClick={onAbrirMenu} className="lg:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100" aria-label="Abrir menú">
                    <FaBars className="text-xl" />
                </button>
                <span className="text-lg font-semibold text-slate-700">Sistema de peticiones de pago</span>
            </div>

            <div className="flex items-center gap-4 text-slate-600">
                <NotificacionesBell />

                <Link href="/perfil" className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-100 transition">
                    <FaUserCircle className="text-3xl text-slate-400" />
                    <div className="hidden sm:block text-sm text-left leading-tight">
                        <p className="font-semibold text-slate-800">{userData?.name || userData?.email}</p>
                        <p className="text-xs text-slate-500">{userData?.role}</p>
                    </div>
                </Link>
            </div>
        </header>
    );
}
