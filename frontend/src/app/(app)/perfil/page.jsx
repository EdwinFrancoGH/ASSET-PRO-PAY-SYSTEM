"use client";

import { useState } from "react";

import EncabezadoPagina from "../../../components/ui/EncabezadoPagina";
import Seccion from "../../../components/ui/Seccion";
import Campo from "../../../components/ui/Campo";
import { claseInput, botonPrimario } from "../../../components/ui/estilos";
import { alertaError, toastExito } from "../../../components/ui/alertas";
import { useAuth } from "../../../context/AuthContext";
import { actualizarPerfil } from "../../../services/users.service";
import { mensajeError } from "../../../utils/formato";

export default function PerfilPage() {
    const { userData, refreshUserData } = useAuth();
    const [name, setName] = useState(userData.name || "");
    const [password, setPassword] = useState("");
    const [confirmacion, setConfirmacion] = useState("");
    const [guardando, setGuardando] = useState(false);

    const guardar = async (e) => {
        e.preventDefault();
        if (password && password !== confirmacion) return alertaError("Las contraseñas no coinciden.");
        setGuardando(true);
        try {
            await actualizarPerfil({ name: name.trim(), ...(password ? { password } : {}) });
            await refreshUserData();
            setPassword("");
            setConfirmacion("");
            toastExito("Perfil actualizado.");
        } catch (err) {
            alertaError(mensajeError(err));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <>
            <EncabezadoPagina titulo="Mi perfil" descripcion={`${userData.email}, ${userData.role}`} />
            <Seccion titulo="Datos de la cuenta" className="max-w-2xl">
                <form onSubmit={guardar} className="space-y-5">
                    <Campo etiqueta="Nombre completo" htmlFor="name" requerido>
                        <input id="name" required value={name} onChange={(e) => setName(e.target.value)} className={claseInput} />
                    </Campo>
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                        <Campo etiqueta="Nueva contraseña" htmlFor="password" ayuda="Déjala vacía para no cambiarla.">
                            <input id="password" type="password" minLength={6} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={claseInput} />
                        </Campo>
                        <Campo etiqueta="Confirmar contraseña" htmlFor="confirmacion">
                            <input id="confirmacion" type="password" autoComplete="new-password" value={confirmacion} onChange={(e) => setConfirmacion(e.target.value)} className={claseInput} />
                        </Campo>
                    </div>
                    <div className="flex justify-end">
                        <button type="submit" disabled={guardando} className={botonPrimario}>{guardando ? "Guardando..." : "Guardar cambios"}</button>
                    </div>
                </form>
            </Seccion>
        </>
    );
}
