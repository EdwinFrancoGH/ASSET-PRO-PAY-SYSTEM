"use client";

import { FaTrash } from "react-icons/fa";
import Campo from "../ui/Campo";
import { claseInput } from "../ui/estilos";
import { MONEDAS } from "../../utils/peticion";
import { ORIGENES, TIPOS_CUENTA, TIPOS_PERSONA, BANCOS_SV, intermediarioVacio } from "../../utils/bancario";

// Formulario de una cuenta bancaria del proveedor. Los campos cambian
// según el origen, igual que en la banca:
//   LOCAL    → Banco, Tipo de cuenta, Cuenta destino, Tipo cliente, Titular.
//   EXTERIOR → Beneficiario, SWIFT/ABA del banco y SWIFT/ABA del intermediario.
// También se usa en la petición para "Pagar a una cuenta diferente"
// (sin botón de quitar y con otro título).
// mostrarSecundaria: en Catálogos, permite marcar la cuenta como secundaria.
export default function CuentaProveedor({ cuenta: c, origen, indice: i, onCambiar, onQuitar, titulo, mostrarSecundaria = false }) {
    const id = (campo) => `${campo}-${i}`;
    const input = (campo, props = {}) => (
        <input id={id(campo)} value={c[campo] ?? ""} onChange={(e) => onCambiar(campo, e.target.value)} className={claseInput} {...props} />
    );
    const select = (campo, opciones) => (
        <select id={id(campo)} value={c[campo] ?? ""} onChange={(e) => onCambiar(campo, e.target.value)} className={claseInput}>
            {opciones.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
        </select>
    );

    const inter = c.intermediario;

    return (
        <fieldset className="rounded-xl border border-white/10 p-4">
            <legend className="px-2 text-sm text-slate-400">{titulo || `Cuenta ${Number(i) + 1}`}</legend>

            {origen === ORIGENES.LOCAL ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Campo etiqueta="Banco" htmlFor={id("banco")} requerido>
                        {input("banco", { required: true, list: "bancos-sv", placeholder: "Seleccionar o escribir..." })}
                    </Campo>
                    <Campo etiqueta="Tipo de cuenta" htmlFor={id("tipoCuenta")} requerido>
                        {select("tipoCuenta", TIPOS_CUENTA)}
                    </Campo>
                    <Campo etiqueta="Cuenta destino" htmlFor={id("numeroCuenta")} requerido ayuda="Solo números, sin guiones.">
                        {input("numeroCuenta", { required: true, inputMode: "numeric", pattern: "[0-9\\s-]+" })}
                    </Campo>
                    <Campo etiqueta="Tipo cliente" htmlFor={id("tipoPersona")} requerido>
                        {select("tipoPersona", TIPOS_PERSONA)}
                    </Campo>
                    <Campo etiqueta="Titular" htmlFor={id("titular")} requerido ayuda="Tal como aparece en el banco." className="sm:col-span-2">
                        {input("titular", { required: true })}
                    </Campo>
                    <datalist id="bancos-sv">
                        {BANCOS_SV.map((b) => <option key={b} value={b} />)}
                    </datalist>
                </div>
            ) : (
                <div className="space-y-5">
                    <div>
                        <h4 className="mb-2 text-sm font-semibold text-slate-300">Datos del beneficiario</h4>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <Campo etiqueta="Nombre del beneficiario" htmlFor={id("titular")} requerido className="lg:col-span-2">
                                {input("titular", { required: true })}
                            </Campo>
                            <Campo etiqueta="Cuenta beneficiario" htmlFor={id("numeroCuenta")} requerido ayuda="Número de cuenta o IBAN.">
                                {input("numeroCuenta", { required: true })}
                            </Campo>
                            <Campo etiqueta="Dirección del beneficiario" htmlFor={id("direccionBeneficiario")} requerido className="sm:col-span-2 lg:col-span-3">
                                {input("direccionBeneficiario", { required: true, placeholder: "Calle, ciudad, estado/provincia, país" })}
                            </Campo>
                            <Campo etiqueta="Tipo de beneficiario" htmlFor={id("tipoPersona")} requerido>
                                {select("tipoPersona", TIPOS_PERSONA)}
                            </Campo>
                            <Campo etiqueta="Teléfono del beneficiario" htmlFor={id("telefono")}>
                                {input("telefono", { type: "tel" })}
                            </Campo>
                        </div>
                    </div>

                    <div>
                        <h4 className="mb-2 text-sm font-semibold text-slate-300">Banco del beneficiario</h4>
                        <p className="mb-2 text-xs text-slate-400">Nombre, país y dirección del banco los completa la banca a partir del SWIFT/ABA.</p>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            <Campo etiqueta="N° ABA o SWIFT del banco" htmlFor={id("swift")} requerido ayuda="SWIFT de 8 u 11 caracteres o ABA de 9 dígitos.">
                                {input("swift", { required: true, className: `${claseInput} uppercase` })}
                            </Campo>
                            <Campo etiqueta="Moneda" htmlFor={id("moneda")}>
                                <select id={id("moneda")} value={c.moneda || "USD"} onChange={(e) => onCambiar("moneda", e.target.value)} className={claseInput}>
                                    {MONEDAS.map((m) => <option key={m}>{m}</option>)}
                                </select>
                            </Campo>
                        </div>
                    </div>

                    <div>
                        <label className="flex items-center gap-3 text-sm font-semibold text-slate-300">
                            <input type="checkbox" checked={Boolean(inter)} onChange={(e) => onCambiar("intermediario", e.target.checked ? intermediarioVacio() : null)} className="h-4 w-4" />
                            Usa banco intermediario
                        </label>
                        {inter && (
                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                <Campo etiqueta="N° ABA o SWIFT del banco intermediario" htmlFor={id("i-swift")} requerido>
                                    <input id={id("i-swift")} required value={inter.swift || ""} onChange={(e) => onCambiar("intermediario", { swift: e.target.value })} className={`${claseInput} uppercase`} />
                                </Campo>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {mostrarSecundaria && (
                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
                    <label className="flex items-center gap-2 text-slate-200">
                        <input type="checkbox" checked={c.secundaria === true} onChange={(e) => onCambiar("secundaria", e.target.checked)} className="h-4 w-4" />
                        Cuenta secundaria (p. ej. para un proyecto)
                    </label>
                    {c.agregadaPorNombre && (
                        <span className="text-xs text-slate-400">
                            Agregada por {c.agregadaPorNombre}{c.peticionOrigen ? ` en la petición ${c.peticionOrigen}` : ""}
                        </span>
                    )}
                </div>
            )}

            {onQuitar && (
                <button type="button" onClick={onQuitar} className="mt-3 inline-flex items-center gap-2 text-sm text-red-400 hover:underline">
                    <FaTrash /> Quitar cuenta
                </button>
            )}
        </fieldset>
    );
}
