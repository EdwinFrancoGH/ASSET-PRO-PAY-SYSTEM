"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaHome, FaPlusCircle, FaFileInvoiceDollar, FaInbox, FaBell, FaListUl, FaUserShield, FaSignOutAlt } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { ROLES } from "../../utils/roles";

// "roles": quién ve el ítem. Sin "roles", lo ve cualquier usuario.
const menu = [
    { name: "Inicio", href: "/dashboard", icon: <FaHome /> },
    { name: "Nueva petición", href: "/peticiones/nueva", icon: <FaPlusCircle /> },
    { name: "Peticiones", href: "/peticiones", icon: <FaFileInvoiceDollar /> },
    { name: "Bandeja", href: "/bandeja", icon: <FaInbox />, roles: [ROLES.AUTORIZADOR, ROLES.CONTABILIDAD] },
    { name: "Notificaciones", href: "/notificaciones", icon: <FaBell /> },
    { name: "Catálogos", href: "/catalogos", icon: <FaListUl />, roles: [ROLES.ADMIN, ROLES.CONTABILIDAD] },
    { name: "Usuarios", href: "/usuarios", icon: <FaUserShield />, roles: [ROLES.ADMIN] }
];

const estaActivo = (pathname, href) => {
    if (href === "/peticiones") {
        return pathname === "/peticiones" || (/^\/peticiones\/[^/]+/.test(pathname) && pathname !== "/peticiones/nueva");
    }
    return pathname === href;
};

export default function Sidebar({ abierto, onCerrar }) {
    const pathname = usePathname();
    const { logout, userRole } = useAuth();
    const menuVisible = menu.filter((item) => !item.roles || item.roles.includes(userRole));

    return (
        <>
            {abierto && <div className="fixed inset-0 z-30 bg-slate-900/50 lg:hidden" onClick={onCerrar} />}
            <aside
                className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white flex flex-col transition-transform lg:static lg:translate-x-0 ${
                    abierto ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="p-6 border-b border-slate-700">
                    <div className="text-2xl font-bold tracking-tight">ASSET PRO</div>
                    <div className="text-sm text-slate-400">Peticiones de pago</div>
                </div>

                <nav className="mt-4 flex-1 overflow-y-auto">
                    {menuVisible.map((item) => {
                        const activo = estaActivo(pathname, item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onCerrar}
                                className={`flex items-center gap-3 px-6 py-3.5 transition border-l-4 ${
                                    activo ? "bg-slate-800 border-blue-500 font-semibold" : "border-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
                                }`}
                            >
                                {item.icon}
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-6 py-4 text-slate-300 hover:bg-slate-800 hover:text-white transition border-t border-slate-700 text-left"
                >
                    <FaSignOutAlt />
                    Cerrar sesión
                </button>
            </aside>
        </>
    );
}
