"use client";

import { useState } from "react";
import Link from "next/link";
import { FiMail, FiSend, FiArrowLeft, FiCheckCircle } from "react-icons/fi";
import { useAuth } from "../../../context/AuthContext";
import LogoAssetPro from "../../../components/auth/LogoAssetPro";
import {
    etiquetaAuth,
    cajaInputAuth,
    inputAuth,
    iconoInputAuth,
    botonAuth,
    enlaceAuth
} from "../../../components/auth/estilosAuth";

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
            <div className="space-y-5 text-center">
                <FiCheckCircle className="mx-auto text-6xl text-emerald-400" />
                <h1 className="text-3xl font-bold text-white">Revisa tu correo</h1>
                <p className="text-slate-300">
                    Si <strong className="text-white">{email}</strong> tiene una cuenta, te enviamos un enlace para crear una nueva contraseña.
                </p>
                <Link href="/login" className={`${enlaceAuth} inline-flex items-center gap-2`}>
                    <FiArrowLeft /> Volver a iniciar sesión
                </Link>
            </div>
        );
    }

    return (
        <form onSubmit={onSubmit} className="space-y-5">
            <div className="flex flex-col items-center text-center">
                <LogoAssetPro className="h-16 w-16 drop-shadow-[0_0_18px_rgba(59,130,246,0.55)]" />
                <h1 className="mt-4 text-3xl font-bold text-white">Recuperar contraseña</h1>
                <p className="mt-1 text-slate-300">Escribe tu correo y te enviaremos un enlace para restablecerla.</p>
            </div>

            <div>
                <label htmlFor="email" className={etiquetaAuth}>Correo electrónico</label>
                <div className={cajaInputAuth}>
                    <FiMail className={iconoInputAuth} />
                    <input
                        id="email"
                        type="email"
                        required
                        placeholder="ejemplo@correo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={inputAuth}
                    />
                </div>
            </div>

            <button type="submit" disabled={estado === "enviando"} className={botonAuth}>
                <FiSend className="text-xl" />
                {estado === "enviando" ? "Enviando..." : "Enviar enlace"}
            </button>

            <p className="text-center">
                <Link href="/login" className={`${enlaceAuth} inline-flex items-center gap-2`}>
                    <FiArrowLeft /> Volver a iniciar sesión
                </Link>
            </p>
        </form>
    );
}
