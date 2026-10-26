"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaPaperclip, FaTimes, FaExclamationTriangle } from "react-icons/fa";

import Seccion from "../ui/Seccion";
import Campo from "../ui/Campo";
import Cargando from "../ui/Cargando";
import { claseInput, claseInputError, botonPrimario, botonSecundario } from "../ui/estilos";
import { alertaError, toastExito } from "../ui/alertas";
import AdjuntosLista from "./AdjuntosLista";
import TipoBadge from "./TipoBadge";
import BuscadorProveedor from "./BuscadorProveedor";
import NuevoProveedorModal from "./NuevoProveedorModal";
import DatosCuenta from "./DatosCuenta";

import { useAuth } from "../../context/AuthContext";
import { obtenerCatalogo, agregarCuentaProveedor, definirClasificacionProveedor } from "../../services/catalogos.service";
import { obtenerAutorizadores } from "../../services/users.service";
import { crearPeticion, actualizarPeticion, enviarPeticion, subirAdjuntos, eliminarAdjunto } from "../../services/peticiones.service";
import { formularioVacio, formularioDesdePeticion, camposFaltantes, calcularMontoPagar, MONEDAS, CAMPOS_OBLIGATORIOS, TIPOS_CLIENTE, TIPO_GASTO_OPERATIVO, TERMINOS_PAGO, CONCEPTO_RETAIL, esConceptoRetail } from "../../utils/peticion";
import { formatoMonto, formatoTamano, mensajeError } from "../../utils/formato";
import { ESTADOS } from "../../utils/estados";
import { ORIGENES, origenDeProveedor, puedePeticionarExterior, descripcionCuenta, ordenarCuentas, convertirCuenta, cuentaLocalVacia, cuentaExteriorVacia, faltantesCuenta } from "../../utils/bancario";
import CuentaProveedor from "../catalogos/CuentaProveedor";
import CalculoPago from "./CalculoPago";
import { calcularPago, CLASIFICACIONES, documentoValido } from "../../utils/impuestos";

const MAX_MB = 10;
const ACEPTA = ".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.docx,.doc";

