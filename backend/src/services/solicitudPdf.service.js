// Solicitud de pago en PDF (tamaño carta) para el ZIP del expediente.
// Es la misma hoja que el frontend muestra en /peticiones/[id]/imprimir
// (components/impresion/SolicitudImprimible.jsx). Si se cambia una, se
// ajusta también la otra.
import PDFDocument from "pdfkit";
import { ETIQUETAS_ESTADO } from "../config/estados.js";
import { ORIGENES, tipoDePeticion } from "../config/bancario.js";
import { CLASIFICACIONES, DOCUMENTOS, montoFinal } from "../config/impuestos.js";

const AZUL = "#1d4ed8";
const TINTA = "#0f172a";
const GRIS = "#64748b";
const LINEA = "#e2e8f0";
const ZONA = "America/El_Salvador";

const ETIQUETA_TIPO_CLIENTE = { CLIENTE: "Cliente", RETAIL: "Retail", STOCK: "Stock B2B", GASTO_OPERATIVO: "Gasto/Costo Operativo" };
const ETIQUETA_ORIGEN = { LOCAL: "Local", EXTERIOR: "Exterior" };
const ETIQUETA_CLASIFICACION = {
    GRANDE: "Gran contribuyente",
    MEDIANO: "Mediano contribuyente",
    PEQUENO: "Pequeño contribuyente",
    NO_INSCRITO: "Persona natural no inscrita en IVA"
};
const ETIQUETA_DOCUMENTO = { CCF: "Crédito fiscal (CCF)", CONSUMIDOR_FINAL: "Consumidor final", SUJETO_EXCLUIDO: "Sujeto excluido" };
const ETIQUETA_TIPO_CUENTA = { AHORRO: "Ahorro", CORRIENTE: "Corriente" };
const ETIQUETA_TIPO_PERSONA = { NATURAL: "Natural", JURIDICO: "Jurídico" };

// ---------------------------------------------------------------------------
// Formatos (mismo resultado que utils/formato.js del frontend)
// ---------------------------------------------------------------------------
const monto = (valor, moneda = "USD") => {
    if (valor === null || valor === undefined || valor === "") return "—";
    return new Intl.NumberFormat("es-SV", { style: "currency", currency: moneda || "USD" }).format(Number(valor));
};

const fecha = (v) => {
    if (!v) return "—";
    const [a, m, d] = String(v).slice(0, 10).split("-").map(Number);
    if (!a || !m || !d) return "—";
    return new Date(Date.UTC(a, m - 1, d, 12)).toLocaleDateString("es-SV", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
};

const fechaHora = (iso) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("es-SV", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: ZONA });
};

const texto = (v) => (v === undefined || v === null || String(v).trim() === "" ? "—" : String(v));

const licitacionOCProyecto = (p) => {
    const oc = String(p?.licitacionOC ?? "").trim();
    const proyecto = String(p?.proyecto ?? "").trim();
    if (!proyecto || oc.includes(proyecto)) return oc;
    return oc ? `${oc} / ${proyecto}` : proyecto;
};

const tipoCliente = (p) => ETIQUETA_TIPO_CLIENTE[p.tipoCliente] || (p.cliente ? "Cliente" : "");

// Mismas filas que filasCuenta() del frontend (utils/bancario.js).
const filasCuenta = (c, origen) => {
    if (!c) return [];
    if (origen === ORIGENES.EXTERIOR) {
        const filas = [
            ["Beneficiario", "Nombre del beneficiario", c.titular],
            ["Beneficiario", "Cuenta beneficiario", c.numeroCuenta],
            ["Beneficiario", "Dirección del beneficiario", c.direccionBeneficiario],
            ["Beneficiario", "Tipo de beneficiario", ETIQUETA_TIPO_PERSONA[c.tipoPersona] || c.tipoPersona],
            ["Beneficiario", "Teléfono del beneficiario", c.telefono],
            ["Banco del beneficiario", "N° ABA o SWIFT", c.swift],
            ["Banco del beneficiario", "Moneda", c.moneda]
        ];
        if (c.intermediario) filas.push(["Banco intermediario", "N° ABA o SWIFT", c.intermediario.swift]);
        return filas;
    }
    const tipoCuenta = String(c.tipoCuenta || "").toUpperCase().replace("AHORROS", "AHORRO");
    return [
        ["Cuenta destino", "Banco", c.banco],
        ["Cuenta destino", "Tipo de cuenta", ETIQUETA_TIPO_CUENTA[tipoCuenta] || c.tipoCuenta],
        ["Cuenta destino", "Cuenta destino", c.numeroCuenta],
        ["Cuenta destino", "Tipo cliente", ETIQUETA_TIPO_PERSONA[c.tipoPersona] || c.tipoPersona],
        ["Cuenta destino", "Titular", c.titular]
    ];
};

