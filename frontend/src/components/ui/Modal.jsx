"use client";

import { useEffect } from "react";

export default function Modal({ abierto, titulo, onCerrar, children, ancho = "max-w-lg" }) {
    useEffect(() => {
        if (!abierto) return;
        const alPresionar = (e) => e.key === "Escape" && onCerrar?.();
        window.addEventListener("keydown", alPresionar);
        return () => window.removeEventListener("keydown", alPresionar);
    }, [abierto, onCerrar]);

    if (!abierto) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onMouseDown={onCerrar}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={titulo}
                className={`w-full ${ancho} max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl`}
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <h2 className="text-xl font-bold text-slate-800">{titulo}</h2>
                    <button onClick={onCerrar} aria-label="Cerrar" className="text-2xl leading-none text-slate-400 hover:text-slate-700">×</button>
                </div>
                <div className="px-6 py-5">{children}</div>
            </div>
        </div>
    );
}
