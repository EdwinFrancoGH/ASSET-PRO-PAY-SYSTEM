"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaPaperclip, FaTimes, FaExclamationTriangle } from "react-icons/fa";

import Seccion from "../ui/Seccion";
import Campo from "../ui/Campo";
import Cargando from "../ui/Cargando";
import { claseInput, claseInputError, botonPrimario, botonSecundario } from "../ui/estilos";
import { alertaError, toastExito } from "../ui/alertas";
import AdjuntosLista from "./AdjuntosLista";

import { useAuth } from "../../context/AuthContext";
import { obtenerCatalogo } from "../../services/catalogos.service";
import { obtenerAutorizadores } from "../../services/users.service";
import { crearPeticion, actualizarPeticion, enviarPeticion, subirAdjuntos, eliminarAdjunto } from "../../services/peticiones.service";
import { formularioVacio, formularioDesdePeticion, camposFaltantes, calcularMontoPagar, MONEDAS, CAMPOS_OBLIGATORIOS } from "../../utils/peticion";
import { formatoMonto, formatoTamano, mensajeError } from "../../utils/formato";
import { ESTADOS } from "../../utils/estados";

const MAX_MB = 10;
const ACEPTA = ".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.docx,.doc";

const descripcionCuenta = (c) =>
    [c.banco, c.tipoCuenta, c.numeroCuenta].filter(Boolean).join(" ") + (c.moneda ? ` (${c.moneda})` : "") + (c.titular ? `, titular: ${c.titular}` : "");

