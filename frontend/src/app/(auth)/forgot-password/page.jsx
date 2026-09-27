"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";
import { claseInput, botonPrimario } from "../../../components/ui/estilos";

export default function ForgotPasswordPage() {
    const { resetPassword } = useAuth();
    const [email, setEmail] = useState("");
    const [estado, setEstado] = useState("inicial"); // inicial | enviando | enviado

    const onSubmit = async (e) => {
        e.preventDefault();
        setEstado("enviando");
        try {
            await resetPassword(email.trim());
        } catch {
            // No se revela si el correo existe o no.
        }
        setEstado("enviado");
    };

    if (estado === "enviado") {
        return (
            <div className="space-y-4 text-center">
                <h1 className="text-2xl font-bold text-slate-800">Revisa tu correo</h1>
                <p className="text-slate-600">
                    Si <strong>{email}</strong> tiene una cuenta, te enviamos un enlace para crear una nueva contraseña.
                </p>
                <Link href="/login" className="inline-block text-blue-600 hover:underline">Volver a iniciar sesión</Link>
            </div>
        );
    }

    return (
        <form onSubmit={onSubmit} className="space-y-5">
            <h1 className="text-2xl font-bold text-slate-800">Recuperar contraseña</h1>
            <p className="text-sm text-slate-600">Escribe tu correo y te enviaremos un enlace para restablecerla.</p>

            <div>
                <label htmlFor="email" className="text-sm font-medium text-gray-600">Correo</label>
                <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={claseInput} />
            </div>

            <button type="submit" disabled={estado === "enviando"} className={`${botonPrimario} w-full`}>
                {estado === "enviando" ? "Enviando..." : "Enviar enlace"}
            </button>

            <p className="text-center text-sm">
                <Link href="/login" className="text-blue-600 hover:underline">Volver a iniciar sesión</Link>
            </p>
        </form>
    );
}
