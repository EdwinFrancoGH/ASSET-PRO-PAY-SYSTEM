"use client";

import { useCallback, useEffect, useState } from "react";
import { FaPlus } from "react-icons/fa";

import EncabezadoPagina from "../../../components/ui/EncabezadoPagina";
import Cargando from "../../../components/ui/Cargando";
import Modal from "../../../components/ui/Modal";
import Campo from "../../../components/ui/Campo";
import RequireRole from "../../../components/auth/RequireRole";
import { claseInput, botonPrimario, botonSecundario } from "../../../components/ui/estilos";
import { alertaError, toastExito, confirmar } from "../../../components/ui/alertas";

import { useAuth } from "../../../context/AuthContext";
import { obtenerUsuarios, crearUsuario, actualizarUsuario, eliminarUsuario } from "../../../services/users.service";
import { obtenerCatalogo } from "../../../services/catalogos.service";
import { LISTA_ROLES, DESCRIPCION_ROLES, ROLES } from "../../../utils/roles";
import { mensajeError } from "../../../utils/formato";

const vacio = { name: "", email: "", password: "", role: ROLES.EMPLEADO, areaId: "", activo: true };

function Usuarios() {
    const { userData } = useAuth();
    const [usuarios, setUsuarios] = useState(null);
    const [areas, setAreas] = useState([]);
    const [edicion, setEdicion] = useState(null);
    const [guardando, setGuardando] = useState(false);

    const cargar = useCallback(() => {
        obtenerUsuarios()
            .then(({ data }) => setUsuarios(data.data))
            .catch((e) => {
                setUsuarios([]);
                alertaError(mensajeError(e));
            });
    }, []);

    useEffect(() => {
        cargar();
        obtenerCatalogo("areas").then(({ data }) => setAreas(data.data)).catch(() => {});
    }, [cargar]);

    const nombreArea = (id) => areas.find((a) => a.id === id)?.nombre || "—";

    const guardar = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            const { uid, createdAt, ...datos } = edicion;
            const { data } = uid ? await actualizarUsuario(uid, datos) : await crearUsuario(datos);
            toastExito(data.message);
            setEdicion(null);
            cargar();
        } catch (err) {
            alertaError(mensajeError(err));
        } finally {
            setGuardando(false);
        }
    };

    const eliminar = async (u) => {
        const ok = await confirmar({
            titulo: "Eliminar usuario",
            texto: `Se eliminará la cuenta de ${u.name}. Sus peticiones se conservan. Si solo quieres quitarle el acceso, desactívalo.`,
            confirmar: "Eliminar",
            peligro: true
        });
        if (!ok) return;
        try {
            await eliminarUsuario(u.uid);
            toastExito("Usuario eliminado.");
            cargar();
        } catch (e) {
            alertaError(mensajeError(e));
        }
    };

    return (
        <>
            <EncabezadoPagina titulo="Usuarios" descripcion="Crea cuentas y asigna el rol de cada persona.">
                <button onClick={() => setEdicion({ ...vacio })} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-blue-700">
                    <FaPlus /> Nuevo usuario
                </button>
            </EncabezadoPagina>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                {usuarios === null ? (
                    <Cargando />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-left text-slate-600">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Nombre</th>
                                    <th className="px-6 py-4 font-semibold">Correo</th>
                                    <th className="px-6 py-4 font-semibold">Rol</th>
                                    <th className="px-6 py-4 font-semibold">Área</th>
                                    <th className="px-6 py-4 font-semibold">Estado</th>
                                    <th className="px-6 py-4"><span className="sr-only">Acciones</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {usuarios.map((u) => (
                                    <tr key={u.uid} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-medium text-slate-900">{u.name}</td>
                                        <td className="px-6 py-4 text-slate-600">{u.email}</td>
                                        <td className="px-6 py-4 text-slate-700">{u.role}</td>
                                        <td className="px-6 py-4 text-slate-600">{nombreArea(u.areaId)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${u.activo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                                {u.activo ? "Activo" : "Inactivo"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <button onClick={() => setEdicion({ ...vacio, ...u, areaId: u.areaId || "", password: "" })} className="rounded-lg px-3 py-1.5 font-medium text-blue-700 hover:bg-blue-50">Editar</button>
                                            {u.uid !== userData.uid && (
                                                <button onClick={() => eliminar(u)} className="rounded-lg px-3 py-1.5 font-medium text-red-600 hover:bg-red-50">Eliminar</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal abierto={Boolean(edicion)} titulo={edicion?.uid ? "Editar usuario" : "Nuevo usuario"} onCerrar={() => !guardando && setEdicion(null)}>
                {edicion && (
                    <form onSubmit={guardar} className="space-y-4">
                        <Campo etiqueta="Nombre completo" htmlFor="name" requerido>
                            <input id="name" required autoFocus value={edicion.name} onChange={(e) => setEdicion({ ...edicion, name: e.target.value })} className={claseInput} />
                        </Campo>
                        <Campo etiqueta="Correo" htmlFor="email" requerido ayuda="Aquí recibirá los avisos de sus peticiones.">
                            <input id="email" type="email" required value={edicion.email} onChange={(e) => setEdicion({ ...edicion, email: e.target.value })} className={claseInput} />
                        </Campo>
                        <Campo etiqueta={edicion.uid ? "Nueva contraseña" : "Contraseña"} htmlFor="password" requerido={!edicion.uid} ayuda={edicion.uid ? "Déjala vacía para no cambiarla." : "Mínimo 6 caracteres."}>
                            <input id="password" type="password" minLength={6} required={!edicion.uid} autoComplete="new-password" value={edicion.password} onChange={(e) => setEdicion({ ...edicion, password: e.target.value })} className={claseInput} />
                        </Campo>
                        <Campo etiqueta="Rol" htmlFor="role" requerido ayuda={DESCRIPCION_ROLES[edicion.role]}>
                            <select id="role" value={edicion.role} onChange={(e) => setEdicion({ ...edicion, role: e.target.value })} disabled={edicion.uid === userData.uid} className={claseInput}>
                                {LISTA_ROLES.map((r) => <option key={r}>{r}</option>)}
                            </select>
                        </Campo>
                        <Campo etiqueta="Área" htmlFor="area">
                            <select id="area" value={edicion.areaId} onChange={(e) => setEdicion({ ...edicion, areaId: e.target.value })} className={claseInput}>
                                <option value="">Sin área</option>
                                {areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                            </select>
                        </Campo>
                        {edicion.uid && edicion.uid !== userData.uid && (
                            <label className="flex items-center gap-3 text-slate-700">
                                <input type="checkbox" checked={edicion.activo} onChange={(e) => setEdicion({ ...edicion, activo: e.target.checked })} className="h-4 w-4" />
                                Activo (puede iniciar sesión)
                            </label>
                        )}
                        <div className="flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setEdicion(null)} disabled={guardando} className={botonSecundario}>Cancelar</button>
                            <button type="submit" disabled={guardando} className={botonPrimario}>{guardando ? "Guardando..." : "Guardar"}</button>
                        </div>
                    </form>
                )}
            </Modal>
        </>
    );
}

export default function UsuariosPage() {
    return (
        <RequireRole roles={[ROLES.ADMIN]}>
            <Usuarios />
        </RequireRole>
    );
}