// Mismo criterio que la hoja del frontend.
const filasCalculo = (p, tipo) => {
    const c = p.calculo;
    const pct = p.porcentaje !== null && p.porcentaje !== undefined ? `${p.porcentaje}%` : "—";
    if (tipo !== ORIGENES.LOCAL || !c) {
        return [["Monto base", monto(p.monto, p.moneda)], ["Porcentaje", pct], ["Monto a pagar", monto(p.montoPagar, p.moneda)]];
    }
    if (p.documentoFiscal === DOCUMENTOS.CONSUMIDOR_FINAL) {
        return [["Monto base", monto(p.monto, p.moneda)], ["Porcentaje", pct], ["Monto a pagar (impuestos incluidos)", monto(c.subtotal, p.moneda)]];
    }
    const noInscrito = p.clasificacionContribuyente === CLASIFICACIONES.NO_INSCRITO || p.documentoFiscal === DOCUMENTOS.SUJETO_EXCLUIDO;
    const filas = [["Monto base", monto(p.monto, p.moneda)], ["Porcentaje", pct], ["Subtotal sin IVA", monto(c.subtotal, p.moneda)]];
    if (!noInscrito) filas.push(["IVA 13%", `+ ${monto(c.iva || 0, p.moneda)}`]);
    if (c.retencionIva > 0) filas.push(["Retención IVA 1%", `- ${monto(c.retencionIva, p.moneda)}`]);
    if (c.retencionRenta > 0) filas.push(["Retención Renta 10%", `- ${monto(c.retencionRenta, p.moneda)}`]);
    return filas;
};

const ultimo = (historial = [], acciones) => [...historial].reverse().find((h) => acciones.includes(h.accion));

