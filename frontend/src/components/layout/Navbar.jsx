"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    FaBars,
    FaUserCircle,
    FaHome,
    FaPlusCircle,
    FaFileInvoiceDollar,
    FaInbox,
    FaBell,
    FaListUl,
    FaUserShield,
    FaUser,
    FaEdit,
    FaLayerGroup,
    FaReceipt,
    FaCalendarCheck,
    FaFolderOpen,
    FaCashRegister,
    FaWallet,
    FaClipboardCheck,
    FaFileInvoice,
    FaBalanceScale
} from "react-icons/fa";
import { useAuth } from "../../context/AuthContext";
import NotificacionesBell from "./NotificacionesBell";
import InterruptorTema from "./InterruptorTema";

// Título de la barra según la sección en la que está el usuario.
// Se revisan en orden: las rutas más específicas van primero.
const SECCIONES = [
    { patron: /^\/dashboard$/, titulo: "Panel principal", subtitulo: "Resumen de tus peticiones de pago", icono: FaHome },
    { patron: /^\/peticiones\/nueva$/, titulo: "Nueva Petición de Pago", subtitulo: "Registra una nueva solicitud de pago completando la información", icono: FaPlusCircle },
    { patron: /^\/peticiones\/[^/]+\/editar$/, titulo: "Editar petición", subtitulo: "Corrige los datos de la solicitud", icono: FaEdit },
    { patron: /^\/peticiones\/[^/]+$/, titulo: "Detalle de la petición", subtitulo: "Información, adjuntos e historial", icono: FaFileInvoiceDollar },
    { patron: /^\/peticiones$/, titulo: "Peticiones", subtitulo: "Consulta y da seguimiento a las solicitudes", icono: FaFileInvoiceDollar },
    { patron: /^\/planes\/nuevo$/, titulo: "Nuevo Plan de Pago", subtitulo: "Registra una compra con pagos en cuotas (anticipos y pago final)", icono: FaLayerGroup },
    { patron: /^\/planes\/[^/]+$/, titulo: "Plan de Pago", subtitulo: "Cuotas, avance e historial de cambios", icono: FaLayerGroup },
    { patron: /^\/planes$/, titulo: "Planes de Pago", subtitulo: "Compras con pagos proporcionales en cuotas", icono: FaLayerGroup },
    { patron: /^\/facturas$/, titulo: "Entrega de Facturas", subtitulo: "Facturas de crédito y contado que Compras entrega a Contabilidad", icono: FaReceipt },
    { patron: /^\/recepciones$/, titulo: "Recepciones", subtitulo: "Facturas recibidas por Contabilidad, agrupadas por día", icono: FaCalendarCheck },
    { patron: /^\/expediente\/[^/]+$/, titulo: "Expediente del Anticipo", subtitulo: "Facturas que compensan el anticipo y saldo pendiente", icono: FaFolderOpen },
    { patron: /^\/expediente$/, titulo: "Expediente", subtitulo: "Anticipos pagados y su compensación con facturas", icono: FaFolderOpen },
    { patron: /^\/bandeja$/, titulo: "Bandeja de aprobación", subtitulo: "Peticiones que esperan tu revisión", icono: FaInbox },
    { patron: /^\/notificaciones$/, titulo: "Notificaciones", subtitulo: "Avisos sobre tus peticiones", icono: FaBell },
    { patron: /^\/catalogos$/, titulo: "Catálogos", subtitulo: "Proveedores, áreas y datos de referencia", icono: FaListUl },
    { patron: /^\/usuarios$/, titulo: "Usuarios", subtitulo: "Administración de cuentas y roles", icono: FaUserShield },
    { patron: /^\/perfil$/, titulo: "Mi perfil", subtitulo: "Tus datos de usuario", icono: FaUser },
    { patron: /^\/caja-chica\/entregas$/, titulo: "Entregas de Caja Chica", subtitulo: "Ingresa el token de la solicitud para entregar el efectivo", icono: FaCashRegister },
    { patron: /^\/caja-chica\/solicitudes$/, titulo: "Mis solicitudes de Caja Chica", subtitulo: "Pide efectivo (máx. $50) y da seguimiento a tu liquidación", icono: FaWallet },
    { patron: /^\/caja-chica\/aprobaciones$/, titulo: "Aprobaciones de Caja Chica", subtitulo: "Solicitudes de efectivo de tus áreas que esperan tu decisión", icono: FaClipboardCheck },
    { patron: /^\/caja-chica\/liquidaciones$/, titulo: "Liquidaciones de Caja Chica", subtitulo: "Facturas, vueltos y reintegros del efectivo entregado", icono: FaFileInvoice },
    { patron: /^\/caja-chica\/cuadre$/, titulo: "Cuadre de Caja Chica", subtitulo: "Entradas y salidas de efectivo del día, con Excel", icono: FaBalanceScale }
];

