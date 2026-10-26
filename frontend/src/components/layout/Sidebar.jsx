"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaHome, FaPlusCircle, FaFileInvoiceDollar, FaInbox, FaBell, FaListUl, FaUserShield, FaSignOutAlt, FaLayerGroup, FaReceipt, FaCalendarCheck, FaFolderOpen, FaCashRegister, FaWallet, FaClipboardCheck, FaFileInvoice, FaBalanceScale } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import { ROLES, ROLES_SOLO_CAJA_CHICA } from "../../utils/roles";
import LogoAssetPro from "../auth/LogoAssetPro";

// "roles": quién ve el ítem. Sin "roles", lo ve cualquier usuario.
// "compras": también lo ven los usuarios del área de Compras.
// "jefeCC": lo ven también los Autorizadores que son jefe de caja chica de un área.
// "finanzasCC": lo ven también los Autorizadores de un área de Finanzas (solo lectura).
// "cajaChica": lo ven también los roles que solo usan Caja chica (Cajero y
// Solicitante caja chica), que además ven los ítems que los listan en "roles".
const menu = [
    { name: "Inicio", href: "/dashboard", icon: <FaHome /> },
    { name: "Nueva petición", href: "/peticiones/nueva", icon: <FaPlusCircle /> },
    { name: "Peticiones", href: "/peticiones", icon: <FaFileInvoiceDollar /> },
    { name: "Planes de pago", href: "/planes", icon: <FaLayerGroup />, roles: [ROLES.ADMIN, ROLES.CONTABILIDAD], compras: true },
    { name: "Entrega de facturas", href: "/facturas", icon: <FaReceipt />, roles: [ROLES.ADMIN, ROLES.CONTABILIDAD], compras: true },
    { name: "Recepciones", href: "/recepciones", icon: <FaCalendarCheck />, roles: [ROLES.ADMIN, ROLES.CONTABILIDAD], compras: true },
    // Expediente: cada usuario ve sus anticipos; Compras, Contabilidad y Admin ven todos.
    { name: "Expediente", href: "/expediente", icon: <FaFolderOpen /> },
    { name: "Bandeja", href: "/bandeja", icon: <FaInbox />, roles: [ROLES.AUTORIZADOR, ROLES.CONTABILIDAD] },
    { name: "Notificaciones", href: "/notificaciones", icon: <FaBell />, cajaChica: true },
    { name: "Catálogos", href: "/catalogos", icon: <FaListUl />, roles: [ROLES.ADMIN, ROLES.CONTABILIDAD] },
    { name: "Usuarios", href: "/usuarios", icon: <FaUserShield />, roles: [ROLES.ADMIN] },
    // Caja chica: la piden el Solicitante caja chica y también quienes hacen peticiones de pago.
    { name: "Caja chica", href: "/caja-chica/solicitudes", icon: <FaWallet />, roles: [ROLES.SOLICITANTE_CC, ROLES.EMPLEADO, ROLES.AUTORIZADOR, ROLES.CONTABILIDAD, ROLES.ADMIN] },
    // Solo el jefe de caja chica del área (asignado en Catálogos → Áreas) y el Admin.
    { name: "Aprobaciones caja chica", href: "/caja-chica/aprobaciones", icon: <FaClipboardCheck />, roles: [ROLES.ADMIN], jefeCC: true },
    { name: "Entregas caja chica", href: "/caja-chica/entregas", icon: <FaCashRegister />, roles: [ROLES.CAJERO, ROLES.ADMIN] },
    { name: "Liquidaciones caja chica", href: "/caja-chica/liquidaciones", icon: <FaFileInvoice />, roles: [ROLES.CAJERO, ROLES.ADMIN] },
    { name: "Cuadre de caja", href: "/caja-chica/cuadre", icon: <FaBalanceScale />, roles: [ROLES.CAJERO, ROLES.ADMIN], finanzasCC: true }
];

const estaActivo = (pathname, href) => {
    if (href === "/peticiones") {
        return pathname === "/peticiones" || (/^\/peticiones\/[^/]+/.test(pathname) && pathname !== "/peticiones/nueva");
    }
    if (href === "/expediente") return pathname === "/expediente" || pathname.startsWith("/expediente/");
    if (href === "/planes") return pathname === "/planes" || pathname.startsWith("/planes/");
    return pathname === href;
};

// Menú lateral con el estilo nocturno del login (vidrio oscuro).
export default function Sidebar({ abierto, onCerrar }) {
    const pathname = usePathname();
    const { logout, userRole, userData } = useAuth();
    // Cajero y Solicitante caja chica solo ven Caja chica y Notificaciones;
    // los demás roles, igual que antes.
    const menuVisible = ROLES_SOLO_CAJA_CHICA.includes(userRole)
        ? menu.filter((item) => item.cajaChica || item.roles?.includes(userRole))
        : menu.filter((item) => !item.roles || item.roles.includes(userRole) || (item.compras && userData?.esCompras) || (item.jefeCC && userData?.esJefeCajaChica) || (item.finanzasCC && userData?.esFinanzasCajaChica));

    return (
        <>
            {abierto && <div className="fixed inset-0 z-30 bg-slate-950/60 backdrop-blur-sm lg:hidden" onClick={onCerrar} />}
            <aside
                className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col border-r border-white/10 bg-slate-950/90 text-white backdrop-blur-xl transition-transform lg:static lg:translate-x-0 lg:bg-slate-950/55 ${
                    abierto ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <div className="flex items-center gap-3 px-6 py-6 border-b border-white/10">
                    <LogoAssetPro className="h-10 w-10 flex-none" />
                    <div className="leading-tight">
                        <div className="text-xl font-bold tracking-tight">
                            ASSET <span className="text-blue-500">PRO PAY</span>
                        </div>
                        <div className="text-xs text-slate-400">Peticiones de pago</div>
                    </div>
                </div>

                <nav className="mt-4 flex-1 overflow-y-auto px-3 space-y-1">
                    {menuVisible.map((item) => {
                        const activo = estaActivo(pathname, item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onCerrar}
                                className={`flex items-center gap-3 rounded-xl px-4 py-3 transition ${
                                    activo
                                        ? "bg-gradient-to-r from-blue-500/30 to-blue-700/10 font-semibold text-white ring-1 ring-blue-400/40"
                                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                                }`}
                            >
                                <span className={activo ? "text-blue-300" : ""}>{item.icon}</span>
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <button
                    onClick={logout}
                    className="flex items-center gap-3 px-7 py-4 text-slate-300 hover:bg-white/10 hover:text-white transition border-t border-white/10 text-left"
                >
                    <FaSignOutAlt />
                    Cerrar sesión
                </button>
            </aside>
        </>
    );
}