// ---------------------------------------------------------------------------
// Dibujo
// ---------------------------------------------------------------------------
export const generarSolicitudPdf = (p, generadoPor = "") =>
    new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            size: "LETTER",
            margins: { top: 34, bottom: 34, left: 40, right: 40 },
            info: { Title: `Solicitud de pago ${p.numero || ""}`.trim(), Author: "ASSET PRO PAY" }
        });
        const partes = [];
        doc.on("data", (d) => partes.push(d));
        doc.on("end", () => resolve(Buffer.concat(partes)));
        doc.on("error", reject);

        const X = doc.page.margins.left;
        const ANCHO = doc.page.width - doc.page.margins.left - doc.page.margins.right;
        const FONDO = () => doc.page.height - doc.page.margins.bottom;

        // Salta de página si lo que sigue (alto estimado) no cabe.
        const espacio = (alto) => {
            if (doc.y + alto > FONDO()) doc.addPage();
        };

        const titulo = (t) => {
            espacio(40);
            doc.moveDown(0.6);
            doc.font("Helvetica-Bold").fontSize(8).fillColor(AZUL).text(t.toUpperCase(), X, doc.y, { characterSpacing: 0.6 });
            const y = doc.y + 2;
            doc.moveTo(X, y).lineTo(X + ANCHO, y).lineWidth(0.6).strokeColor(LINEA).stroke();
            doc.y = y + 5;
        };

        // Rejilla de campos: [[etiqueta, valor, columnasQueOcupa]]
        const campos = (lista, columnas = 4, x0 = X, ancho = ANCHO) => {
            const anchoCol = ancho / columnas;
            let col = 0;
            let yFila = doc.y;
            let altoFila = 0;
            for (const [etiqueta, valor, span = 1] of lista) {
                if (col + span > columnas) {
                    yFila += altoFila + 5;
                    col = 0;
                    altoFila = 0;
                }
                const w = anchoCol * span - 8;
                const x = x0 + col * anchoCol;
                doc.font("Helvetica").fontSize(6.5).fillColor(GRIS);
                const hEt = doc.heightOfString(etiqueta.toUpperCase(), { width: w });
                doc.font("Helvetica-Bold").fontSize(8.5);
                const hVal = doc.heightOfString(texto(valor), { width: w });
                if (yFila + hEt + hVal > FONDO()) {
                    doc.addPage();
                    yFila = doc.y;
                }
                doc.font("Helvetica").fontSize(6.5).fillColor(GRIS).text(etiqueta.toUpperCase(), x, yFila, { width: w });
                doc.font("Helvetica-Bold").fontSize(8.5).fillColor(TINTA).text(texto(valor), x, yFila + hEt + 1, { width: w });
                altoFila = Math.max(altoFila, hEt + hVal + 1);
                col += span;
            }
            doc.y = yFila + altoFila + 2;
            doc.x = X;
        };

        // Tabla simple: anchos en proporción.
        const tabla = (encabezados, filas, proporciones, { x0 = X, ancho = ANCHO, resaltarUltima = false, alinearDerecha = [] } = {}) => {
            const total = proporciones.reduce((a, b) => a + b, 0);
            const anchos = proporciones.map((v) => (v / total) * ancho);
            const dibujarFila = (celdas, { encabezado = false, resaltada = false } = {}) => {
                doc.font(encabezado || resaltada ? "Helvetica-Bold" : "Helvetica").fontSize(encabezado ? 6.5 : 8);
                const alto = Math.max(...celdas.map((c, i) => doc.heightOfString(String(c), { width: anchos[i] - 8 }))) + 8;
                if (doc.y + alto > FONDO()) doc.addPage();
                const y = doc.y;
                let x = x0;
                if (encabezado || resaltada) doc.rect(x0, y, ancho, alto).fill(encabezado ? "#f1f5f9" : "#eff6ff");
                celdas.forEach((c, i) => {
                    doc.rect(x, y, anchos[i], alto).lineWidth(0.5).strokeColor(LINEA).stroke();
                    doc.fillColor(encabezado ? "#475569" : TINTA).text(String(c), x + 4, y + 4, {
                        width: anchos[i] - 8,
                        align: alinearDerecha.includes(i) ? "right" : "left"
                    });
                    x += anchos[i];
                });
                doc.y = y + alto;
            };
            if (encabezados) dibujarFila(encabezados.map((e) => e.toUpperCase()), { encabezado: true });
            filas.forEach((f, i) => dibujarFila(f, { resaltada: resaltarUltima && i === filas.length - 1 }));
            doc.x = X;
        };

        // --- Encabezado -------------------------------------------------------
        const yTop = doc.y;
        // Isotipo (hexágono + cubo), igual al de LogoAssetPro.jsx
        doc.save().translate(X, yTop).scale(0.62);
        doc.path("M32 4 L56 18 L56 46 L32 60 L8 46 L8 18 Z").lineWidth(7).lineJoin("round").strokeColor("#2563eb").stroke();
        doc.path("M32 20 L43 26.5 L32 33 L21 26.5 Z").fill("#93c5fd");
        doc.path("M21 26.5 L32 33 L32 45 L21 38.5 Z").fill("#2563eb");
        doc.path("M43 26.5 L32 33 L32 45 L43 38.5 Z").fill("#1e40af");
        doc.restore();
        doc.font("Helvetica-Bold").fontSize(14).fillColor(TINTA).text("Electrolab Médic", X + 48, yTop + 9);
        doc.font("Helvetica").fontSize(7.5).fillColor(GRIS).text("ASSET PRO PAY · Peticiones de pago", X + 48, yTop + 26);

        const der = { width: 230, align: "right" };
        const xDer = X + ANCHO - 230;
        doc.font("Helvetica-Bold").fontSize(12).fillColor(TINTA).text("SOLICITUD DE PAGO", xDer, yTop, der);
        doc.font("Helvetica-Bold").fontSize(15).fillColor(AZUL).text(p.numero || "Sin número", xDer, yTop + 15, der);
        doc.font("Helvetica").fontSize(7.5).fillColor(GRIS).text(`Fecha de solicitud: ${fecha(p.fechaSolicitud)}`, xDer, yTop + 34, der);
        const estado = (ETIQUETAS_ESTADO[p.estado] || p.estado || "").toUpperCase();
        doc.font("Helvetica-Bold").fontSize(7);
        const anchoEstado = doc.widthOfString(estado) + 16;
        doc.roundedRect(X + ANCHO - anchoEstado, yTop + 46, anchoEstado, 13, 6.5).fillAndStroke("#f1f5f9", "#cbd5e1");
        doc.fillColor(TINTA).text(estado, X + ANCHO - anchoEstado, yTop + 49.5, { width: anchoEstado, align: "center" });

        const yLinea = yTop + 66;
        doc.moveTo(X, yLinea).lineTo(X + ANCHO, yLinea).lineWidth(2.5).strokeColor(AZUL).stroke();
        doc.y = yLinea + 2;

        // --- Información general ----------------------------------------------
        const tipo = tipoDePeticion(p);
        const esCliente = !p.tipoCliente || p.tipoCliente === "CLIENTE";
        titulo("Información general");
        const general = [["Área", p.areaNombre], ["Solicitante", p.solicitanteNombre]];
        if (p.tipoCliente !== "GASTO_OPERATIVO") general.push(["Orden ELM", p.ordenELM]);
        general.push(["Tipo", tipoCliente(p)]);
        if (esCliente) general.push(["Cliente", p.cliente, 2], ["Licitación / OC / Proyecto", licitacionOCProyecto(p), 2]);
        campos(general);

        // --- Proveedor y pago -------------------------------------------------
        titulo("Proveedor y pago");
        const proveedor = [["Proveedor", p.proveedorNombre, 2], ["Código SAP", p.codigoSAP], ["Origen", ETIQUETA_ORIGEN[tipo]], ["Término de pago", p.terminoPagoNombre]];
        if (p.planId) proveedor.push(["Plan / cuota", `${p.planNumero || ""} · ${p.cuotaNombre || ""} (${p.cuotaNumero} de ${p.cuotasTotal})`]);
        proveedor.push(["Moneda", p.moneda], ["Autoriza", p.autorizadorNombre]);
        campos(proveedor);

        // --- Concepto + datos bancarios (izquierda) y cálculo (derecha) --------
        const anchoIzq = ANCHO * 0.56;
        const xDerCol = X + anchoIzq + 16;
        const anchoDerCol = ANCHO - anchoIzq - 16;
        espacio(150);
        const yColumnas = doc.y;

        // Columna derecha primero (para saber su alto)
        doc.y = yColumnas;
        doc.moveDown(0.6);
        doc.font("Helvetica-Bold").fontSize(8).fillColor(AZUL).text("CÁLCULO DEL PAGO", xDerCol, doc.y, { characterSpacing: 0.6 });
        let y = doc.y + 2;
        doc.moveTo(xDerCol, y).lineTo(xDerCol + anchoDerCol, y).lineWidth(0.6).strokeColor(LINEA).stroke();
        doc.y = y + 5;
        tabla(null, [...filasCalculo(p, tipo), ["Pago efectivo al proveedor", monto(montoFinal(p), p.moneda)]], [1.4, 1], {
            x0: xDerCol,
            ancho: anchoDerCol,
            resaltarUltima: true,
            alinearDerecha: [1]
        });
        if (tipo === ORIGENES.LOCAL && p.calculo) {
            doc.font("Helvetica").fontSize(6.5).fillColor(GRIS).text(
                `${ETIQUETA_CLASIFICACION[p.clasificacionContribuyente] || "Clasificación no definida"} · Documento: ${ETIQUETA_DOCUMENTO[p.documentoFiscal] || "—"}`,
                xDerCol, doc.y + 3, { width: anchoDerCol }
            );
        }
        const yFinDerecha = doc.y;

        // Columna izquierda
        doc.y = yColumnas;
        doc.moveDown(0.6);
        doc.font("Helvetica-Bold").fontSize(8).fillColor(AZUL).text("CONCEPTO DE LA COMPRA", X, doc.y, { characterSpacing: 0.6 });
        y = doc.y + 2;
        doc.moveTo(X, y).lineTo(X + anchoIzq, y).lineWidth(0.6).strokeColor(LINEA).stroke();
        doc.font("Helvetica").fontSize(8.5).fillColor(TINTA).text(texto(p.conceptoCompra), X, y + 5, { width: anchoIzq, lineGap: 1.5 });

        doc.moveDown(0.6);
        doc.font("Helvetica-Bold").fontSize(8).fillColor(AZUL).text(`DATOS BANCARIOS DEL PAGO${p.pagarCuentaDiferente ? " (CUENTA DIFERENTE)" : ""}`, X, doc.y, { characterSpacing: 0.6 });
        y = doc.y + 2;
        doc.moveTo(X, y).lineTo(X + anchoIzq, y).lineWidth(0.6).strokeColor(LINEA).stroke();
        doc.y = y + 5;
        const filas = filasCuenta(p.cuentaBancaria, tipo);
        if (filas.length) {
            const grupos = [...new Set(filas.map((f) => f[0]))];
            for (const g of grupos) {
                if (grupos.length > 1) doc.font("Helvetica-Bold").fontSize(7).fillColor("#475569").text(g, X, doc.y);
                campos(filas.filter((f) => f[0] === g).map((f) => [f[1], f[2]]), 3, X, anchoIzq);
            }
        } else {
            doc.font("Helvetica").fontSize(8.5).fillColor(TINTA).text(p.nuevaCuentaBancaria || "Sin cuenta seleccionada.", X, doc.y, { width: anchoIzq });
        }
        doc.y = Math.max(doc.y, yFinDerecha);
        doc.x = X;

        // --- Registro de pago --------------------------------------------------
        const adjuntos = p.adjuntos || [];
        if (p.pago) {
            const comprobante = adjuntos.find((a) => a.id === p.pago.comprobanteId) || adjuntos.find((a) => a.categoria === "COMPROBANTE");
            titulo("Registro de pago");
            campos([
                ["Fecha de pago", fecha(p.pago.fechaPago)],
                ["Referencia", p.pago.referencia],
                ["Registrado por", p.pago.registradoPorNombre],
                ["Comprobante", comprobante?.nombre]
            ]);
        }

        // --- Documentos adjuntos ------------------------------------------------
        titulo("Documentos adjuntos");
        if (adjuntos.length) {
            tabla(
                ["#", "Documento", "Tipo", "Cargado por", "Fecha"],
                adjuntos.map((a, i) => [
                    String(i + 1),
                    a.nombre || "—",
                    a.categoria === "COMPROBANTE" ? "Comprobante de pago" : "Soporte",
                    a.subidoPorNombre || "—",
                    fecha(a.fecha)
                ]),
                [0.35, 4, 1.7, 1.7, 1.2]
            );
        } else {
            doc.font("Helvetica").fontSize(8.5).fillColor(GRIS).text("Sin documentos adjuntos.", X, doc.y);
        }

        if (p.observaciones) {
            titulo("Observaciones");
            doc.font("Helvetica").fontSize(8.5).fillColor(TINTA).text(p.observaciones, X, doc.y, { width: ANCHO });
        }

        // --- Aprobaciones -------------------------------------------------------
        espacio(110);
        titulo("Aprobaciones");
        const firmas = [
            ["Solicitante", ultimo(p.historial, ["ENVIADA", "REENVIADA"]), p.solicitanteNombre, "Enviada"],
            ["Autorizador", ultimo(p.historial, ["APROBADA_AUTORIZADOR"]), p.autorizadorNombre, "Autorizada"],
            ["Contabilidad", ultimo(p.historial, ["APROBADA_CONTABILIDAD"]), "", "Aprobada"]
        ];
        const anchoFirma = (ANCHO - 2 * 24) / 3;
        const yFirma = doc.y + 34;
        firmas.forEach(([rol, registro, nombre, verbo], i) => {
            const x = X + i * (anchoFirma + 24);
            doc.moveTo(x, yFirma).lineTo(x + anchoFirma, yFirma).lineWidth(0.8).strokeColor(TINTA).stroke();
            doc.font("Helvetica-Bold").fontSize(8.5).fillColor(TINTA).text(registro?.usuarioNombre || nombre || " ", x, yFirma + 4, { width: anchoFirma, align: "center" });
            doc.font("Helvetica").fontSize(7).fillColor(GRIS).text(rol, x, doc.y + 1, { width: anchoFirma, align: "center" });
            doc.fontSize(6.8).fillColor(registro ? "#047857" : "#94a3b8").text(registro ? `${verbo} ${fechaHora(registro.fecha)}` : "Pendiente", x, doc.y + 1, { width: anchoFirma, align: "center" });
        });
        doc.y = yFirma + 40;

        // --- Pie ------------------------------------------------------------------
        espacio(20);
        const yPie = doc.y + 6;
        doc.moveTo(X, yPie).lineTo(X + ANCHO, yPie).lineWidth(0.5).strokeColor(LINEA).stroke();
        doc.font("Helvetica").fontSize(6.5).fillColor(GRIS)
            .text(`Generado por ASSET PRO PAY el ${fechaHora(new Date().toISOString())}${generadoPor ? ` · ${generadoPor}` : ""}`, X, yPie + 4, { width: ANCHO / 2 })
            .text(p.numero || "", X + ANCHO / 2, yPie + 4, { width: ANCHO / 2, align: "right" });

        doc.end();
    });
