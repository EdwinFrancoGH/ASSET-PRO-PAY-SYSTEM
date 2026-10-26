"use client";

import { useEffect, useMemo, useState } from "react";

import Modal from "../ui/Modal";
import Campo from "../ui/Campo";
import BuscadorProveedor from "../peticiones/BuscadorProveedor";
import { claseInput, botonPrimario, botonSecundario } from "../ui/estilos";
import { alertaError, toastExito } from "../ui/alertas";

import { crearFactura, modificarFactura } from "../../services/facturas.service";
import { TIPOS_FACTURA, facturaVacia } from "../../utils/facturas";
import { hoyISO, mensajeError } from "../../utils/formato";

// Registrar una factura nueva o corregir una existente (factura = null → nueva).
// Si la factura estaba devuelta, al guardar se vuelve a entregar.
// plantilla: factura de la que se copian los datos para crear una nueva
// (Duplicar). El N° de factura no se copia: queda en blanco.
export default function FacturaFormModal({ abierto, factura, plantilla, proveedores, onCerrar, onGuardada }) {
    const [form, setForm] = useState(facturaVacia());
    const [comentario, setComentario] = useState("");
    const [errores, setErrores] = useState({});
    const [guardando, setGuardando] = useState(false);
    const devuelta = factura?.estado === "DEVUELTA";

    useEffect(() => {
        if (!abierto) return;
        setErrores({});
        setComentario("");
        const base = factura || plantilla;
        setForm(
            base
                ? { tipo: base.tipo, numeroFactura: factura ? factura.numeroFactura : "", proveedorId: base.proveedorId, montoOC: String(base.montoOC), fechaFactura: base.fechaFactura }
                : facturaVacia()
        );
    }, [abierto, factura, plantilla]);

    // El proveedor elegido se muestra aunque ya no esté activo en el catálogo.
    const proveedor = useMemo(() => {
        const p = proveedores.find((x) => x.id === form.proveedorId);
        if (p) return p;
        const base = factura || plantilla;
        return base && form.proveedorId === base.proveedorId ? { id: base.proveedorId, nombre: base.proveedorNombre, codigoSAP: base.codigoSAP } : null;
    }, [proveedores, form.proveedorId, factura, plantilla]);

    const cambiar = (campo, valor) => {
        setForm((f) => ({ ...f, [campo]: valor }));
        setErrores((e) => ({ ...e, [campo]: undefined }));
    };

    const validar = () => {
        const e = {};
        if (!form.numeroFactura.trim()) e.numeroFactura = "Indica el número de factura.";
        if (!form.proveedorId) e.proveedorId = "Selecciona el proveedor.";
        if (!(Number(form.montoOC) > 0)) e.montoOC = "El monto debe ser mayor a 0.";
        if (!form.fechaFactura) e.fechaFactura = "Indica la fecha.";
        else if (form.fechaFactura > hoyISO()) e.fechaFactura = "No puede ser una fecha futura.";
        setErrores(e);
        return Object.keys(e).length === 0;
    };

    const guardar = async (ev) => {
        ev.preventDefault();
        if (!validar()) return;
        setGuardando(true);
        try {
            const datos = { ...form, montoOC: Number(form.montoOC), comentario };
            const { data } = factura ? await modificarFactura(factura.id, datos) : await crearFactura(datos);
            toastExito(data.message);
            onGuardada?.(data.data);
        } catch (e) {
            alertaError(mensajeError(e, "No se pudo guardar la factura."));
        } finally {
            setGuardando(false);
        }
    };

    const titulo = !factura ? (plantilla ? "Duplicar factura" : "Añadir factura") : devuelta ? "Corregir y volver a entregar" : "Corregir factura";

    return (
        <Modal abierto={abierto} titulo={titulo} onCerrar={guardando ? undefined : onCerrar} ancho="max-w-2xl">
            <form onSubmit={guardar} noValidate className="space-y-5">
                {plantilla && !factura && (
                    <p className="rounded-xl bg-blue-500/10 p-3 text-sm text-blue-200 ring-1 ring-blue-400/30">
                        Copia de la factura <b>{plantilla.numeroFactura}</b>. Escribe el N° de la nueva factura y ajusta lo que cambie.
                    </p>
                )}
                {devuelta && factura.motivoDevolucion && (
                    <div className="rounded-xl bg-red-500/10 p-4 text-sm text-red-200 ring-1 ring-red-400/30">
                        <p className="font-semibold">Motivo de la devolución</p>
                        <p className="mt-1 whitespace-pre-line">{factura.motivoDevolucion}</p>
                    </div>
                )}

                <Campo etiqueta="Tipo de factura" requerido>
                    <div className="mt-2 grid grid-cols-2 gap-3" role="radiogroup">
                        {Object.entries(TIPOS_FACTURA).map(([k, v]) => (
                            <button
                                key={k}
                                type="button"
                                role="radio"
                                aria-checked={form.tipo === k}
                                onClick={() => cambiar("tipo", k)}
                                className={`rounded-xl px-4 py-3 font-semibold ring-1 transition ${
                                    form.tipo === k ? "bg-blue-500/25 text-white ring-blue-400/60" : "bg-white/5 text-slate-300 ring-white/15 hover:bg-white/10"
                                }`}
                            >
                                {v.etiqueta}
                            </button>
                        ))}
                    </div>
                </Campo>

                <Campo etiqueta="Proveedor" htmlFor="proveedorId" requerido error={errores.proveedorId}>
                    <BuscadorProveedor proveedores={proveedores} seleccionado={proveedor} onSeleccionar={(id) => cambiar("proveedorId", id)} mostrarTipo error={!!errores.proveedorId} />
                </Campo>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                    <Campo etiqueta="N° factura" htmlFor="numeroFactura" requerido error={errores.numeroFactura}>
                        <input id="numeroFactura" maxLength={60} autoFocus={!!plantilla && !factura} value={form.numeroFactura} onChange={(e) => cambiar("numeroFactura", e.target.value)} className={claseInput} autoComplete="off" />
                    </Campo>
                    <Campo etiqueta="Monto OC" htmlFor="montoOC" requerido error={errores.montoOC}>
                        <input id="montoOC" type="number" min="0" step="0.01" inputMode="decimal" value={form.montoOC} onChange={(e) => cambiar("montoOC", e.target.value)} className={claseInput} />
                    </Campo>
                    <Campo etiqueta="Fecha factura" htmlFor="fechaFactura" requerido error={errores.fechaFactura}>
                        <input id="fechaFactura" type="date" max={hoyISO()} value={form.fechaFactura} onChange={(e) => cambiar("fechaFactura", e.target.value)} className={claseInput} />
                    </Campo>
                </div>

                {factura && (
                    <Campo etiqueta="Comentario (opcional)" htmlFor="comentario" ayuda="Queda en el historial de la factura.">
                        <textarea id="comentario" rows={2} maxLength={500} value={comentario} onChange={(e) => setComentario(e.target.value)} className={claseInput} />
                    </Campo>
                )}

                <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={onCerrar} disabled={guardando} className={botonSecundario}>Cancelar</button>
                    <button type="submit" disabled={guardando} className={botonPrimario}>
                        {guardando ? "Guardando..." : !factura ? "Entregar" : devuelta ? "Volver a entregar" : "Guardar cambios"}
                    </button>
                </div>
            </form>
        </Modal>
    );
}
