"use client";

import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import Campo from "../ui/Campo";
import { claseInput, botonPrimario, botonSecundario } from "../ui/estilos";
import { alertaError, toastExito } from "../ui/alertas";
import { obtenerUsuarios } from "../../services/users.service";
import { asignarJefeCajaChica } from "../../services/catalogos.service";
import { ROLES } from "../../utils/roles";
import { mensajeError } from "../../utils/formato";

// Solo Administrador: elige qué Autorizador aprueba la caja chica del área.
// Un mismo jefe puede tener varias áreas.
export default function JefeCajaChicaModal({ area, onCerrar, onGuardado }) {
    const [jefes, setJefes] = useState(null);
    const [jefeId, setJefeId] = useState(area?.jefeCajaChicaId || "");
    const [apruebaJefes, setApruebaJefes] = useState(area?.apruebaCajaChicaJefes === true);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        if (!area) return;
        setJefeId(area.jefeCajaChicaId || "");
        setApruebaJefes(area.apruebaCajaChicaJefes === true);
        obtenerUsuarios()
            .then(({ data }) => setJefes(data.data.filter((u) => u.role === ROLES.AUTORIZADOR && u.activo)))
            .catch((e) => {
                setJefes([]);
                alertaError(mensajeError(e));
            });
    }, [area]);

    const guardar = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            const { data } = await asignarJefeCajaChica(area.id, jefeId || null, apruebaJefes);
            toastExito(data.message);
            onGuardado();
        } catch (err) {
            alertaError(mensajeError(err));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal abierto={Boolean(area)} titulo={`Jefe de caja chica — ${area?.nombre || ""}`} onCerrar={() => !guardando && onCerrar()}>
            {area && (
                <form onSubmit={guardar} className="space-y-5">
                    <Campo
                        etiqueta="Jefe que aprueba caja chica"
                        htmlFor="jefeCajaChica"
                        ayuda="Recibirá para aprobar las solicitudes de caja chica de esta área. Solo aparecen usuarios activos con rol Autorizador."
                    >
                        <select id="jefeCajaChica" value={jefeId} onChange={(e) => setJefeId(e.target.value)} disabled={jefes === null} className={claseInput}>
                            <option value="">{jefes === null ? "Cargando..." : "Sin jefe asignado"}</option>
                            {(jefes || []).map((u) => <option key={u.uid} value={u.uid}>{u.name} ({u.email})</option>)}
                        </select>
                    </Campo>
                    <label className="flex items-start gap-3 text-slate-200">
                        <input type="checkbox" checked={apruebaJefes} onChange={(e) => setApruebaJefes(e.target.checked)} className="mt-1 h-4 w-4" />
                        <span>
                            Área de Finanzas: aprueba la caja chica de los jefes
                            <span className="block text-xs text-slate-400">Cuando un jefe de área pide caja chica para sí mismo, la puede aprobar cualquier Autorizador activo de esta área (ej. gerente financiero o contador).</span>
                        </span>
                    </label>

                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={onCerrar} disabled={guardando} className={botonSecundario}>Cancelar</button>
                        <button type="submit" disabled={guardando || jefes === null} className={botonPrimario}>{guardando ? "Guardando..." : "Guardar"}</button>
                    </div>
                </form>
            )}
        </Modal>
    );
}
