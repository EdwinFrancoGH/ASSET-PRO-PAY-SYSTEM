"use client";

import { useState } from "react";
import Modal from "../ui/Modal";
import Campo from "../ui/Campo";
import CuentaProveedor from "../catalogos/CuentaProveedor";
import { claseInput, botonPrimario, botonSecundario } from "../ui/estilos";
import { alertaError, toastExito } from "../ui/alertas";
import { registrarProveedor } from "../../services/catalogos.service";
import { ORIGENES, cuentaLocalVacia, convertirCuenta, faltantesCuenta } from "../../utils/bancario";
import { ETIQUETA_CLASIFICACION } from "../../utils/impuestos";
import { mensajeError } from "../../utils/formato";
import AyudaClasificacion from "../ui/AyudaClasificacion";

// Registro rápido de un proveedor desde la petición. El usuario no conoce
// el código SAP: el proveedor queda "Pendiente SAP" y Contabilidad lo
// completa en Catálogos. Del exterior: solo Compras.
export default function NuevoProveedorModal({ abierto, nombreInicial = "", permiteExterior = false, onCerrar, onCreado }) {
    const [datos, setDatos] = useState(null);
    const [guardando, setGuardando] = useState(false);

    // Se reinicia cada vez que se abre.
    if (abierto && !datos) {
        setDatos({
            nombre: nombreInicial,
            origen: ORIGENES.LOCAL,
            clasificacionContribuyente: "",
            cuenta: { ...cuentaLocalVacia(), titular: nombreInicial }
        });
    }
    if (!abierto && datos) setDatos(null);
    if (!abierto || !datos) return null;

    const cambiar = (campo, valor) => setDatos((d) => ({ ...d, [campo]: valor }));
    const cambiarOrigen = (origen) =>
        setDatos((d) => ({ ...d, origen, cuenta: convertirCuenta(d.cuenta, origen) }));

    const guardar = async () => {
        if (datos.nombre.trim().length < 2) return alertaError("Escribe el nombre del proveedor.");
        if (datos.origen === ORIGENES.LOCAL && !datos.clasificacionContribuyente) return alertaError("Indica la clasificación del contribuyente.");
        const faltan = faltantesCuenta(datos.cuenta, datos.origen);
        if (faltan.length) return alertaError(`Completa en la cuenta: ${faltan.join(", ")}.`);

        setGuardando(true);
        try {
            const { data } = await registrarProveedor({
                nombre: datos.nombre.trim(),
                origen: datos.origen,
                clasificacionContribuyente: datos.origen === ORIGENES.LOCAL ? datos.clasificacionContribuyente : "",
                cuentasBancarias: [datos.cuenta]
            });
            toastExito(data.message);
            onCreado(data.data);
        } catch (e) {
            alertaError(mensajeError(e, "No se pudo registrar el proveedor."));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <Modal abierto titulo="Registrar proveedor nuevo" onCerrar={() => !guardando && onCerrar()} ancho="max-w-4xl">
            <p className="mb-5 text-sm text-slate-300">
                No necesitas el código SAP: Contabilidad lo completará. Verifica el nombre y la cuenta con la factura o el documento del proveedor.
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Campo etiqueta="Nombre o razón social" htmlFor="np-nombre" requerido className="lg:col-span-2">
                    <input id="np-nombre" autoFocus maxLength={150} value={datos.nombre} onChange={(e) => cambiar("nombre", e.target.value)} className={claseInput} />
                </Campo>
                <Campo etiqueta="Origen" htmlFor="np-origen" requerido>
                    <select id="np-origen" value={datos.origen} disabled={!permiteExterior} onChange={(e) => cambiarOrigen(e.target.value)} className={claseInput}>
                        <option value={ORIGENES.LOCAL}>Local (El Salvador)</option>
                        {permiteExterior && <option value={ORIGENES.EXTERIOR}>Exterior</option>}
                    </select>
                </Campo>
                {datos.origen === ORIGENES.LOCAL && (
                    <Campo etiqueta="Clasificación del contribuyente" htmlFor="np-clasif" requerido className="sm:col-span-2" ayuda="Define el IVA y la retención del 1%.">
                        <select id="np-clasif" value={datos.clasificacionContribuyente} onChange={(e) => cambiar("clasificacionContribuyente", e.target.value)} className={claseInput}>
                            <option value="">Seleccionar...</option>
                            {Object.entries(ETIQUETA_CLASIFICACION).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                        </select>
                    </Campo>
                )}
            </div>

            {datos.origen === ORIGENES.LOCAL && <AyudaClasificacion className="mt-4" />}

            <div className="mt-5">
                <CuentaProveedor
                    cuenta={datos.cuenta}
                    origen={datos.origen}
                    indice="np"
                    titulo="Cuenta bancaria"
                    onCambiar={(campo, valor) => setDatos((d) => ({ ...d, cuenta: { ...d.cuenta, [campo]: valor } }))}
                />
            </div>

            <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={onCerrar} disabled={guardando} className={botonSecundario}>Cancelar</button>
                <button type="button" onClick={guardar} disabled={guardando} className={botonPrimario}>{guardando ? "Guardando..." : "Registrar proveedor"}</button>
            </div>
        </Modal>
    );
}

