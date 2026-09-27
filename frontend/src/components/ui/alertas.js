import Swal from "sweetalert2";

export const toastExito = (mensaje) =>
    Swal.fire({ toast: true, position: "top-end", icon: "success", title: mensaje, showConfirmButton: false, timer: 2500, timerProgressBar: true });

export const alertaError = (mensaje, titulo = "No se pudo completar") =>
    Swal.fire({ icon: "error", title: titulo, text: mensaje, confirmButtonColor: "#2563eb" });

export const confirmar = async ({ titulo, texto, confirmar = "Confirmar", peligro = false }) => {
    const r = await Swal.fire({
        icon: peligro ? "warning" : "question",
        title: titulo,
        text: texto,
        showCancelButton: true,
        confirmButtonText: confirmar,
        cancelButtonText: "Cancelar",
        confirmButtonColor: peligro ? "#dc2626" : "#2563eb",
        reverseButtons: true
    });
    return r.isConfirmed;
};
