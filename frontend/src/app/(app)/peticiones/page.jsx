"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FaFileExcel, FaPlus, FaSearch } from "react-icons/fa";

import EncabezadoPagina from "../../../components/ui/EncabezadoPagina";
import Cargando from "../../../components/ui/Cargando";
import TablaPeticiones from "../../../components/peticiones/TablaPeticiones";
import BuscadorProveedor from "../../../components/peticiones/BuscadorProveedor";
import { claseInput } from "../../../components/ui/estilos";
import { alertaError, toastExito } from "../../../components/ui/alertas";

import { useAuth } from "../../../context/AuthContext";
import { obtenerPeticiones, exportarExcel } from "../../../services/peticiones.service";
import { obtenerCatalogo } from "../../../services/catalogos.service";
import { ROLES } from "../../../utils/roles";
import { INFO_ESTADO } from "../../../utils/estados";
import { descargarBlob } from "../../../utils/descargas";
import { formatoMonto, mensajeError } from "../../../utils/formato";
import { montoFinal } from "../../../utils/impuestos";

const FILTROS_VACIOS = { estado: "", tipo: "", desde: "", hasta: "", areaId: "", proveedorId: "", q: "" };
const EN_PROCESO = "ENVIADA,EN_REVISION,APROBADA_AUTORIZADOR,APROBADA_CONTABILIDAD";

