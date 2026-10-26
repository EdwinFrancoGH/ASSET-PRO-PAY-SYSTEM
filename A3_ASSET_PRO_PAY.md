# A3 | Control y trazabilidad de las peticiones de pago

**Proyecto:** ASSET PRO PAY · **Proceso:** solicitud, autorización, revisión contable y registro del pago · **Fecha:** 30 septiembre 2026  
**Tipo de análisis:** ingeniería inversa del software y documentación disponible. Los problemas operativos son hipótesis inferidas; el repositorio no contiene mediciones del proceso anterior ni resultados de operación.

## 1. Contexto y problema

El proceso de pago requiere que solicitantes, autorizadores y Contabilidad intercambien información y evidencia. Cuando los datos, aprobaciones, observaciones y comprobantes no se gestionan en un expediente común, se dificulta conocer quién debe actuar, qué falta, cuál es la versión válida y si el pago quedó respaldado. La solución implementa un flujo digital para reducir esos puntos de fricción y controlar el recorrido desde el borrador hasta el pago.

**Brecha a validar:** no se dispone de línea base para cuantificar tiempos de ciclo, errores, devoluciones, pagos sin soporte o carga administrativa. Por tanto, este A3 documenta la lógica de control incorporada y propone cómo verificar su impacto; no declara ahorros ni mejoras ya demostradas.

## 2. Estado actual reconstruido

**Antes (hipótesis del problema):** solicitud por canales dispersos → datos incompletos o capturados de nuevo → seguimiento manual de aprobaciones → cambios y rechazos difíciles de rastrear → pago y comprobante con vínculo débil a la solicitud.

**Con ASSET PRO PAY (flujo implementado):**

`Borrador → Enviada → En revisión → Aprobada por autorizador → Aprobada por Contabilidad → Pagada`

En cualquier etapa de aprobación puede rechazarse con motivo, volver al solicitante, corregirse y reenviarse. La solicitud mantiene identificador correlativo, historial con usuario/fecha/acción/comentario, adjuntos de soporte y datos del pago.

## 3. Análisis de causas (inferidas, a comprobar)

| Causa probable | Riesgo en el proceso | Control implementado |
|---|---|---|
| Captura libre y datos repetidos | Errores, omisiones y correcciones tardías | Formulario estructurado, campos requeridos al enviar, catálogos de áreas/proveedores/términos/cuentas |
| Aprobaciones sin ruta y responsable visibles | Demora, extravío o aprobación por persona incorrecta | Asignación de autorizador; roles; bandejas de pendientes; dos etapas de revisión |
| Falta de segregación de funciones | Autorización propia o acciones fuera de rol | Bloqueo de autoautorización y permisos validados en servidor |
| Inconsistencia de cálculo fiscal/bancario | Pago calculado o instruido incorrectamente | Cálculos de IVA/retenciones en backend; validación de cuentas locales/exteriores y permisos |
| Evidencia distribuida o no asociada | Auditoría lenta y dificultad para confirmar pago | Historial inmutable por transición, adjuntos, fecha/referencia y comprobante obligatorio al registrar pago |
| Poco seguimiento y baja visibilidad | Consultas manuales y reportes armados aparte | Notificaciones, estados, filtros y exportación Excel con filtros aplicados |

## 4. Estado objetivo

Cada petición debe tener un expediente identificable, completo y consultable; cada decisión debe corresponder al rol responsable y dejar evidencia; cada pago registrado debe vincularse a su fecha, referencia y comprobante. La información debe permitir priorizar pendientes y medir el tiempo desde envío hasta pago.

## 5. Contramedidas desplegadas en el producto

1. **Estandarizar la entrada:** campos y catálogos; validación de requisitos antes de enviar; correlativo `PP-AAAA-00001`.
2. **Controlar el flujo:** estados explícitos, autorizador asignado, aprobaciones separadas de autorizador y Contabilidad; rechazo con motivo y reenvío tras corrección.
3. **Prevenir errores de autorización:** permisos por rol comprobados en backend, prohibición de autoautorización y restricción de cambios a borradores/rechazadas por su solicitante.
4. **Asegurar datos críticos:** servidor deriva datos bancarios desde catálogo, verifica elegibilidad local/exterior y calcula impuestos/retenciones.
5. **Conservar evidencia y facilitar seguimiento:** historial, adjuntos, notificaciones en app/correo, fecha/referencia/comprobante del pago, filtros y exportación Excel.

## 6. Plan de medición y responsables

Antes de atribuir beneficios, capturar una línea base del proceso anterior y luego medir ASSET PRO PAY durante un periodo comparable (propuesta: 8–12 semanas, ajustada al volumen). Segmentar por área, monto, proveedor y tipo local/exterior.

| Indicador | Definición | Fuente / responsable |
|---|---|---|
| Tiempo de ciclo | Mediana y P90 entre envío y registro de pago | Historial de estados; Contabilidad |
| Tiempo por etapa | Mediana/P90 entre entrada y salida de cada estado | Historial; dueño de cada etapa |
| Devolución por incompletitud | Solicitudes rechazadas para corregir por datos/documentos faltantes ÷ solicitudes enviadas | Motivos de rechazo; solicitante y Contabilidad |
| Retrabajo | Promedio de reenvíos por petición y proporción con al menos un rechazo | Historial; dueño del proceso |
| Pagos con soporte | Pagos registrados con comprobante accesible ÷ pagos registrados | Registro de pago/adjuntos; Contabilidad |
| Cumplimiento de segregación | Intentos de autoaprobación o acciones denegadas y revisadas | Logs de aplicación; Administrador |
| Esfuerzo administrativo | Minutos de seguimiento/captura/exportación por solicitud | Muestreo de usuarios; dueño del proceso |

**Metas iniciales (propuestas para acordar tras la línea base):** bajar el tiempo mediano de ciclo y el retrabajo; elevar a 100% los pagos registrados con comprobante accesible; lograr que toda solicitud tenga trazabilidad de estado y responsable. No fijar porcentajes de reducción hasta validar volumen, línea base y calidad de los datos.

## 7. Riesgos y asuntos abiertos

- La fase documentada automatiza el registro manual del comprobante; la lectura automática del correo bancario aparece como **fase 2 pendiente**, no como capacidad entregada.
- El historial funcional respalda transiciones, pero el repositorio no acredita un registro de auditoría de accesos/cambios administrativos ni tiempos SLA.
- Los archivos se guardan en disco local: respaldar `backend/uploads/` y usar almacenamiento persistente en producción.
- La documentación no aporta datos del estado anterior, adopción, volumen real, incidentes ni evidencia de ahorros. Los beneficios son esperados hasta medirlos.

## 8. PDCA de sostenimiento

**Plan:** levantar línea base, validar causas con usuarios y acordar definiciones/metas para los indicadores.  
**Do:** operar el flujo, capacitar por rol y registrar motivos de devolución de forma consistente.  
**Check:** revisar mensualmente tiempos, retrabajo, soporte documental, pendientes y excepciones por área/etapa.  
**Act:** eliminar causas recurrentes (campos, catálogos, reglas, avisos o acuerdos de servicio), actualizar el estándar y repetir el ciclo.

**Conclusión:** se recomienda presentar un **A3** porque el proyecto ya aborda un problema transversal de proceso y establece contramedidas de punta a punta. El PDCA queda como mecanismo de validación y mejora continua: el siguiente paso es medir si los controles reducen efectivamente tiempo, errores y esfuerzo.
