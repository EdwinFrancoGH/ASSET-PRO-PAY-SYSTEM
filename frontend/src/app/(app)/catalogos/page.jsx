"use client";

import { useCallback, useEffect, useState } from "react";
import { FaPlus, FaTrash } from "react-icons/fa";

import EncabezadoPagina from "../../../components/ui/EncabezadoPagina";
import Cargando from "../../../components/ui/Cargando";
import Modal from "../../../components/ui/Modal";
import Campo from "../../../components/ui/Campo";
import RequireRole from "../../../components/auth/RequireRole";
import { claseInput, botonPrimario, botonSecundario } from "../../../components/ui/estilos";
import { alertaError, toastExito, confirmar } from "../../../components/ui/alertas";

import { obtenerCatalogo, crearEnCatalogo, actualizarEnCatalogo, eliminarDeCatalogo } from "../../../services/catalogos.service";
import { ROLES } from "../../../utils/roles";
import { MONEDAS } from "../../../utils/peticion";
import { mensajeError } from "../../../utils/formato";

const PESTANAS = [
    { clave: "proveedores", titulo: "Proveedores", singular: "proveedor" },
    { clave: "areas", titulo: "Áreas", singular: "área" },
    { clave: "terminos-pago", titulo: "Términos de pago", singular: "término de pago" }
];

const cuentaVacia = () => ({ banco: "", tipoCuenta: "Corriente", numeroCuenta: "", titular: "", moneda: "USD", swift: "" });

const registroVacio = (catalogo) => ({
    nombre: "",
    activo: true,
    ...(catalogo === "terminos-pago" ? { dias: "" } : {}),
    ...(catalogo === "proveedores" ? { codigoSAP: "", cuentasBancarias: [] } : {})
});

