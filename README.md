# ASSET PRO — Peticiones de Pago

Sistema web para crear, autorizar, aprobar y pagar peticiones de pago.
Tiene la misma arquitectura que VetCare:

```
asset-pro/
├── backend/    Express + Firebase Admin (Firestore)
│   ├── credentials/firebase-key.json   ← tu credencial (no se sube a git)
│   ├── uploads/                        ← proformas y comprobantes
│   ├── scripts/seed.js                 ← crea el primer Administrador
│   └── src/
│       ├── app.js, server.js
│       ├── config/        firebase, roles, estados del flujo
│       ├── middlewares/   verifyToken / verifyRoles, subida de archivos
│       ├── routes/ controllers/ services/ validators/
│       └── utils/         mailer (avisos por correo), errores
└── frontend/   Next.js 14 (App Router) + Tailwind 4
    └── src/
        ├── app/(auth)/    login, recuperar contraseña
        ├── app/(app)/     dashboard, peticiones, bandeja, notificaciones,
        │                  catálogos, usuarios, perfil
        ├── components/    layout, auth, ui, peticiones
        ├── context/AuthContext.jsx
        ├── services/      axios con el token de Firebase
        └── utils/
```

## Flujo

```
Borrador → Enviada → En revisión → Aprobada por autorizador → Aprobada por contabilidad → Pagada
                                 ↘ Rechazada por autorizador   ↘ Rechazada por contabilidad
                                   (vuelve al solicitante, que corrige y reenvía)
```

| Paso | Quién | Qué pasa | Aviso (app + correo) |
|---|---|---|---|
| Crear / guardar borrador | Cualquier usuario | Se genera el número `PP-AAAA-00001` | — |
| Enviar | Solicitante | Se validan los campos obligatorios | Al autorizador elegido en "Autoriza" |
| En revisión | Automático | Cuando el autorizador abre la petición | Al solicitante (solo en la app) |
| Aprobar / rechazar | Autorizador asignado | El rechazo exige motivo | Solicitante; al aprobar, también todo Contabilidad |
| Aprobar / rechazar | Contabilidad | El rechazo exige motivo | Solicitante (y autorizador si se rechaza) |
| Registrar pago | Contabilidad | Fecha, referencia y comprobante (captura o PDF) obligatorio | Solicitante y autorizador |
| Descargar Excel | Contabilidad / Admin | Exporta lo que se ve en la lista con los filtros aplicados | — |

Reglas: nadie puede autorizar su propia petición; solo el solicitante edita, y
solo en borrador o rechazada; cada cambio de estado queda en el historial con
fecha, usuario y comentario.

### Roles

| Rol | Puede |
|---|---|
| Empleado | Crear peticiones y ver solo las suyas |
| Autorizador | Lo del empleado + autorizar/rechazar las que le asignan |
| Contabilidad | Ver todas (menos borradores ajenos), aprobar, registrar pagos, exportar a Excel, mantener catálogos |
| Administrador | Ver todas, gestionar usuarios y catálogos |

## Instalación

### 1. Firebase

1. Crea un proyecto en <https://console.firebase.google.com>.
2. **Authentication → Método de acceso →** habilita **Correo electrónico/contraseña**.
3. **Firestore Database →** crea la base de datos (modo producción).
4. **Reglas de Firestore:** el navegador nunca lee Firestore directamente (todo pasa por el backend), así que puedes cerrarla por completo:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} { allow read, write: if false; }
     }
   }
   ```
5. **Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada.** Guarda el archivo como `backend/credentials/firebase-key.json`.
6. **Configuración del proyecto → Tus apps → Web (</>)**: copia `apiKey`, `authDomain`, `projectId` y `appId` para el frontend.

No hace falta Firebase Storage ni el plan de pago: los adjuntos se guardan en `backend/uploads/`.

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env        # ajusta FRONTEND_URL y, si quieres correos, SMTP_*
npm run seed -- admin@tuempresa.com "UnaContraseñaSegura" "Nombre Apellido"
npm run dev                 # http://localhost:5000
```

El seed crea el primer Administrador y carga términos de pago iniciales (Contado, Anticipo, 15/30/45/60/90 días).