function Peticiones() {
    const { userRole } = useAuth();
    const searchParams = useSearchParams();
    const esGestion = [ROLES.CONTABILIDAD, ROLES.ADMIN].includes(userRole);
    const verPestanas = userRole !== ROLES.EMPLEADO;

    const [alcance, setAlcance] = useState(esGestion ? "todas" : verPestanas ? "todas" : "mias");
    const [filtros, setFiltros] = useState(() => ({ ...FILTROS_VACIOS, estado: searchParams.get("estado") || "" }));
    const [peticiones, setPeticiones] = useState(null);
    const [catalogos, setCatalogos] = useState({ areas: [], proveedores: [] });
    const [exportando, setExportando] = useState(false);

    const parametros = useCallback(
        () => ({ ...filtros, alcance: alcance === "mias" ? "mias" : "" }),
        [filtros, alcance]
    );

    const cargar = useCallback(async () => {
        setPeticiones(null);
        try {
            const { data } = await obtenerPeticiones(parametros());
            setPeticiones(data.data);
        } catch (e) {
            setPeticiones([]);
            alertaError(mensajeError(e, "No se pudieron cargar las peticiones."));
        }
    }, [parametros]);

    // Filtros de texto con pequeña espera para no consultar en cada tecla.
    useEffect(() => {
        const t = setTimeout(cargar, filtros.q ? 350 : 0);
        return () => clearTimeout(t);
    }, [cargar, filtros.q]);

    useEffect(() => {
        Promise.all([obtenerCatalogo("areas"), obtenerCatalogo("proveedores")])
            .then(([a, p]) => setCatalogos({ areas: a.data.data, proveedores: p.data.data }))
            .catch(() => {});
    }, []);

    const cambiar = (e) => setFiltros((f) => ({ ...f, [e.target.name]: e.target.value }));

    const exportar = async () => {
        setExportando(true);
        try {
            const respuesta = await exportarExcel(parametros());
            descargarBlob(respuesta, "peticiones-pago.xlsx");
            toastExito("Excel descargado.");
        } catch (e) {
            alertaError("No se pudo generar el Excel. Revisa los filtros e inténtalo de nuevo.");
        } finally {
            setExportando(false);
        }
    };

    const hayFiltros = Object.values(filtros).some(Boolean);
    const totales = (peticiones || []).reduce((acc, p) => {
        acc[p.moneda || "USD"] = (acc[p.moneda || "USD"] || 0) + Number(montoFinal(p) || 0);
        return acc;
    }, {});

    return (
        <>
            <EncabezadoPagina titulo="Peticiones de pago" descripcion="Consulta el estado de las peticiones y filtra por fecha, área o proveedor.">
                {esGestion && (
                    <button onClick={exportar} disabled={exportando || !peticiones?.length} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-emerald-700 disabled:opacity-60">
                        <FaFileExcel /> {exportando ? "Generando..." : "Descargar Excel"}
                    </button>
                )}
                <Link href="/peticiones/nueva" className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-900/50 transition hover:from-blue-400 hover:to-blue-600">
                    <FaPlus /> Nueva petición
                </Link>
            </EncabezadoPagina>

            <div className="bg-slate-800/35 backdrop-blur-xl ring-1 ring-white/15 rounded-2xl shadow-lg">
                {verPestanas && (
                    <div className="flex gap-1 border-b px-6 pt-4" role="tablist">
                        {[["todas", esGestion ? "Todas" : "Asignadas y mías"], ["mias", "Solo las mías"]].map(([valor, texto]) => (
                            <button
                                key={valor}
                                role="tab"
                                aria-selected={alcance === valor}
                                onClick={() => setAlcance(valor)}
                                className={`rounded-t-lg px-4 py-2 font-medium border-b-2 -mb-px ${alcance === valor ? "border-blue-600 text-blue-300" : "border-transparent text-slate-400 hover:text-white"}`}
                            >
                                {texto}
                            </button>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-4 lg:grid-cols-8 border-b">
                    <div className="relative lg:col-span-2">
                        <label htmlFor="q" className="text-sm font-medium text-slate-300">Buscar</label>
                        <FaSearch className="absolute left-3 top-[2.9rem] text-slate-400" />
                        <input id="q" name="q" value={filtros.q} onChange={cambiar} placeholder="Número, proveedor, cliente, OC..." className={`${claseInput} pl-9`} />
                    </div>
                    <div>
                        <label htmlFor="estado" className="text-sm font-medium text-slate-300">Estado</label>
                        <select id="estado" name="estado" value={filtros.estado} onChange={cambiar} className={claseInput}>
                            <option value="">Todos</option>
                            <option value={EN_PROCESO}>En proceso</option>
                            <option value="RECHAZADA_AUTORIZADOR,RECHAZADA_CONTABILIDAD">Rechazadas (ambas)</option>
                            {Object.entries(INFO_ESTADO).map(([k, v]) => <option key={k} value={k}>{v.etiqueta}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="tipo" className="text-sm font-medium text-slate-300">Tipo</label>
                        <select id="tipo" name="tipo" value={filtros.tipo} onChange={cambiar} className={claseInput}>
                            <option value="">Todos</option>
                            <option value="LOCAL">Local</option>
                            <option value="EXTERIOR">Exterior</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="desde" className="text-sm font-medium text-slate-300">Desde</label>
                        <input id="desde" name="desde" type="date" value={filtros.desde} onChange={cambiar} className={claseInput} />
                    </div>
                    <div>
                        <label htmlFor="hasta" className="text-sm font-medium text-slate-300">Hasta</label>
                        <input id="hasta" name="hasta" type="date" value={filtros.hasta} onChange={cambiar} className={claseInput} />
                    </div>
                    <div>
                        <label htmlFor="areaId" className="text-sm font-medium text-slate-300">Área</label>
                        <select id="areaId" name="areaId" value={filtros.areaId} onChange={cambiar} className={claseInput}>
                            <option value="">Todas</option>
                            {catalogos.areas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="proveedorId" className="text-sm font-medium text-slate-300">Proveedor</label>
                        <BuscadorProveedor
                            proveedores={catalogos.proveedores}
                            seleccionado={catalogos.proveedores.find((p) => p.id === filtros.proveedorId) || null}
                            onSeleccionar={(id) => setFiltros((f) => ({ ...f, proveedorId: id }))}
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 text-sm text-slate-300">
                    <span>
                        {peticiones ? `${peticiones.length} ${peticiones.length === 1 ? "petición" : "peticiones"}` : "Buscando..."}
                        {peticiones?.length > 0 && `, total ${Object.entries(totales).map(([m, t]) => formatoMonto(t, m)).join(" + ")}`}
                    </span>
                    {hayFiltros && <button onClick={() => setFiltros(FILTROS_VACIOS)} className="text-blue-400 hover:underline">Limpiar filtros</button>}
                </div>

                {peticiones === null ? (
                    <Cargando />
                ) : (
                    <TablaPeticiones
                        peticiones={peticiones}
                        mostrarSolicitante={userRole !== ROLES.EMPLEADO || alcance !== "mias"}
                        vacio={hayFiltros ? "Ninguna petición coincide con los filtros." : "Aún no hay peticiones. Crea la primera con “Nueva petición”."}
                    />
                )}
            </div>
        </>
    );
}

export default function PeticionesPage() {
    return (
        <Suspense fallback={<Cargando />}>
            <Peticiones />
        </Suspense>
    );
}