const SECCION_POR_DEFECTO = { titulo: "ASSET PRO PAY", subtitulo: "Sistema de peticiones de pago", icono: FaHome };

// oscuro: estilo "vidrio" del login (prueba de diseño nocturno).
export default function Navbar({ onAbrirMenu, oscuro = false }) {
    const { userData } = useAuth();
    const pathname = usePathname();
    const seccion = SECCIONES.find((s) => s.patron.test(pathname)) || SECCION_POR_DEFECTO;
    const Icono = seccion.icono;

    const c = oscuro
        ? {
              barra: "relative z-20 mx-4 mt-4 md:mx-8 rounded-2xl border border-white/10 bg-slate-900/45 backdrop-blur-md shadow-xl shadow-black/30",
              menu: "text-slate-200 hover:bg-white/10",
              icono: "bg-blue-500/15 text-blue-300",
              titulo: "text-white",
              subtitulo: "text-slate-300",
              perfil: "hover:bg-white/10",
              avatar: "text-slate-300",
              nombre: "text-white",
              rol: "text-slate-400"
          }
        : {
              barra: "bg-white shadow",
              menu: "text-slate-600 hover:bg-slate-100",
              icono: "bg-blue-50 text-blue-600",
              titulo: "text-slate-800",
              subtitulo: "text-slate-500",
              perfil: "hover:bg-slate-100",
              avatar: "text-slate-400",
              nombre: "text-slate-800",
              rol: "text-slate-500"
          };

    return (
        <header className={`min-h-20 sm:min-h-24 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 md:px-6 ${c.barra}`}>
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <button onClick={onAbrirMenu} className={`lg:hidden flex-none rounded-lg p-2 ${c.menu}`} aria-label="Abrir menú">
                    <FaBars className="text-xl" />
                </button>
                <span className={`hidden sm:flex h-14 w-14 flex-none items-center justify-center rounded-2xl text-2xl ${c.icono}`}>
                    <Icono />
                </span>
                <div className="min-w-0 leading-tight">
                    {/* Mismo tamaño que el encabezado de página (EncabezadoPagina). */}
                    <h1 className={`truncate text-lg font-bold sm:text-2xl md:text-3xl ${c.titulo}`}>{seccion.titulo}</h1>
                    <p className={`mt-1 hidden sm:block truncate text-base ${c.subtitulo}`}>{seccion.subtitulo}</p>
                </div>
            </div>

            <div className="flex flex-none items-center gap-1 sm:gap-4">
                {/* Cambio de apariencia (modo día / modo noche) */}
                <InterruptorTema />
                <NotificacionesBell oscuro={oscuro} />

                <Link href="/perfil" className={`flex items-center gap-2 rounded-lg px-1 py-1 sm:px-2 transition ${c.perfil}`}>
                    <FaUserCircle className={`text-2xl sm:text-3xl ${c.avatar}`} />
                    <div className="hidden sm:block text-sm text-left leading-tight">
                        <p className={`font-semibold ${c.nombre}`}>{userData?.name || userData?.email}</p>
                        <p className={`text-xs ${c.rol}`}>{userData?.role}</p>
                    </div>
                </Link>
            </div>
        </header>
    );
}
