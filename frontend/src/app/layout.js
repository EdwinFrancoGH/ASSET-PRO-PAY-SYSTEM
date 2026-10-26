import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { AuthProvider } from "../context/AuthContext";

// Se usa el paquete "geist" (y no next/font/google) porque Next 14 no
// incluye Geist en su lista de Google Fonts.
export const metadata = {
    title: "ASSET PRO - Peticiones de Pago",
    description: "Sistema de peticiones de pago"
};

// Aplica el modo claro antes de pintar la página (evita el "parpadeo" oscuro).
const scriptTema = `try{if(localStorage.getItem("assetpro-tema")==="claro"){document.documentElement.classList.add("tema-claro")}}catch(e){}`;

export default function RootLayout({ children }) {
    return (
        <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`} suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
            </head>
            <body className="min-h-full">
                <AuthProvider>{children}</AuthProvider>
            </body>
        </html>
    );
}
