import Swal from "sweetalert2";
import { alertaError, toastExito } from "../ui/alertas";
import { eliminarFactura } from "../../services/facturas.service";
import { mensajeError } from "../../utils/formato";

// Pide confirmación (con motivo opcional) y elimina la factura. No se
// borra del sistema: queda "Eliminada" y Contabilidad la sigue viendo.
// Devuelve true si se eliminó.
export const confirmarEliminacion = async (factura) => {
    const r = await Swal.fire({
        icon: "warning",
        title: "¿Eliminar la factura?",
        html: `Factura <b>${factura.numeroFactura}</b> de ${factura.proveedorNombre}.<br><small>El registro se conserva como <b>Eliminada</b> y Contabilidad lo seguirá viendo.</small>`,
        input: "textarea",
        inputPlaceholder: "Motivo (opcional)",
        inputAttributes: { maxlength: "1000" },
        showCancelButton: true,
        confirmButtonText: "Eliminar",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#dc2626",
        reverseButtons: true
    });
    if (!r.isConfirmed) return false;
    try {
        const { data } = await eliminarFactura(factura.id, r.value || "");
        toastExito(data.message);
        return true;
    } catch (e) {
        alertaError(mensajeError(e, "No se pudo eliminar la factura."));
        return false;
    }
};