export default function PeticionForm({ peticion }) {
    const router = useRouter();
    const { userData } = useAuth();
    const esEdicion = Boolean(peticion);

    const [form, setForm] = useState(() => (peticion ? formularioDesdePeticion(peticion) : formularioVacio()));
    const [catalogos, setCatalogos] = useState(null);
    const [adjuntos, setAdjuntos] = useState(peticion?.adjuntos || []);
    const [archivosNuevos, setArchivosNuevos] = useState([]);
    const [errores, setErrores] = useState({});
    const [guardando, setGuardando] = useState(null); // null | "borrador" | "enviar"
    const inputArchivos = useRef(null);

    useEffect(() => {
        Promise.all([
            obtenerCatalogo("areas", true),
            obtenerCatalogo("terminos-pago", true),
            obtenerCatalogo("proveedores", true),
            obtenerAutorizadores()
        ])
            .then(([areas, terminos, proveedores, autorizadores]) =>
                setCatalogos({
                    areas: areas.data.data,
                    terminos: terminos.data.data,
                    proveedores: proveedores.data.data,
                    autorizadores: autorizadores.data.data
                })
            )
            .catch((e) => alertaError(mensajeError(e, "No se pudieron cargar los catálogos.")));
    }, []);

    const proveedor = useMemo(
        () => catalogos?.proveedores.find((p) => p.id === form.proveedorId) || null,
        [catalogos, form.proveedorId]
    );
    const cuentas = proveedor?.cuentasBancarias || [];
    const montoPagar = calcularMontoPagar(form.monto, form.porcentaje);

    const ultimoRechazo = useMemo(() => {
        if (![ESTADOS.RECHAZADA_AUTORIZADOR, ESTADOS.RECHAZADA_CONTABILIDAD].includes(peticion?.estado)) return null;
        return [...(peticion.historial || [])].reverse().find((h) => h.accion.startsWith("RECHAZADA"));
    }, [peticion]);

    const cambiar = (campo, valor) => {
        setForm((f) => {
            const nuevo = { ...f, [campo]: valor };

            // El "Monto" sigue al "Monto compra" mientras el usuario no lo cambie a mano.
            if (campo === "montoCompra" && (f.monto === "" || f.monto === f.montoCompra)) nuevo.monto = valor;

            if (campo === "proveedorId") {
                const prov = catalogos?.proveedores.find((p) => p.id === valor);
                const lista = prov?.cuentasBancarias || [];
                nuevo.cuentaBancariaId = lista.length === 1 ? lista[0].id : "";
                if (prov && lista.length === 0) nuevo.pagarCuentaDiferente = true;
            }
            return nuevo;
        });
        if (errores[campo]) setErrores((e) => ({ ...e, [campo]: undefined }));
    };

    const alCambiar = (e) => cambiar(e.target.name, e.target.type === "checkbox" ? e.target.checked : e.target.value);

    const clase = (campo) => `${claseInput} ${errores[campo] ? claseInputError : ""}`;

    const agregarArchivos = (lista) => {
        const validos = [];
        for (const archivo of lista) {
            if (archivo.size > MAX_MB * 1024 * 1024) {
                alertaError(`"${archivo.name}" supera los ${MAX_MB} MB.`);
                continue;
            }
            validos.push(archivo);
        }
        setArchivosNuevos((a) => [...a, ...validos]);
        if (inputArchivos.current) inputArchivos.current.value = "";
    };

    const quitarAdjuntoGuardado = async (adjunto) => {
        try {
            const { data } = await eliminarAdjunto(peticion.id, adjunto.id);
            setAdjuntos(data.data);
        } catch (e) {
            alertaError(mensajeError(e));
        }
    };

    const guardar = async (enviar) => {
        if (enviar) {
            const faltan = camposFaltantes(form);
            if (faltan.length) {
                const nuevosErrores = Object.fromEntries(
                    faltan.map((c) => [c, c === "cuenta" ? "Selecciona una cuenta o indica una cuenta diferente." : "Obligatorio para enviar."])
                );
                setErrores(nuevosErrores);
                const nombres = faltan.map((c) => (c === "cuenta" ? "Cuenta bancaria" : CAMPOS_OBLIGATORIOS[c]));
                alertaError(`Completa: ${nombres.join(", ")}.`, "Faltan datos para enviar");
                document.querySelector(`[name="${faltan[0] === "cuenta" ? (form.pagarCuentaDiferente ? "nuevaCuentaBancaria" : "cuentaBancariaId") : faltan[0]}"]`)?.focus();
                return;
            }
        }

        setGuardando(enviar ? "enviar" : "borrador");
        let id = peticion?.id;

        try {
            const { data } = esEdicion ? await actualizarPeticion(id, form) : await crearPeticion(form);
            id = data.data.id;
        } catch (e) {
            setGuardando(null);
            return alertaError(mensajeError(e, "No se pudo guardar la petición."));
        }

        // Desde aquí la petición ya existe: si algo falla, se lleva al
        // usuario a editarla en vez de perder lo escrito.
        try {
            if (archivosNuevos.length) await subirAdjuntos(id, archivosNuevos);
        } catch (e) {
            setGuardando(null);
            await alertaError(`${mensajeError(e, "No se pudieron subir los adjuntos.")} La petición quedó guardada como borrador.`);
            return router.replace(`/peticiones/${id}/editar`);
        }

        try {
            if (enviar) {
                const { data } = await enviarPeticion(id);
                toastExito(data.message);
            } else {
                toastExito("Borrador guardado.");
            }
            router.replace(`/peticiones/${id}`);
        } catch (e) {
            setGuardando(null);
            await alertaError(mensajeError(e, "No se pudo enviar la petición."));
            router.replace(`/peticiones/${id}/editar`);
        }
    };

    if (!catalogos) return <Cargando texto="Cargando formulario..." />;

    const sinCatalogos = catalogos.areas.length === 0 || catalogos.proveedores.length === 0 || catalogos.terminos.length === 0;
    const autorizadorFueraDeLista = form.autorizadorId && !catalogos.autorizadores.some((a) => a.uid === form.autorizadorId);

    return (
        <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); guardar(true); }} noValidate>
            {ultimoRechazo && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
                    <p className="font-semibold">Rechazada por {ultimoRechazo.usuarioNombre}</p>
                    <p className="mt-1">{ultimoRechazo.comentario}</p>
                    <p className="mt-2 text-sm text-red-700">Corrige lo necesario y vuelve a enviarla.</p>
                </div>
            )}

            {sinCatalogos && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900 flex gap-3">
                    <FaExclamationTriangle className="mt-1 flex-none" />
                    <p>Faltan catálogos por configurar (áreas, proveedores o términos de pago). Pide a Contabilidad o al Administrador que los registren en Catálogos.</p>
                </div>
            )}

            {/* Información General */}
            <Seccion titulo="Información General">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <Campo etiqueta="Fecha Solicitud" htmlFor="fechaSolicitud" requerido error={errores.fechaSolicitud}>
                        <input id="fechaSolicitud" name="fechaSolicitud" type="date" value={form.fechaSolicitud} onChange={alCambiar} className={clase("fechaSolicitud")} />
                    </Campo>

                    <Campo etiqueta="Área" htmlFor="areaId" requerido error={errores.areaId}>
                        <select id="areaId" name="areaId" value={form.areaId} onChange={alCambiar} className={clase("areaId")}>
                            <option value="">Seleccionar...</option>
                            {catalogos.areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                        </select>
                    </Campo>

                    <Campo etiqueta="Orden ELM" htmlFor="ordenELM">
                        <input id="ordenELM" name="ordenELM" type="text" maxLength={60} value={form.ordenELM} onChange={alCambiar} className={claseInput} />
                    </Campo>

                    <Campo etiqueta="Ticket Compromiso" htmlFor="ticketCompromiso">
                        <input id="ticketCompromiso" name="ticketCompromiso" type="text" maxLength={60} value={form.ticketCompromiso} onChange={alCambiar} className={claseInput} />
                    </Campo>
                </div>
            </Seccion>

            {/* Información del Proveedor */}
            <Seccion titulo="Información del Proveedor">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    <Campo etiqueta="Proveedor" htmlFor="proveedorId" requerido error={errores.proveedorId}>
                        <select id="proveedorId" name="proveedorId" value={form.proveedorId} onChange={alCambiar} className={clase("proveedorId")}>
                            <option value="">Seleccionar...</option>
                            {catalogos.proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                        </select>
                    </Campo>

                    <Campo etiqueta="Código SAP" htmlFor="codigoSAP" ayuda="Se toma del catálogo de proveedores.">
                        <input id="codigoSAP" type="text" value={proveedor?.codigoSAP || ""} disabled className={claseInput} />
                    </Campo>

                    <Campo etiqueta="Solicitante" htmlFor="solicitante">
                        <input id="solicitante" type="text" value={peticion?.solicitanteNombre || userData?.name || ""} disabled className={claseInput} />
                    </Campo>

                    <Campo etiqueta="Proforma" htmlFor="proforma">
                        <input id="proforma" name="proforma" type="text" maxLength={80} value={form.proforma} onChange={alCambiar} className={claseInput} />
                    </Campo>

                    <Campo etiqueta="Términos de Pago" htmlFor="terminoPagoId" requerido error={errores.terminoPagoId}>
                        <select id="terminoPagoId" name="terminoPagoId" value={form.terminoPagoId} onChange={alCambiar} className={clase("terminoPagoId")}>
                            <option value="">Seleccionar...</option>
                            {catalogos.terminos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                        </select>
                    </Campo>

                    <Campo etiqueta="Monto Compra" htmlFor="montoCompra" requerido error={errores.montoCompra}>
                        <input id="montoCompra" name="montoCompra" type="number" min="0" step="0.01" inputMode="decimal" value={form.montoCompra} onChange={alCambiar} className={clase("montoCompra")} />
                    </Campo>

                    <Campo etiqueta="Razón del Pago" htmlFor="razonPago" requerido error={errores.razonPago} className="md:col-span-2 lg:col-span-3">
                        <textarea id="razonPago" name="razonPago" rows={3} maxLength={1500} value={form.razonPago} onChange={alCambiar} className={clase("razonPago")} />
                    </Campo>
                </div>
            </Seccion>

            {/* Cliente */}
            <Seccion titulo="Información del Cliente">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <Campo etiqueta="Cliente" htmlFor="cliente">
                        <input id="cliente" name="cliente" maxLength={150} value={form.cliente} onChange={alCambiar} className={claseInput} />
                    </Campo>
                    <Campo etiqueta="Licitación / OC" htmlFor="licitacionOC">
                        <input id="licitacionOC" name="licitacionOC" maxLength={80} value={form.licitacionOC} onChange={alCambiar} className={claseInput} />
                    </Campo>
                    <Campo etiqueta="Fecha Entrega" htmlFor="fechaEntrega">
                        <input id="fechaEntrega" name="fechaEntrega" type="date" value={form.fechaEntrega} onChange={alCambiar} className={claseInput} />
                    </Campo>
                    <Campo etiqueta="Proyecto" htmlFor="proyecto">
                        <input id="proyecto" name="proyecto" maxLength={150} value={form.proyecto} onChange={alCambiar} className={claseInput} />
                    </Campo>
                </div>
            </Seccion>

            {/* Información del Pago */}
            <Seccion titulo="Información del Pago">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                    <Campo etiqueta="%" htmlFor="porcentaje" requerido error={errores.porcentaje}>
                        <input id="porcentaje" name="porcentaje" type="number" min="0" max="100" step="0.01" value={form.porcentaje} onChange={alCambiar} className={clase("porcentaje")} />
                    </Campo>

                    <Campo etiqueta="Monto" htmlFor="monto" requerido error={errores.monto} ayuda="Base sobre la que se aplica el %.">
                        <input id="monto" name="monto" type="number" min="0" step="0.01" inputMode="decimal" value={form.monto} onChange={alCambiar} className={clase("monto")} />
                    </Campo>

                    <Campo etiqueta="Moneda" htmlFor="moneda" requerido>
                        <select id="moneda" name="moneda" value={form.moneda} onChange={alCambiar} className={claseInput}>
                            {MONEDAS.map((m) => <option key={m}>{m}</option>)}
                        </select>
                    </Campo>

                    <Campo
                        etiqueta="Autoriza"
                        htmlFor="autorizadorId"
                        requerido
                        error={errores.autorizadorId || (autorizadorFueraDeLista ? "El autorizador anterior ya no está disponible." : undefined)}
                    >
                        <select id="autorizadorId" name="autorizadorId" value={autorizadorFueraDeLista ? "" : form.autorizadorId} onChange={alCambiar} className={clase("autorizadorId")}>
                            <option value="">Seleccionar...</option>
                            {catalogos.autorizadores.map((a) => <option key={a.uid} value={a.uid}>{a.name}</option>)}
                        </select>
                    </Campo>

                    <Campo etiqueta="Monto a Pagar" htmlFor="montoPagar" ayuda="Monto × %">
                        <input id="montoPagar" readOnly tabIndex={-1} value={montoPagar === null ? "" : formatoMonto(montoPagar, form.moneda)} className={`${claseInput} bg-slate-100 font-bold`} />
                    </Campo>
                </div>

                <Campo etiqueta="Concepto de Compra" htmlFor="conceptoCompra" requerido error={errores.conceptoCompra} className="mt-5">
                    <textarea id="conceptoCompra" name="conceptoCompra" rows={4} maxLength={2000} value={form.conceptoCompra} onChange={alCambiar} className={clase("conceptoCompra")} />
                </Campo>
            </Seccion>

            {/* Datos Bancarios */}
            <Seccion titulo="Datos Bancarios">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Campo etiqueta="¿Pagar a una cuenta diferente?" htmlFor="pagarCuentaDiferente">
                        <select
                            id="pagarCuentaDiferente"
                            value={form.pagarCuentaDiferente ? "Sí" : "No"}
                            onChange={(e) => cambiar("pagarCuentaDiferente", e.target.value === "Sí")}
                            className={claseInput}
                        >
                            <option>No</option>
                            <option>Sí</option>
                        </select>
                    </Campo>

                    <Campo
                        etiqueta="Cuenta Registrada"
                        htmlFor="cuentaBancariaId"
                        requerido={!form.pagarCuentaDiferente}
                        error={!form.pagarCuentaDiferente ? errores.cuenta : undefined}
                        ayuda={proveedor && cuentas.length === 0 ? "Este proveedor no tiene cuentas registradas." : !proveedor ? "Primero elige el proveedor." : undefined}
                    >
                        <select
                            id="cuentaBancariaId"
                            name="cuentaBancariaId"
                            value={form.cuentaBancariaId}
                            onChange={(e) => { cambiar("cuentaBancariaId", e.target.value); setErrores((x) => ({ ...x, cuenta: undefined })); }}
                            disabled={form.pagarCuentaDiferente || cuentas.length === 0}
                            className={`${claseInput} ${!form.pagarCuentaDiferente && errores.cuenta ? claseInputError : ""}`}
                        >
                            <option value="">Seleccionar cuenta...</option>
                            {cuentas.map((c) => <option key={c.id} value={c.id}>{descripcionCuenta(c)}</option>)}
                        </select>
                    </Campo>
                </div>

                {form.pagarCuentaDiferente && (
                    <Campo
                        etiqueta="Nueva Cuenta Bancaria"
                        htmlFor="nuevaCuentaBancaria"
                        requerido
                        error={errores.cuenta}
                        ayuda="Banco, tipo y número de cuenta, titular y moneda. Para transferencias al exterior, incluye SWIFT/ABA."
                        className="mt-6"
                    >
                        <textarea
                            id="nuevaCuentaBancaria"
                            name="nuevaCuentaBancaria"
                            rows={4}
                            maxLength={1000}
                            value={form.nuevaCuentaBancaria}
                            onChange={(e) => { cambiar("nuevaCuentaBancaria", e.target.value); setErrores((x) => ({ ...x, cuenta: undefined })); }}
                            className={`${claseInput} ${errores.cuenta ? claseInputError : ""}`}
                        />
                    </Campo>
                )}
            </Seccion>

            {/* Documentos de soporte */}
            <Seccion titulo="Documentos de Soporte">
                <p className="text-sm text-slate-600 mb-4">Proforma, cotización, factura u otro respaldo. PDF, imagen, Excel o Word de hasta {MAX_MB} MB.</p>

                {adjuntos.filter((a) => a.categoria === "SOPORTE").length > 0 && (
                    <AdjuntosLista peticionId={peticion.id} adjuntos={adjuntos.filter((a) => a.categoria === "SOPORTE")} onEliminar={quitarAdjuntoGuardado} />
                )}

                {archivosNuevos.length > 0 && (
                    <ul className="mt-3 space-y-2">
                        {archivosNuevos.map((a, i) => (
                            <li key={`${a.name}-${i}`} className="flex items-center justify-between rounded-lg border border-dashed border-blue-300 bg-blue-50 px-4 py-2 text-sm">
                                <span className="truncate text-slate-700">{a.name} <span className="text-slate-500">({formatoTamano(a.size)}, se subirá al guardar)</span></span>
                                <button type="button" onClick={() => setArchivosNuevos((l) => l.filter((_, j) => j !== i))} className="ml-3 text-slate-500 hover:text-red-600" aria-label={`Quitar ${a.name}`}>
                                    <FaTimes />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                <input ref={inputArchivos} type="file" multiple accept={ACEPTA} className="hidden" onChange={(e) => agregarArchivos([...e.target.files])} />
                <button type="button" onClick={() => inputArchivos.current?.click()} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">
                    <FaPaperclip /> Adjuntar archivos
                </button>
            </Seccion>

            {/* Observaciones */}
            <Seccion titulo="Observaciones">
                <textarea name="observaciones" aria-label="Observaciones" rows={5} maxLength={2000} value={form.observaciones} onChange={alCambiar} className="w-full border border-slate-300 rounded-xl p-4 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100" />
            </Seccion>

            {/* Botones */}
            <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => router.back()} disabled={guardando} className={botonSecundario}>
                    Cancelar
                </button>
                <button type="button" onClick={() => guardar(false)} disabled={guardando} className="px-8 py-3 rounded-xl border-2 border-blue-600 text-blue-700 hover:bg-blue-50 font-semibold transition disabled:opacity-60">
                    {guardando === "borrador" ? "Guardando..." : "Guardar borrador"}
                </button>
                <button type="submit" disabled={guardando} className={botonPrimario}>
                    {guardando === "enviar" ? "Enviando..." : ultimoRechazo ? "Reenviar a autorización" : "Enviar a autorización"}
                </button>
            </div>
        </form>
    );
}
