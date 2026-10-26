"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// La ventana se dibuja directamente en <body> (portal). Si se dibujara dentro
// de una tarjeta con efecto "vidrio" (backdrop-blur), quedaría atrapada dentro
// de esa tarjeta y se encimaría con el contenido de al lado.
export default function Modal({ abierto, titulo, onCerrar, children, ancho = "max-w-lg" }) {
    const [montado, setMontado] = useState(false);
    useEffect(() => setMontado(true), []);

    useEffect(() => {
        if (!abierto) return;
        const alPresionar = (e) => e.key === "Escape" && onCerrar?.();
        window.addEventListener("keydown", alPresionar);
        return () => window.removeEventListener("keydown", alPresionar);
    }, [abierto, onCerrar]);

    if (!abierto || !montado) return null;

    return createPortal(
        <div className="tema-nocturno fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4" onMouseDown={onCerrar}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={titulo}
                className={`w-full ${ancho} max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900/95 backdrop-blur-xl ring-1 ring-white/15 shadow-2xl shadow-black/60 text-slate-100`}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
                    <h2 className="text-xl font-bold text-slate-100">{titulo}</h2>
                    <button onClick={onCerrar} aria-label="Cerrar" className="text-2xl leading-none text-slate-400 hover:text-white">×</button>
                </div>
                <div className="px-6 py-5">{children}</div>
            </div>
        </div>,
        document.body
    );
}
