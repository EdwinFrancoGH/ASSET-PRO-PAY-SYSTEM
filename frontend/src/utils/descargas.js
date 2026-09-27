// Las descargas pasan por axios (necesitan el token), así que se recibe un
// Blob y se dispara la descarga desde el navegador.
export const descargarBlob = (respuesta, nombrePorDefecto = "archivo") => {
    const disposicion = respuesta.headers?.["content-disposition"] || "";
    const utf8 = disposicion.match(/filename\*=UTF-8''([^;]+)/i);
    const simple = disposicion.match(/filename="?([^";]+)"?/i);
    const nombre = utf8 ? decodeURIComponent(utf8[1]) : simple ? simple[1] : nombrePorDefecto;

    const url = URL.createObjectURL(respuesta.data);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = nombre;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const abrirBlob = (respuesta) => {
    const url = URL.createObjectURL(respuesta.data);
    window.open(url, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
};