function Catalogos() {
    const [pestana, setPestana] = useState(PESTANAS[0]);
    const [lista, setLista] = useState(null);
    const [edicion, setEdicion] = useState(null); // { id?, ...datos }
    const [guardando, setGuardando] = useState(false);

    const cargar = useCallback(async () => {
        setLista(null);
        try {
            const { data } = await obtenerCatalogo(pestana.clave);
            setLista(data.data);
        } catch (e) {
            setLista([]);
            alertaError(mensajeError(e));
        }
    }, [pestana]);

    useEffect(() => { cargar(); }, [cargar]);

    const abrir = (registro) =>
        setEdicion(registro ? JSON.parse(JSON.stringify(registro)) : registroVacio(pestana.clave));

    const cambiar = (campo, valor) => setEdicion((e) => ({ ...e, [campo]: valor }));

    const cambiarCuenta = (i, campo, valor) =>
        setEdicion((e) => ({ ...e, cuentasBancarias: e.cuentasBancarias.map((c, j) => (j === i ? { ...c, [campo]: valor } : c)) }));

    const guardar = async (e) => {
        e.preventDefault();
        setGuardando(true);
        try {
            const { id, fechaRegistro, fechaActualizacion, ...datos } = edicion;
            const { data } = id ? await actualizarEnCatalogo(pestana.clave, id, datos) : await crearEnCatalogo(pestana.clave, datos);
            toastExito(data.message);
            setEdicion(null);
            cargar();
        } catch (err) {
            alertaError(mensajeError(err));
        } finally {
            setGuardando(false);
        }
    };

    const eliminar = async (registro) => {
        const ok = await confirmar({
            titulo: `Eliminar ${pestana.singular}`,
            texto: `Se eliminará "${registro.nombre}". Las peticiones existentes conservan sus datos. Si solo quieres ocultarlo del formulario, márcalo como inactivo.`,
            confirmar: "Eliminar",
            peligro: true
        });
        if (!ok) return;
        try {
            await eliminarDeCatalogo(pestana.clave, registro.id);
            toastExito("Eliminado.");
            cargar();
        } catch (e) {
            alertaError(mensajeError(e));
        }
    };

    const esProveedores = pestana.clave === "proveedores";

    return (
        <>
            <EncabezadoPagina titulo="Catálogos" descripcion="Opciones que aparecen en el formulario de petición de pago.">
                <button onClick={() => abrir(null)} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-blue-700">
                    <FaPlus /> Agregar {pestana.singular}
                </button>
            </EncabezadoPagina>

            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="flex gap-1 border-b px-6 pt-4" role="tablist">
                    {PESTANAS.map((p) => (
                        <button
                            key={p.clave}
                            role="tab"
                            aria-selected={pestana.clave === p.clave}
                            onClick={() => setPestana(p)}
                            className={`rounded-t-lg px-4 py-2 font-medium border-b-2 -mb-px ${pestana.clave === p.clave ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
                        >
                            {p.titulo}
                        </button>
                    ))}
                </div>

                {lista === null ? (
                    <Cargando />
                ) : lista.length === 0 ? (
                    <p className="p-10 text-center text-slate-500">Aún no hay registros. Usa “Agregar {pestana.singular}”.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-left text-slate-600">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Nombre</th>
                                    {esProveedores && <th className="px-6 py-4 font-semibold">Código SAP</th>}
                                    {esProveedores && <th className="px-6 py-4 font-semibold">Cuentas</th>}
                                    {pestana.clave === "terminos-pago" && <th className="px-6 py-4 font-semibold">Días</th>}
                                    <th className="px-6 py-4 font-semibold">Estado</th>
                                    <th className="px-6 py-4"><span className="sr-only">Acciones</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {lista.map((r) => (
                                    <tr key={r.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-medium text-slate-900">{r.nombre}</td>
                                        {esProveedores && <td className="px-6 py-4 text-slate-600">{r.codigoSAP || "—"}</td>}
                                        {esProveedores && <td className="px-6 py-4 text-slate-600">{r.cuentasBancarias?.length || 0}</td>}
                                        {pestana.clave === "terminos-pago" && <td className="px-6 py-4 text-slate-600">{r.dias ?? "—"}</td>}
                                        <td className="px-6 py-4">
                                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${r.activo !== false ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                                                {r.activo !== false ? "Activo" : "Inactivo"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <button onClick={() => abrir(r)} className="rounded-lg px-3 py-1.5 font-medium text-blue-700 hover:bg-blue-50">Editar</button>
                                            <button onClick={() => eliminar(r)} className="rounded-lg px-3 py-1.5 font-medium text-red-600 hover:bg-red-50">Eliminar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal
                abierto={Boolean(edicion)}
                titulo={`${edicion?.id ? "Editar" : "Agregar"} ${pestana.singular}`}
                onCerrar={() => !guardando && setEdicion(null)}
                ancho={esProveedores ? "max-w-3xl" : "max-w-lg"}
            >
                {edicion && (
                    <form onSubmit={guardar} className="space-y-5">
                        <div className={`grid grid-cols-1 gap-4 ${esProveedores || pestana.clave === "terminos-pago" ? "sm:grid-cols-2" : ""}`}>
                            <Campo etiqueta="Nombre" htmlFor="nombre" requerido>
                                <input id="nombre" required minLength={2} autoFocus value={edicion.nombre} onChange={(e) => cambiar("nombre", e.target.value)} className={claseInput} />
                            </Campo>
                            {esProveedores && (
                                <Campo etiqueta="Código SAP" htmlFor="codigoSAP">
                                    <input id="codigoSAP" value={edicion.codigoSAP} onChange={(e) => cambiar("codigoSAP", e.target.value)} className={claseInput} />
                                </Campo>
                            )}
                            {pestana.clave === "terminos-pago" && (
                                <Campo etiqueta="Días" htmlFor="dias">
                                    <input id="dias" type="number" min="0" step="1" value={edicion.dias ?? ""} onChange={(e) => cambiar("dias", e.target.value)} className={claseInput} />
                                </Campo>
                            )}
                        </div>

                        <label className="flex items-center gap-3 text-slate-700">
                            <input type="checkbox" checked={edicion.activo !== false} onChange={(e) => cambiar("activo", e.target.checked)} className="h-4 w-4" />
                            Activo (aparece en el formulario de petición)
                        </label>

                        {esProveedores && (
                            <div>
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="font-semibold text-slate-700">Cuentas bancarias</h3>
                                    <button type="button" onClick={() => cambiar("cuentasBancarias", [...edicion.cuentasBancarias, cuentaVacia()])} className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:underline">
                                        <FaPlus /> Agregar cuenta
                                    </button>
                                </div>
                                {edicion.cuentasBancarias.length === 0 && <p className="text-sm text-slate-500">Sin cuentas. El solicitante tendrá que escribir la cuenta en cada petición.</p>}
                                <div className="space-y-4">
                                    {edicion.cuentasBancarias.map((c, i) => (
                                        <fieldset key={c.id || i} className="rounded-xl border border-slate-200 p-4">
                                            <legend className="px-2 text-sm text-slate-500">Cuenta {i + 1}</legend>
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                                <Campo etiqueta="Banco" htmlFor={`banco-${i}`} requerido>
                                                    <input id={`banco-${i}`} required value={c.banco} onChange={(e) => cambiarCuenta(i, "banco", e.target.value)} className={claseInput} />
                                                </Campo>
                                                <Campo etiqueta="Número de cuenta" htmlFor={`num-${i}`} requerido>
                                                    <input id={`num-${i}`} required value={c.numeroCuenta} onChange={(e) => cambiarCuenta(i, "numeroCuenta", e.target.value)} className={claseInput} />
                                                </Campo>
                                                <Campo etiqueta="Tipo" htmlFor={`tipo-${i}`}>
                                                    <select id={`tipo-${i}`} value={c.tipoCuenta} onChange={(e) => cambiarCuenta(i, "tipoCuenta", e.target.value)} className={claseInput}>
                                                        <option>Corriente</option>
                                                        <option>Ahorro</option>
                                                    </select>
                                                </Campo>
                                                <Campo etiqueta="Titular" htmlFor={`tit-${i}`}>
                                                    <input id={`tit-${i}`} value={c.titular} onChange={(e) => cambiarCuenta(i, "titular", e.target.value)} className={claseInput} />
                                                </Campo>
                                                <Campo etiqueta="Moneda" htmlFor={`mon-${i}`}>
                                                    <select id={`mon-${i}`} value={c.moneda} onChange={(e) => cambiarCuenta(i, "moneda", e.target.value)} className={claseInput}>
                                                        {MONEDAS.map((m) => <option key={m}>{m}</option>)}
                                                    </select>
                                                </Campo>
                                                <Campo etiqueta="SWIFT / ABA" htmlFor={`sw-${i}`}>
                                                    <input id={`sw-${i}`} value={c.swift || ""} onChange={(e) => cambiarCuenta(i, "swift", e.target.value)} className={claseInput} />
                                                </Campo>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => cambiar("cuentasBancarias", edicion.cuentasBancarias.filter((_, j) => j !== i))}
                                                className="mt-3 inline-flex items-center gap-2 text-sm text-red-600 hover:underline"
                                            >
                                                <FaTrash /> Quitar cuenta
                                            </button>
                                        </fieldset>
                                    ))}
                                </div>
                            </div>
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

export default function CatalogosPage() {
    return (
        <RequireRole roles={[ROLES.ADMIN, ROLES.CONTABILIDAD]}>
            <Catalogos />
        </RequireRole>
    );
}
