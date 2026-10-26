import * as servicio from "../services/proveedores.service.js";
import { manejar } from "../utils/errores.js";

// POST /api/catalogos/proveedores/registro (cualquier usuario)
export const registrar = manejar(async (req, res) => {
    const data = await servicio.registrar(req.body, req.usuario);
    res.status(201).json({ ok: true, message: `Proveedor "${data.nombre}" registrado. Contabilidad completará el código SAP.`, data });
});

// POST /api/catalogos/proveedores/:id/cuentas (cualquier usuario)
export const agregarCuenta = manejar(async (req, res) => {
    const data = await servicio.agregarCuenta(req.params.id, req.body, req.usuario);
    res.status(201).json({ ok: true, message: data.yaExistia ? "La cuenta ya estaba registrada; se seleccionó." : "Cuenta agregada al proveedor.", data });
});

// PUT /api/catalogos/proveedores/:id/clasificacion { clasificacion } (cualquier usuario, solo si no tiene)
export const definirClasificacion = manejar(async (req, res) => {
    const data = await servicio.definirClasificacion(req.params.id, req.body.clasificacion, req.usuario);
    res.json({ ok: true, message: "Clasificación guardada en el proveedor.", data });
});
