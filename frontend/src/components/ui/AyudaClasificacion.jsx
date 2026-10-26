import { FaIdCard } from "react-icons/fa";

// Dónde encontrar la clasificación del contribuyente del proveedor.
export default function AyudaClasificacion({ className = "" }) {
    return (
        <div className={`flex gap-3 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-100 ring-1 ring-amber-400/30 ${className}`}>
            <FaIdCard className="mt-0.5 flex-none text-lg text-amber-300" />
            <p>
                <strong>¿Dónde la encuentro?</strong> En la <strong>Tarjeta de Registro de Contribuyente IVA (NRC)</strong> del proveedor, en el
                campo <strong>Clasificación</strong>: Grande, Mediano u Otros (pequeño). Si el proveedor no tiene NRC, es una persona natural no
                inscrita en IVA. Pídesela al proveedor si no la tienes; solo se pregunta una vez.
            </p>
        </div>
    );
}