### 3. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # pega los datos web de Firebase
npm run dev                         # http://localhost:3000
```

### 4. Primeros pasos en la aplicación (como Administrador)

1. **Catálogos → Áreas**: registra las áreas de la empresa.
2. **Catálogos → Proveedores**: nombre, código SAP y cuentas bancarias (banco, número, tipo, titular, moneda, SWIFT).
3. **Catálogos → Términos de pago**: revisa o ajusta los del seed.
4. **Usuarios**: crea al menos un Autorizador y un usuario de Contabilidad, y luego a los empleados.

## Correo

Con `SMTP_HOST`, `SMTP_USER` y `SMTP_PASS` en `backend/.env` se envían avisos con un botón "Ver petición" que abre `FRONTEND_URL/peticiones/<id>`. Sin SMTP, las notificaciones dentro de la app (campana) funcionan igual y en la consola del servidor se indica que se omitió el correo.

Con Gmail: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587` y una **contraseña de aplicación** (requiere verificación en 2 pasos). Para volumen mayor conviene un proveedor transaccional (Brevo, SendGrid, Mailgun, Amazon SES).

## Fase 2 (pendiente): comprobantes que llegan por correo del banco

La fase 1 ya funciona: Contabilidad adjunta la captura/PDF al registrar el pago. Para automatizarlo:

1. Crear un buzón dedicado (ej. `comprobantes@tuempresa.com`) y configurar la banca en línea para que envíe ahí los comprobantes de transferencia.
2. **Pedir que en la referencia/descripción de cada transferencia se escriba el número de la petición** (`PP-2026-00012`). La pantalla de registro de pago ya se lo recuerda a Contabilidad.
3. Un proceso en el backend leerá ese buzón (IMAP o Gmail/Microsoft Graph API), buscará el número `PP-…` en el asunto, cuerpo o PDF, y llamará a `registrarPago(..., { origen: "CORREO" })` en `services/peticiones.service.js`. Los que no se puedan asociar quedarán en una bandeja "sin asignar" para que Contabilidad los vincule a mano.

Para diseñarlo hace falta saber qué banco(s) usan y un ejemplo real de correo de comprobante.

## Personalización rápida

- **Campos obligatorios para enviar:** `CAMPOS_OBLIGATORIOS` en `backend/src/validators/peticion.validator.js` y en `frontend/src/utils/peticion.js` (mantener iguales).
- **Cálculo del monto a pagar:** `Monto a pagar = Monto × % ÷ 100`. "Monto" toma por defecto el valor de "Monto compra" y se puede cambiar (no puede ser mayor). Está en `construirCampos()` del service y en `calcularMontoPagar()` del frontend.
- **Monedas:** `MONEDAS` en `backend/src/config/estados.js` y `frontend/src/utils/peticion.js`.
- **Columnas del Excel:** `COLUMNAS` en `backend/src/services/exportar.service.js`.
- **Tipos y tamaño de adjuntos:** `backend/src/middlewares/upload.middleware.js` y `MAX_FILE_MB` en `.env`.

## Producción

- Respalda `backend/uploads/` junto con Firestore: ahí están las proformas y comprobantes. Si el servidor no tiene disco persistente (algunos PaaS lo borran en cada despliegue), monta un volumen o cambia a Firebase Storage/S3; solo hay que modificar `upload.middleware.js` y las funciones de adjuntos del service.
- Define `FRONTEND_URL` con el dominio real (se usa para CORS y para los enlaces de los correos).
- Las consultas no requieren índices compuestos de Firestore: el ordenamiento se hace en el servidor. Si el volumen crece a miles de peticiones por año, conviene paginar en `listar()`.

## API (resumen)

Todas requieren `Authorization: Bearer <token de Firebase>` y responden `{ ok, message, data }`.

| Método | Ruta | Rol |
|---|---|---|
| GET | `/api/auth/me` | todos |
| GET/POST/PUT/DELETE | `/api/catalogos/:catalogo` (`areas`, `terminos-pago`, `proveedores`) | leer: todos; escribir: Admin, Contabilidad |
| GET | `/api/users/autorizadores` | todos |
| GET/POST/PUT/DELETE | `/api/users` | Admin |
| GET | `/api/peticiones` (filtros: `estado`, `desde`, `hasta`, `areaId`, `proveedorId`, `q`, `alcance=mias`) | según rol |
| GET | `/api/peticiones/pendientes` | todos |
| GET | `/api/peticiones/exportar` (mismos filtros) → .xlsx | Contabilidad, Admin |
| GET/POST/PUT/DELETE | `/api/peticiones/:id` | solicitante / según rol |
| POST | `/api/peticiones/:id/enviar` | solicitante |
| POST | `/api/peticiones/:id/autorizacion` `{ decision, comentario }` | Autorizador asignado |
| POST | `/api/peticiones/:id/contabilidad` `{ decision, comentario }` | Contabilidad |
| POST | `/api/peticiones/:id/pago` (multipart: `comprobante`, `fechaPago`, `referencia`) | Contabilidad |
| POST/GET/DELETE | `/api/peticiones/:id/adjuntos[/:adjuntoId]` | solicitante / quien puede ver |
| GET/PATCH | `/api/notificaciones`, `/:id/leida`, `/leer-todas` | todos |
