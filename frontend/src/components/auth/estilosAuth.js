// Estilos de las pantallas de acceso (login / recuperar contraseña):
// tema oscuro azul con efecto "vidrio".

export const etiquetaAuth = "block text-sm font-semibold text-slate-100";

// Contenedor del input (lleva el ícono a la izquierda y acciones a la derecha)
export const cajaInputAuth =
    "group mt-2 flex items-center gap-3 rounded-xl border border-white/15 bg-slate-900/40 px-4 " +
    "transition focus-within:border-blue-400 focus-within:bg-slate-900/60 focus-within:ring-2 focus-within:ring-blue-500/30";

export const inputAuth =
    "input-auth h-14 w-full bg-transparent text-slate-100 placeholder:text-slate-400 focus:outline-none";

export const iconoInputAuth = "shrink-0 text-xl text-slate-300 group-focus-within:text-blue-300";

export const botonAuth =
    "relative flex h-14 w-full items-center justify-center gap-3 rounded-xl " +
    "bg-gradient-to-r from-blue-500 to-blue-700 font-semibold text-white text-lg " +
    "shadow-lg shadow-blue-900/50 transition hover:from-blue-400 hover:to-blue-600 " +
    "disabled:cursor-not-allowed disabled:opacity-60";

export const enlaceAuth = "text-sm text-blue-400 hover:text-blue-300 hover:underline";

export const alertaErrorAuth = "rounded-xl border border-red-400/30 bg-red-500/15 p-3 text-sm text-red-200";
export const alertaAvisoAuth = "rounded-xl border border-amber-400/30 bg-amber-500/15 p-3 text-sm text-amber-100";
export const alertaExitoAuth = "rounded-xl border border-emerald-400/30 bg-emerald-500/15 p-3 text-sm text-emerald-100";
