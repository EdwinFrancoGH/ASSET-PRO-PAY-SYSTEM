// Luces tipo luciérnaga del estilo del login, para el área de trabajo.
// Posiciones fijas para evitar diferencias entre servidor y cliente.
const LUCES = [
    { top: "10%", left: "4%", size: 5, delay: "0s", dur: "8s" },
    { top: "35%", left: "12%", size: 4, delay: "2s", dur: "10s" },
    { top: "70%", left: "6%", size: 7, delay: "1s", dur: "9s" },
    { top: "88%", left: "22%", size: 5, delay: "3s", dur: "7s" },
    { top: "20%", left: "92%", size: 6, delay: "1.5s", dur: "9s" },
    { top: "55%", left: "96%", size: 4, delay: "2.5s", dur: "11s" },
    { top: "80%", left: "85%", size: 7, delay: "0.8s", dur: "8s" },
    { top: "92%", left: "60%", size: 4, delay: "4s", dur: "10s" }
];

export default function FondoNocturno() {
    return (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            {LUCES.map((l, i) => (
                <span
                    key={i}
                    className="luciernaga"
                    style={{ top: l.top, left: l.left, width: l.size, height: l.size, animationDelay: l.delay, animationDuration: l.dur }}
                />
            ))}
        </div>
    );
}
