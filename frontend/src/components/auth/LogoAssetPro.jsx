// Isotipo hexagonal de ASSET PRO (SVG, sin imágenes externas).
export default function LogoAssetPro({ className = "h-12 w-12" }) {
    return (
        <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
            <defs>
                <linearGradient id="ap-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                </linearGradient>
            </defs>
            {/* Hexágono exterior */}
            <path
                d="M32 4 L56 18 L56 46 L32 60 L8 46 L8 18 Z"
                fill="none"
                stroke="url(#ap-grad)"
                strokeWidth="7"
                strokeLinejoin="round"
            />
            {/* Cara superior (efecto cubo) */}
            <path d="M32 20 L43 26.5 L32 33 L21 26.5 Z" fill="#93c5fd" />
            {/* Caras laterales */}
            <path d="M21 26.5 L32 33 L32 45 L21 38.5 Z" fill="#2563eb" />
            <path d="M43 26.5 L32 33 L32 45 L43 38.5 Z" fill="#1e40af" />
        </svg>
    );
}
