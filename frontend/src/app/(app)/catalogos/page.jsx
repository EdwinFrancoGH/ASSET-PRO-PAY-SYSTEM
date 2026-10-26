"use client";

import { useCallback, useEffect, useState } from "react";
import { FaPlus } from "react-icons/fa";

import EncabezadoPagina from "../../../components/ui/EncabezadoPagina";
import Cargando from "../../../components/ui/Cargando";
import Modal from "../../../components/ui/Modal";
import Campo from "../../../components/ui/Campo";
import RequireRole from "../../../components/auth/RequireRole";
import CuentaProveedor from "../../../components/catalogos/CuentaProveedor";
import TipoBadge from "../../../components/peticiones/TipoBadge";
import JefeCajaChicaModal from "../../../components/catalogos/JefeCajaChicaModal";
import { useAuth } from "../../../context/AuthContext";
import { claseInput, botonPrimario, botonSecundario } from "../../../components/ui/estilos";
import { alertaError, toastExito, confirmar } from "../../../components/ui/alertas";

import { obtenerCatalogo, crearEnCatalogo, actualizarEnCatalogo, eliminarDeCatalogo } from "../../../services/catalogos.service";
import { ROLES } from "../../../utils/roles";
import { ETIQUETA_CLASIFICACION } from "../../../utils/impuestos";
import { ORIGENES, origenDeProveedor, convertirCuenta, cuentaLocalVacia, cuentaExteriorVacia } from "../../../utils/bancario";
import { mensajeError } from "../../../utils/formato";

const PESTANAS = [
    { clave: "proveedores", titulo: "Proveedores", singular: "proveedor" },
    { clave: "areas", titulo: "Áreas", singular: "área" },
    { clave: "terminos-pago", titulo: "Términos de pago", singular: "término de pago" }
];

const cuentaVacia = (origen) => (origen === ORIGENES.EXTERIOR ? cuentaExteriorVacia() : cuentaLocalVacia());

// Cuentas guardadas antes del cambio: se completan con los campos del origen.
const prepararCuenta = (c, origen) => {
    const completa = { ...convertirCuenta(c, origen), ...c };
    if (origen === ORIGENES.LOCAL) completa.tipoCuenta = convertirCuenta(c, origen).tipoCuenta;
    if (!completa.tipoPersona) completa.tipoPersona = "JURIDICO";
    return completa;
};

const registroVacio = (catalogo) => ({
    nombre: "",
    activo: true,
    ...(catalogo === "terminos-pago" ? { dias: "" } : {}),
    ...(catalogo === "areas" ? { permiteExterior: false } : {}),
    ...(catalogo === "proveedores" ? { codigoSAP: "", origen: ORIGENES.LOCAL, clasificacionContribuyente: "", cuentasBancarias: [] } : {})
});