// desdePlan: { plan, cuota } cuando la petición paga una cuota de un plan de
// pago. Proveedor, Orden ELM, moneda y monto vienen del plan y no se editan.
export default function PeticionForm({ peticion, desdePlan }) {
    const router = useRouter();
    const { userData } = useAuth();
    const esEdicion = Boolean(peticion);

    // El área la define el usuario (Usuarios → Área): se carga sola y no se puede cambiar.
    const areaUsuario = userData?.areaId || "";
    const [form, setForm] = useState(() => {
        let inicial = peticion ? formularioDesdePeticion(peticion) : formularioVacio();
        if (!peticion && desdePlan) {
            const { plan, cuota } = desdePlan;
            inicial = {
                ...inicial,
                planId: plan.id,
                cuotaId: cuota.id,
                proveedorId: plan.proveedorId,
                ordenELM: plan.ordenELM || "",
                moneda: plan.moneda,
                monto: String(cuota.monto),
                porcentaje: "100",
                // La última cuota es de contado; las anteriores, anticipos.
                terminoPago: cuota.numero === plan.cuotas.length ? "CONTADO" : "ANTICIPO",
                conceptoCompra: `${cuota.nombre} (cuota ${cuota.numero} de ${plan.cuotas.length}) – ${plan.concepto}`.slice(0, 2000)
            };
        }
        return areaUsuario ? { ...inicial, areaId: areaUsuario } : inicial;
    });
    const [catalogos, setCatalogos] = useState(null);
    const [adjuntos, setAdjuntos] = useState(peticion?.adjuntos || []);
    const [archivosNuevos, setArchivosNuevos] = useState([]);
    const [errores, setErrores] = useState({});
    const [guardando, setGuardando] = useState(null); // null | "borrador" | "enviar"
    const inputArchivos = useRef(null);
    const [nuevoProveedor, setNuevoProveedor] = useState(null); // null | nombre sugerido (abre el modal)
    const [cuentaNueva, setCuentaNueva] = useState(null); // cuenta que se está agregando al proveedor
    const [guardandoCuenta, setGuardandoCuenta] = useState(false);

    // Al cambiar de proveedor se descarta la cuenta que se estaba agregando.
    useEffect(() => setCuentaNueva(null), [form.proveedorId]);

    useEffect(() => {
        Promise.all([
            // Todas las áreas: el área del usuario puede estar inactiva.
            obtenerCatalogo("areas"),
            obtenerCatalogo("proveedores", true),
            obtenerAutorizadores()
        ])
            .then(([areas, proveedores, autorizadores]) =>
                setCatalogos({
                    areas: areas.data.data,
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
    const cuentas = useMemo(() => ordenarCuentas(proveedor?.cuentasBancarias || []), [proveedor]);
    // El tipo de la petición lo define el proveedor elegido.
    const tipo = proveedor ? origenDeProveedor(proveedor) : null;
    const esExterior = tipo === ORIGENES.EXTERIOR;
    const cuentaSeleccionada = cuentas.find((c) => c.id === form.cuentaBancariaId) || null;

    // Solo Compras (área marcada en Catálogos) ve proveedores del exterior.
    const puedeExterior = catalogos ? puedePeticionarExterior(userData, catalogos.areas) : false;
    const proveedoresLocales = catalogos?.proveedores.filter((p) => origenDeProveedor(p) === ORIGENES.LOCAL) || [];
    const sinPermisoExterior = esExterior && !puedeExterior;
    const montoPagar = calcularMontoPagar(form.monto, form.porcentaje);
    const esLocal = tipo === ORIGENES.LOCAL;
    // Vista previa; el cálculo definitivo lo hace el backend con las mismas reglas.
    const calculo = esLocal
        ? calcularPago({
              monto: Number(form.monto),
              subtotal: montoPagar,
              clasificacion: proveedor?.clasificacionContribuyente || "",
              documento: documentoValido(proveedor?.clasificacionContribuyente, form.documentoFiscal),
              aplicaRetencionRenta: form.aplicaRetencionRenta
          })
        : null;
    const proveedoresPermitidos = puedeExterior ? catalogos?.proveedores || [] : proveedoresLocales;
    const areasActivas = catalogos?.areas.filter((a) => a.activo !== false || a.id === form.areaId) || [];
    // Compras: orden ELM y tipos Cliente / Retail / Stock B2B. Las demás
    // áreas: siempre Gasto/Costo Operativo, sin orden ELM ni cliente.
    const esCompras = puedeExterior;
    // Cuota de un plan: datos fijos que vienen del plan.
    const deCuota = Boolean(form.planId);
    const infoCuota = peticion?.planId
        ? { planId: peticion.planId, planNumero: peticion.planNumero, numero: peticion.cuotaNumero, total: peticion.cuotasTotal, nombre: peticion.cuotaNombre }
        : desdePlan
          ? { planId: desdePlan.plan.id, planNumero: desdePlan.plan.numero, numero: desdePlan.cuota.numero, total: desdePlan.plan.cuotas.length, nombre: desdePlan.cuota.nombre }
          : null;

    // Al venir de un plan, si el proveedor tiene una sola cuenta se selecciona.
    useEffect(() => {
        if (deCuota && proveedor && !form.cuentaBancariaId && !form.pagarCuentaDiferente && cuentas.length === 1) {
            setForm((f) => ({ ...f, cuentaBancariaId: cuentas[0].id }));
        }
    }, [deCuota, proveedor, cuentas, form.cuentaBancariaId, form.pagarCuentaDiferente]);
    const esCliente = esCompras && form.tipoCliente === "CLIENTE";

    useEffect(() => {
        if (catalogos && !esCompras && form.tipoCliente !== TIPO_GASTO_OPERATIVO) {
            setForm((f) => ({ ...f, tipoCliente: TIPO_GASTO_OPERATIVO, ordenELM: "", cliente: "", licitacionOC: "" }));
        }
    }, [catalogos, esCompras, form.tipoCliente]);

    // Peticiones guardadas con cuenta diferente en texto libre: al cargar el
    // proveedor se muestran los campos del tipo para capturarla bien.
    useEffect(() => {
        if (proveedor && form.pagarCuentaDiferente && !form.nuevaCuenta) {
            const vacia = origenDeProveedor(proveedor) === ORIGENES.EXTERIOR ? cuentaExteriorVacia() : cuentaLocalVacia();
            setForm((f) => (f.nuevaCuenta ? f : { ...f, nuevaCuenta: { ...vacia, titular: proveedor.nombre } }));
        }
    }, [proveedor, form.pagarCuentaDiferente, form.nuevaCuenta]);

    const ultimoRechazo = useMemo(() => {
        if (![ESTADOS.RECHAZADA_AUTORIZADOR, ESTADOS.RECHAZADA_CONTABILIDAD].includes(peticion?.estado)) return null;
        return [...(peticion.historial || [])].reverse().find((h) => h.accion.startsWith("RECHAZADA"));
    }, [peticion]);

    const cambiar = (campo, valor) => {
        setForm((f) => {
            const nuevo = { ...f, [campo]: valor };

            // Retail: concepto por defecto (en inglés si el proveedor es del
            // exterior). Si el usuario ya escribió algo, se respeta.
            const provActual = catalogos?.proveedores.find((p) => p.id === nuevo.proveedorId);
            const conceptoRetail = CONCEPTO_RETAIL[provActual ? origenDeProveedor(provActual) : "LOCAL"];
            if (nuevo.tipoCliente === "RETAIL" && (!String(nuevo.conceptoCompra).trim() || esConceptoRetail(nuevo.conceptoCompra))) {
                nuevo.conceptoCompra = conceptoRetail;
            } else if (campo === "tipoCliente" && esConceptoRetail(nuevo.conceptoCompra)) {
                nuevo.conceptoCompra = "";
            }

            // La información del cliente solo aplica al tipo "Cliente".
            if (campo === "tipoCliente" && valor !== "CLIENTE") {
                nuevo.cliente = "";
                nuevo.licitacionOC = "";
            }

            if (campo === "proveedorId") {
                const prov = catalogos?.proveedores.find((p) => p.id === valor);
                const lista = prov?.cuentasBancarias || [];
                nuevo.cuentaBancariaId = lista.length === 1 ? lista[0].id : "";
                // La cuenta diferente toma los campos del nuevo tipo.
                if (prov && nuevo.nuevaCuenta) nuevo.nuevaCuenta = convertirCuenta(nuevo.nuevaCuenta, origenDeProveedor(prov));
                // Persona natural no inscrita en IVA: por defecto se le retiene 10% de Renta.
                nuevo.aplicaRetencionRenta = prov?.clasificacionContribuyente === CLASIFICACIONES.NO_INSCRITO;
                nuevo.documentoFiscal = documentoValido(prov?.clasificacionContribuyente, "CCF");
            }

            // Al elegir "Sí" se muestran los campos que pide la banca según el tipo.
            const prov = catalogos?.proveedores.find((p) => p.id === nuevo.proveedorId);
            if (nuevo.pagarCuentaDiferente && !nuevo.nuevaCuenta && prov) {
                const vacia = origenDeProveedor(prov) === ORIGENES.EXTERIOR ? cuentaExteriorVacia() : cuentaLocalVacia();
                nuevo.nuevaCuenta = { ...vacia, titular: prov.nombre };
            }
            return nuevo;
        });
        if (errores[campo]) setErrores((e) => ({ ...e, [campo]: undefined }));
    };

    // Proveedor registrado desde el modal: se agrega a la lista y se selecciona
    // con su cuenta.
    const proveedorCreado = (p) => {
        setCatalogos((c) => ({ ...c, proveedores: [...c.proveedores, p] }));
        setForm((f) => ({
            ...f,
            proveedorId: p.id,
            cuentaBancariaId: p.cuentasBancarias?.[0]?.id || "",
            pagarCuentaDiferente: false,
            nuevaCuenta: null,
            aplicaRetencionRenta: p.clasificacionContribuyente === CLASIFICACIONES.NO_INSCRITO,
            documentoFiscal: documentoValido(p.clasificacionContribuyente, "CCF")
        }));
        setErrores((e) => ({ ...e, proveedorId: undefined, cuenta: undefined }));
        setNuevoProveedor(null);
    };

    // Agregar una cuenta bancaria al proveedor elegido (cualquier usuario;
    // solo agrega, no cambia las existentes).
    const abrirCuentaNueva = () =>
        setCuentaNueva({ ...(esExterior ? cuentaExteriorVacia() : cuentaLocalVacia()), titular: proveedor?.nombre || "" });

    const guardarCuentaNueva = async () => {
        const faltan = faltantesCuenta(cuentaNueva, tipo);
        if (faltan.length) return alertaError(`Completa en la cuenta: ${faltan.join(", ")}.`);
        setGuardandoCuenta(true);
        try {
            const { data } = await agregarCuentaProveedor(proveedor.id, cuentaNueva);
            const { proveedor: actualizado, cuenta } = data.data;
            setCatalogos((c) => ({ ...c, proveedores: c.proveedores.map((x) => (x.id === actualizado.id ? actualizado : x)) }));
            setForm((f) => ({ ...f, cuentaBancariaId: cuenta.id }));
            setErrores((e) => ({ ...e, cuenta: undefined }));
            setCuentaNueva(null);
            toastExito(data.message);
        } catch (e) {
            alertaError(mensajeError(e, "No se pudo agregar la cuenta."));
        } finally {
            setGuardandoCuenta(false);
        }
    };

    // Proveedor local sin clasificación: se indica una sola vez y queda
    // guardada en el proveedor.
    const definirClasificacion = async (clasificacion) => {
        try {
            const { data } = await definirClasificacionProveedor(proveedor.id, clasificacion);
            setCatalogos((c) => ({ ...c, proveedores: c.proveedores.map((x) => (x.id === data.data.id ? data.data : x)) }));
            setForm((f) => ({
                ...f,
                aplicaRetencionRenta: clasificacion === CLASIFICACIONES.NO_INSCRITO,
                documentoFiscal: documentoValido(clasificacion, "CCF")
            }));
            toastExito(data.message);
        } catch (e) {
            alertaError(mensajeError(e, "No se pudo guardar la clasificación."));
        }
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
        if (sinPermisoExterior) {
            setErrores((e) => ({ ...e, proveedorId: "Elige un proveedor local." }));
            return alertaError("Solo el área de Compras puede hacer peticiones a proveedores del exterior. Elige un proveedor local.");
        }
        if (enviar) {
            const faltan = camposFaltantes(form, tipo);
            if (faltan.length) {
                const faltanCuenta = form.pagarCuentaDiferente && form.nuevaCuenta ? faltantesCuenta(form.nuevaCuenta, tipo) : [];
                const mensajeCuenta = faltanCuenta.length
                    ? `Completa en la nueva cuenta: ${faltanCuenta.join(", ")}.`
                    : "Selecciona una cuenta o indica una cuenta diferente.";
                const nuevosErrores = Object.fromEntries(faltan.map((c) => [c, c === "cuenta" ? mensajeCuenta : "Obligatorio para enviar."]));
                setErrores(nuevosErrores);
                const nombres = faltan.map((c) => (c === "cuenta" ? (faltanCuenta.length ? `Nueva cuenta (${faltanCuenta.join(", ")})` : "Cuenta bancaria") : CAMPOS_OBLIGATORIOS[c]));
                alertaError(`Completa: ${nombres.join(", ")}.`, "Faltan datos para enviar");
                const selector = faltan[0] === "cuenta"
                    ? (form.pagarCuentaDiferente ? "#cuenta-nueva input, #nuevaCuentaBancaria" : "[name=\"cuentaBancariaId\"]")
                    : `[name="${faltan[0]}"]`;
                document.querySelector(selector)?.focus();
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

    const sinCatalogos = catalogos.areas.length === 0 || catalogos.proveedores.length === 0;
    const autorizadorFueraDeLista = form.autorizadorId && !catalogos.autorizadores.some((a) => a.uid === form.autorizadorId);

    return (
        <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); guardar(true); }} noValidate>
            {infoCuota && (
                <div className="rounded-2xl border border-blue-400/30 bg-blue-500/15 p-5 text-blue-100">
                    <p className="font-semibold">
                        Cuota {infoCuota.numero} de {infoCuota.total}: {infoCuota.nombre} ·{" "}
                        <Link href={`/planes/${infoCuota.planId}`} className="underline hover:text-white">Plan {infoCuota.planNumero}</Link>
                    </p>
                    <p className="mt-1 text-sm text-blue-200">Proveedor, Orden ELM, moneda y monto vienen del plan. Para cambiarlos, modifica los términos del plan.</p>
                </div>
            )}

            {ultimoRechazo && (
                <div className="rounded-2xl border border-red-400/30 bg-red-500/15 p-6 text-red-200">
                    <p className="font-semibold">Rechazada por {ultimoRechazo.usuarioNombre}</p>
                    <p className="mt-1">{ultimoRechazo.comentario}</p>
                    <p className="mt-2 text-sm text-red-300">Corrige lo necesario y vuelve a enviarla.</p>
                </div>
            )}

            {sinCatalogos && (
                <div className="rounded-2xl border border-amber-400/30 bg-amber-500/15 p-6 text-amber-100 flex gap-3">
                    <FaExclamationTriangle className="mt-1 flex-none" />
                    <p>Faltan catálogos por configurar (áreas o proveedores). Pide a Contabilidad o al Administrador que los registren en Catálogos.</p>
                </div>
            )}

            {/* Información General */}
            <Seccion titulo="Información General">
                <div className={`grid grid-cols-1 md:grid-cols-3 gap-5 ${esCompras ? "xl:grid-cols-5" : "xl:grid-cols-4"}`}>
                    <Campo etiqueta="Fecha Solicitud" htmlFor="fechaSolicitud" requerido error={errores.fechaSolicitud}>
                        {/* La fija el sistema (fecha de creación); no se puede cambiar a mano. */}
                        <input id="fechaSolicitud" name="fechaSolicitud" type="date" value={form.fechaSolicitud} readOnly disabled className={clase("fechaSolicitud")} />
                    </Campo>

                    <Campo etiqueta="Área" htmlFor="areaId" requerido error={errores.areaId} ayuda={areaUsuario ? "Asignada a tu usuario." : undefined}>
                        <select id="areaId" name="areaId" value={form.areaId} onChange={alCambiar} disabled={Boolean(areaUsuario)} className={clase("areaId")}>
                            <option value="">Seleccionar...</option>
                            {areasActivas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                        </select>
                    </Campo>

                    {esCompras && (
                        <Campo etiqueta="Orden ELM" htmlFor="ordenELM">
                            <input id="ordenELM" name="ordenELM" type="text" maxLength={60} value={form.ordenELM} onChange={alCambiar} disabled={deCuota} className={claseInput} />
                        </Campo>
                    )}

                    <Campo etiqueta="Solicitante" htmlFor="solicitante">
                        <input id="solicitante" type="text" value={peticion?.solicitanteNombre || userData?.name || ""} disabled className={claseInput} />
                    </Campo>

                    <Campo etiqueta="Tipo" htmlFor="tipoCliente" requerido={esCompras} error={errores.tipoCliente}>
                        {esCompras ? (
                            <select id="tipoCliente" name="tipoCliente" value={form.tipoCliente} onChange={alCambiar} className={clase("tipoCliente")}>
                                <option value="">Seleccionar...</option>
                                {TIPOS_CLIENTE.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
                            </select>
                        ) : (
                            <select id="tipoCliente" name="tipoCliente" value={TIPO_GASTO_OPERATIVO} disabled className={claseInput}>
                                <option value={TIPO_GASTO_OPERATIVO}>Gasto/Costo Operativo</option>
                            </select>
                        )}
                    </Campo>
                </div>
            </Seccion>

            {/* Información del Proveedor */}
            {/* z-20: la lista del buscador debe quedar sobre las tarjetas de abajo. */}
            <Seccion titulo="Información del Proveedor" className="relative z-20">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <Campo
                        etiqueta="Proveedor"
                        htmlFor="proveedorId"
                        requerido
                        error={errores.proveedorId || (sinPermisoExterior ? "Solo el área de Compras puede peticionar a proveedores del exterior." : undefined)}
                    >
                        {deCuota ? (
                            <input id="proveedorId" name="proveedorId" value={proveedor?.nombre || ""} disabled className={claseInput} />
                        ) : (
                        <BuscadorProveedor
                            proveedores={proveedoresPermitidos}
                            seleccionado={proveedor}
                            onSeleccionar={(id) => cambiar("proveedorId", id)}
                            mostrarTipo={puedeExterior}
                            error={Boolean(errores.proveedorId || sinPermisoExterior)}
                            onNuevo={(texto) => setNuevoProveedor(texto)}
                        />
                        )}
                    </Campo>

                    <Campo etiqueta="Tipo de petición" htmlFor="tipoPeticion" ayuda="Según el origen del proveedor.">
                        <div id="tipoPeticion" className="mt-2 flex h-[50px] items-center">
                            {tipo ? <TipoBadge tipo={tipo} className="text-sm" /> : <span className="text-sm text-slate-400">Primero elige el proveedor.</span>}
                        </div>
                    </Campo>

                    <Campo etiqueta="Código SAP" htmlFor="codigoSAP" ayuda={proveedor && !proveedor.codigoSAP ? "Pendiente: lo completa Contabilidad." : "Se toma del catálogo de proveedores."}>
                        <input id="codigoSAP" type="text" value={proveedor?.codigoSAP || ""} disabled className={claseInput} />
                    </Campo>

                    <Campo
                        etiqueta="Término de pago"
                        htmlFor="terminoPago"
                        requerido
                        error={errores.terminoPago}
                        ayuda={form.terminoPago === "CONTADO" ? "Adjunta la factura en Documentos de soporte." : undefined}
                    >
                        <select id="terminoPago" name="terminoPago" value={form.terminoPago} onChange={alCambiar} className={clase("terminoPago")}>
                            <option value="">Seleccionar...</option>
                            {TERMINOS_PAGO.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
                        </select>
                    </Campo>

                </div>
            </Seccion>

            {/* Cliente: solo Compras (las demás áreas registran gastos operativos). */}
            {esCompras && (
                <Seccion
                    titulo="Información del Cliente"
                    className={esCliente ? "" : "opacity-50"}
                    acciones={!esCliente && <span className="text-xs text-slate-400">Disponible solo cuando el Tipo es “Cliente”.</span>}
                >
                    <fieldset disabled={!esCliente} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <Campo etiqueta="Cliente" htmlFor="cliente">
                            <input id="cliente" name="cliente" maxLength={150} value={form.cliente} onChange={alCambiar} className={claseInput} />
                        </Campo>
                        <Campo etiqueta="Licitación / OC / Proyecto" htmlFor="licitacionOC">
                            <input id="licitacionOC" name="licitacionOC" maxLength={150} value={form.licitacionOC} onChange={alCambiar} className={claseInput} />
                        </Campo>
                    </fieldset>
                </Seccion>
            )}

            {/* Información del Pago */}
            <Seccion titulo="Información del Pago">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                    <Campo etiqueta={esLocal ? "Monto (sin IVA)" : "Monto"} htmlFor="monto" requerido error={errores.monto} ayuda="Base sobre la que se aplica el %.">
                        <input id="monto" name="monto" type="number" min="0" step="0.01" inputMode="decimal" value={form.monto} onChange={alCambiar} disabled={deCuota} className={clase("monto")} />
                    </Campo>

                    <Campo etiqueta="%" htmlFor="porcentaje" requerido error={errores.porcentaje}>
                        <input id="porcentaje" name="porcentaje" type="number" min="0" max="100" step="0.01" value={form.porcentaje} onChange={alCambiar} disabled={deCuota} className={clase("porcentaje")} />
                    </Campo>

                    <Campo etiqueta="Moneda" htmlFor="moneda" requerido>
                        <select id="moneda" name="moneda" value={form.moneda} onChange={alCambiar} disabled={deCuota} className={claseInput}>
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

                    <Campo etiqueta={esLocal ? "Monto a Pagar (sin IVA)" : "Monto a Pagar"} htmlFor="montoPagar" ayuda="Monto × %">
                        <input id="montoPagar" readOnly tabIndex={-1} value={montoPagar === null ? "" : formatoMonto(montoPagar, form.moneda)} className={`${claseInput} bg-white/10 font-bold`} />
                    </Campo>
                </div>

                {esLocal && (
                    <div className="mt-5">
                        <CalculoPago
                            calculo={calculo}
                            clasificacion={proveedor?.clasificacionContribuyente || ""}
                            documento={documentoValido(proveedor?.clasificacionContribuyente, form.documentoFiscal)}
                            onClasificar={definirClasificacion}
                            aplicaRetencionRenta={form.aplicaRetencionRenta}
                            moneda={form.moneda}
                            editable
                            onCambiar={cambiar}
                        />
                    </div>
                )}

                <Campo
                    etiqueta="Concepto/Detalle o comentario de la compra"
                    htmlFor="conceptoCompra"
                    requerido={form.tipoCliente !== "RETAIL"}
                    error={errores.conceptoCompra}
                    ayuda={form.tipoCliente === "RETAIL" ? "Retail: se usa este comentario por defecto; puedes cambiarlo o ampliarlo." : undefined}
                    className="mt-5"
                >
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
                        ayuda={proveedor && cuentas.length === 0 ? "Este proveedor no tiene cuentas registradas: agrégale una abajo." : !proveedor ? "Primero elige el proveedor." : undefined}
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
                            {cuentas.map((c) => <option key={c.id} value={c.id}>{descripcionCuenta(c, tipo)}</option>)}
                        </select>
                    </Campo>
                </div>

                {/* Proveedor sin cuentas: el usuario registra la cuenta principal
                    (queda guardada en el catálogo). Para pagar a otra cuenta se
                    usa "Pagar a una cuenta diferente". */}
                {!form.pagarCuentaDiferente && proveedor && cuentas.length === 0 && (
                    <div className="mt-6">
                        {cuentaNueva ? (
                            <div className="space-y-4 rounded-xl bg-white/5 p-4 ring-1 ring-blue-400/30">
                                <p className="text-sm text-slate-300">
                                    La cuenta se guardará en el proveedor <strong className="text-white">{proveedor.nombre}</strong> para las próximas peticiones.
                                </p>
                                <CuentaProveedor
                                    cuenta={cuentaNueva}
                                    origen={tipo}
                                    indice="agregar"
                                    titulo="Cuenta nueva del proveedor"
                                    onCambiar={(campo, valor) => setCuentaNueva((c) => ({ ...c, [campo]: valor }))}
                                />
                                <div className="flex justify-end gap-3">
                                    <button type="button" onClick={() => setCuentaNueva(null)} disabled={guardandoCuenta} className={botonSecundario}>Cancelar</button>
                                    <button type="button" onClick={guardarCuentaNueva} disabled={guardandoCuenta} className={botonPrimario}>
                                        {guardandoCuenta ? "Guardando..." : "Guardar cuenta"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-100 ring-1 ring-amber-400/30">
                                <span>Este proveedor aún no tiene cuenta bancaria. Regístrala para poder pagarle.</span>
                                <button type="button" onClick={abrirCuentaNueva} className="rounded-lg bg-white/10 px-4 py-2 font-semibold text-white ring-1 ring-white/20 hover:bg-white/20">
                                    + Agregar cuenta al proveedor
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {!form.pagarCuentaDiferente && cuentaSeleccionada && !cuentaNueva && (
                    <div className="mt-6">
                        <DatosCuenta cuenta={cuentaSeleccionada} tipo={tipo} />
                    </div>
                )}

                {form.pagarCuentaDiferente && (
                    <div id="cuenta-nueva" className="mt-6 space-y-3">
                        {!proveedor ? (
                            <p className="text-sm text-slate-400">Primero elige el proveedor para mostrar los datos que pide la banca.</p>
                        ) : (
                            <>
                                <p className="text-sm text-slate-300">
                                    {esExterior ? "Transferencia internacional: completa los datos del beneficiario y de su banco." : "Transferencia local: completa los 5 datos de la cuenta destino."}{" "}
                                    Al enviar la petición, esta cuenta queda registrada en el proveedor como <strong>cuenta secundaria</strong> (por ejemplo, la cuenta de un proyecto).
                                </p>
                                {/* Peticiones antiguas: la cuenta estaba escrita como texto libre. */}
                                {form.nuevaCuentaBancaria && (
                                    <div className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-100 ring-1 ring-amber-400/30">
                                        <p className="font-semibold">Cuenta escrita anteriormente (pásala a los campos):</p>
                                        <p className="mt-1 whitespace-pre-line">{form.nuevaCuentaBancaria}</p>
                                    </div>
                                )}
                                {form.nuevaCuenta && (
                                    <CuentaProveedor
                                        cuenta={form.nuevaCuenta}
                                        origen={tipo}
                                        indice="nueva"
                                        titulo="Nueva cuenta"
                                        onCambiar={(campo, valor) => {
                                            setForm((f) => ({ ...f, nuevaCuenta: { ...f.nuevaCuenta, [campo]: valor } }));
                                            setErrores((x) => ({ ...x, cuenta: undefined }));
                                        }}
                                    />
                                )}
                                {errores.cuenta && <p className="text-sm text-red-400">{errores.cuenta}</p>}
                            </>
                        )}
                    </div>
                )}
            </Seccion>

            {/* Documentos de soporte */}
            <Seccion titulo="Documentos de Soporte">
                <p className="text-sm text-slate-300 mb-4">Proforma, cotización, factura u otro respaldo. PDF, imagen, Excel o Word de hasta {MAX_MB} MB.</p>

                {adjuntos.filter((a) => a.categoria === "SOPORTE").length > 0 && (
                    <AdjuntosLista peticionId={peticion.id} adjuntos={adjuntos.filter((a) => a.categoria === "SOPORTE")} onEliminar={quitarAdjuntoGuardado} />
                )}

                {archivosNuevos.length > 0 && (
                    <ul className="mt-3 space-y-2">
                        {archivosNuevos.map((a, i) => (
                            <li key={`${a.name}-${i}`} className="flex items-center justify-between rounded-lg border border-dashed border-blue-400/50 bg-blue-500/15 px-4 py-2 text-sm">
                                <span className="truncate text-slate-200">{a.name} <span className="text-slate-400">({formatoTamano(a.size)}, se subirá al guardar)</span></span>
                                <button type="button" onClick={() => setArchivosNuevos((l) => l.filter((_, j) => j !== i))} className="ml-3 text-slate-400 hover:text-red-400" aria-label={`Quitar ${a.name}`}>
                                    <FaTimes />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}

                <input ref={inputArchivos} type="file" multiple accept={ACEPTA} className="hidden" onChange={(e) => agregarArchivos([...e.target.files])} />
                <button type="button" onClick={() => inputArchivos.current?.click()} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-slate-200 hover:bg-white/5">
                    <FaPaperclip /> Adjuntar archivos
                </button>
            </Seccion>


            {/* Botones */}
            <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => router.back()} disabled={guardando} className={botonSecundario}>
                    Cancelar
                </button>
                <button type="button" onClick={() => guardar(false)} disabled={guardando} className="px-8 py-3 rounded-xl border-2 border-blue-600 text-blue-300 hover:bg-blue-500/10 font-semibold transition disabled:opacity-60">
                    {guardando === "borrador" ? "Guardando..." : "Guardar borrador"}
                </button>
                <button type="submit" disabled={guardando} className={botonPrimario}>
                    {guardando === "enviar" ? "Enviando..." : ultimoRechazo ? "Reenviar a autorización" : "Enviar a autorización"}
                </button>
            </div>
            <NuevoProveedorModal
                abierto={nuevoProveedor !== null}
                nombreInicial={nuevoProveedor || ""}
                permiteExterior={puedeExterior}
                onCerrar={() => setNuevoProveedor(null)}
                onCreado={proveedorCreado}
            />
        </form>
    );
}
