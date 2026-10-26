"use client";

import { useEffect, useState } from "react";
import { BsSunFill, BsMoonStarsFill } from "react-icons/bs";

// Interruptor de apariencia: modo noche (actual) / modo día.
// Solo cambia la clase "tema-claro" en <html> y la recuerda en este
// navegador (localStorage). No toca datos ni lógica del sistema.
// Los colores van en "style" para que el modo claro no los reinterprete.
const CLAVE = "assetpro-tema";

const COLORES = {
    dia: { fondo: "linear-gradient(90deg, #f472b6 0%, #fb923c 100%)", borde: "#ea580c", texto: "#b4234f", icono: "#facc15" },
    noche: { fondo: "linear-gradient(90deg, #2563eb 0%, #4338ca 100%)", borde: "#1e3a8a", texto: "#bfdbfe", icono: "#22d3ee" }
};

export default function InterruptorTema() {
    const [claro, setClaro] = useState(false);
    const [listo, setListo] = useState(false);

    // Lee el modo que ya aplicó el script de layout.js
    useEffect(() => {
        setClaro(document.documentElement.classList.contains("tema-claro"));
        setListo(true);
    }, []);

    const cambiar = () => {
        const nuevo = !claro;
        document.documentElement.classList.toggle("tema-claro", nuevo);
        try {
            localStorage.setItem(CLAVE, nuevo ? "claro" : "oscuro");
        } catch {
            // Sin almacenamiento disponible: el cambio dura solo esta sesión.
        }
        setClaro(nuevo);
    };

    const c = claro ? COLORES.dia : COLORES.noche;

    return (
        <button
            type="button"
            role="switch"
            aria-checked={claro}
            aria-label={claro ? "Modo día activo. Cambiar a modo noche" : "Modo noche activo. Cambiar a modo día"}
            title={claro ? "Cambiar a modo noche" : "Cambiar a modo día"}
            onClick={cambiar}
            className={`relative h-8 w-14 flex-none overflow-hidden rounded-full shadow-inner transition-opacity duration-300 sm:h-10 sm:w-[8.75rem] ${listo ? "opacity-100" : "opacity-0"}`}
            style={{ background: c.fondo, boxShadow: `inset 0 0 0 2px ${c.borde}, 0 2px 8px rgba(0,0,0,0.18)` }}
        >
            {/* Texto del modo (se oculta en pantallas pequeñas) */}
            <span
                className={`pointer-events-none absolute inset-y-0 hidden items-center text-[11px] font-extrabold tracking-wider sm:flex ${
                    claro ? "left-3" : "right-3"
                }`}
                style={{ color: c.texto }}
            >
                {claro ? "MODO DÍA" : "MODO NOCHE"}
            </span>

            {/* Perilla con el ícono */}
            <span
                className={`absolute top-1 flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300 ease-out sm:h-8 sm:w-8 ${
                    claro ? "left-[calc(100%-1.75rem)] sm:left-[calc(100%-2.25rem)]" : "left-1"
                }`}
                style={{
                    background: "radial-gradient(circle at 35% 30%, #ffffff 0%, #eef2f7 100%)",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.25)"
                }}
            >
                {claro ? (
                    <BsSunFill className="text-sm sm:text-lg" style={{ color: c.icono }} />
                ) : (
                    <BsMoonStarsFill className="text-xs sm:text-base" style={{ color: c.icono }} />
                )}
            </span>
        </button>
    );
}