function Catalogos() {
    const [pestana, setPestana] = useState(PESTANAS[0]);
    const [lista, setLista] = useState(null);
    const [edicion, setEdicion] = useState(null); // { id?, ...datos }
    const [guardando, setGuardando] = useState(false);
    // Caja chica: área a la que el Administrador le asigna el jefe que aprueba.
    const [areaJefe, setAreaJefe] = useState(null);
    const { userRole } = useAuth();
    const esAdmin = userRole === ROLES.ADMIN;

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

    const abrir = (registro) => {
        if (!registro) return setEdicion(registroVacio(pestana.clave));
        const copia = JSON.parse(JSON.stringify(registro));
        if (pestana.clave === "proveedores") {
            copia.origen = origenDeProveedor(copia);
            copia.cuentasBancarias = (copia.cuentasBancarias || []).map((c) => prepararCuenta(c, copia.origen));
        }
        setEdicion(copia);
    };

    // Al cambiar Local ↔ Exterior se conservan banco, cuenta, titular y tipo.
    const cambiarOrigen = (origen) =>
        setEdicion((e) => ({ ...e, origen, cuentasBancarias: e.cuentasBancarias.map((c) => convertirCuenta(c, origen)) }));

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
                <button onClick={() => abrir(null)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-900/50 transition hover:from-blue-400 hover:to-blue-600">
                    <FaPlus /> Agregar {pestana.singular}
                </button>
            </EncabezadoPagina>

            <div className="bg-slate-800/35 backdrop-blur-xl ring-1 ring-white/15 rounded-2xl shadow-lg overflow-hidden">
                <div className="flex gap-1 border-b px-6 pt-4" role="tablist">
                    {PESTANAS.map((p) => (
                        <button
                            key={p.clave}
                            role="tab"
                            aria-selected={pestana.clave === p.clave}
                            onClick={() => setPestana(p)}
                            className={`rounded-t-lg px-4 py-2 font-medium border-b-2 -mb-px ${pestana.clave === p.clave ? "border-blue-600 text-blue-300" : "border-transparent text-slate-400 hover:text-white"}`}
                        >
                            {p.titulo}
                        </button>
                    ))}
                </div>

                {lista === null ? (
                    <Cargando />
                ) : lista.length === 0 ? (
                    <p className="p-10 text-center text-slate-400">Aún no hay registros. Usa “Agregar {pestana.singular}”.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-white/5 text-left text-slate-300">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">Nombre</th>
                                    {esProveedores && <th className="px-6 py-4 font-semibold">Origen</th>}
                                    {esProveedores && <th className="px-6 py-4 font-semibold">Código SAP</th>}
                                    {esProveedores && <th className="px-6 py-4 font-semibold">Cuentas</th>}
                                    {pestana.clave === "terminos-pago" && <th className="px-6 py-4 font-semibold">Días</th>}
                                    {pestana.clave === "areas" && <th className="px-6 py-4 font-semibold">Área de Compras</th>}
                                    {pestana.clave === "areas" && <th className="px-6 py-4 font-semibold">Jefe caja chica</th>}
                                    <th className="px-6 py-4 font-semibold">Estado</th>
                                    <th className="px-6 py-4"><span className="sr-only">Acciones</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {lista.map((r) => (
                                    <tr key={r.id} className="hover:bg-white/5">
                                        <td className="px-6 py-4 font-medium text-white">{r.nombre}</td>
                                        {esProveedores && (
                                            <td className="px-6 py-4">
                                                <TipoBadge tipo={origenDeProveedor(r)} />
                                            </td>
                                        )}
                                        {esProveedores && (
                                            <td className="px-6 py-4 text-slate-300">
                                                {r.codigoSAP || (
                                                    <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-200" title={r.registradoPorNombre ? `Registrado por ${r.registradoPorNombre}` : undefined}>
                                                        Pendiente SAP
                                                    </span>
                                                )}
                                            </td>
                                        )}
                                        {esProveedores && <td className="px-6 py-4 text-slate-300">{r.cuentasBancarias?.length || 0}</td>}
                                        {pestana.clave === "terminos-pago" && <td className="px-6 py-4 text-slate-300">{r.dias ?? "—"}</td>}
                                        {pestana.clave === "areas" && <td className="px-6 py-4 text-slate-300">{r.permiteExterior ? "Sí" : "No"}</td>}
                                        {pestana.clave === "areas" && (
                                            <td className="px-6 py-4 text-slate-300 whitespace-nowrap">
                                                {r.jefeCajaChicaNombre || <span className="text-slate-500">Sin asignar</span>}
                                                {r.apruebaCajaChicaJefes && <span className="ml-2 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-semibold text-violet-300" title="Sus Autorizadores aprueban la caja chica de los jefes de área">Aprueba jefes</span>}
                                                {esAdmin && (
                                                    <button onClick={() => setAreaJefe(r)} className="ml-2 rounded-lg px-2 py-1 text-xs font-medium text-blue-300 hover:bg-blue-500/10">
                                                        {r.jefeCajaChicaId ? "Cambiar" : "Asignar"}
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                        <td className="px-6 py-4">
                                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${r.activo !== false ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-slate-400"}`}>
                                                {r.activo !== false ? "Activo" : "Inactivo"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right whitespace-nowrap">
                                            <button onClick={() => abrir(r)} className="rounded-lg px-3 py-1.5 font-medium text-blue-300 hover:bg-blue-500/10">Editar</button>
                                            <button onClick={() => eliminar(r)} className="rounded-lg px-3 py-1.5 font-medium text-red-400 hover:bg-red-500/15">Eliminar</button>
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
                ancho={esProveedores ? "max-w-4xl" : "max-w-lg"}
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
                            {esProveedores && (
                                <Campo
                                    etiqueta="Origen"
                                    htmlFor="origen"
                                    requerido
                                    ayuda={edicion.origen === ORIGENES.EXTERIOR ? "Solo el área de Compras podrá usarlo en sus peticiones." : "Disponible para todas las áreas."}
                                >
                                    <select id="origen" value={edicion.origen} onChange={(e) => cambiarOrigen(e.target.value)} className={claseInput}>
                                        <option value={ORIGENES.LOCAL}>Local (El Salvador)</option>
                                        <option value={ORIGENES.EXTERIOR}>Exterior</option>
                                    </select>
                                </Campo>
                            )}
                            {esProveedores && edicion.origen === ORIGENES.LOCAL && (
                                <Campo
                                    etiqueta="Clasificación del contribuyente"
                                    htmlFor="clasificacionContribuyente"
                                    requerido
                                    ayuda="Pequeño y mediano: se retiene 1% de IVA (desde $100 sin IVA). No inscrito: Sujeto excluido, sin IVA, solo Renta 10%."
                                >
                                    <select id="clasificacionContribuyente" required value={edicion.clasificacionContribuyente || ""} onChange={(e) => cambiar("clasificacionContribuyente", e.target.value)} className={claseInput}>
                                        <option value="">Seleccionar...</option>
                                        {Object.entries(ETIQUETA_CLASIFICACION).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                                    </select>
                                </Campo>
                            )}
                            {pestana.clave === "terminos-pago" && (
                                <Campo etiqueta="Días" htmlFor="dias">
                                    <input id="dias" type="number" min="0" step="1" value={edicion.dias ?? ""} onChange={(e) => cambiar("dias", e.target.value)} className={claseInput} />
                                </Campo>
                            )}
                        </div>

                        <label className="flex items-center gap-3 text-slate-200">
                            <input type="checkbox" checked={edicion.activo !== false} onChange={(e) => cambiar("activo", e.target.checked)} className="h-4 w-4" />
                            Activo (aparece en el formulario de petición)
                        </label>

                        {pestana.clave === "areas" && (
                            <label className="flex items-start gap-3 text-slate-200">
                                <input type="checkbox" checked={edicion.permiteExterior === true} onChange={(e) => cambiar("permiteExterior", e.target.checked)} className="mt-1 h-4 w-4" />
                                <span>
                                    Área de Compras
                                    <span className="block text-xs text-slate-400">Permite proveedores del exterior, Orden ELM y los tipos Cliente, Retail y Stock B2B. Las demás áreas solo registran Gasto/Costo Operativo. Aplica a los usuarios que tengan esta área asignada en Usuarios.</span>
                                </span>
                            </label>
                        )}

                        {esProveedores && (
                            <div>
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="font-semibold text-slate-200">
                                        Cuentas bancarias <span className="font-normal text-slate-400">({edicion.origen === ORIGENES.EXTERIOR ? "transferencia internacional" : "transferencia local"})</span>
                                    </h3>
                                    <button type="button" onClick={() => cambiar("cuentasBancarias", [...edicion.cuentasBancarias, cuentaVacia(edicion.origen)])} className="inline-flex items-center gap-2 text-sm font-medium text-blue-300 hover:underline">
                                        <FaPlus /> Agregar cuenta
                                    </button>
                                </div>
                                {edicion.cuentasBancarias.length === 0 && <p className="text-sm text-slate-400">Sin cuentas. El solicitante tendrá que escribir la cuenta en cada petición.</p>}
                                <div className="space-y-4">
                                    {edicion.cuentasBancarias.map((c, i) => (
                                        <CuentaProveedor
                                            key={c.id || i}
                                            cuenta={c}
                                            origen={edicion.origen}
                                            indice={i}
                                            mostrarSecundaria
                                            onCambiar={(campo, valor) => cambiarCuenta(i, campo, valor)}
                                            onQuitar={() => cambiar("cuentasBancarias", edicion.cuentasBancarias.filter((_, j) => j !== i))}
                                        />
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

            {esAdmin && (
                <JefeCajaChicaModal
                    area={areaJefe}
                    onCerrar={() => setAreaJefe(null)}
                    onGuardado={() => {
                        setAreaJefe(null);
                        cargar();
                    }}
                />
            )}
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
