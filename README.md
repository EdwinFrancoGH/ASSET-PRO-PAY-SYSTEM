# ASSET PRO PAY

Sistema web para gestionar peticiones de pago y procesos relacionados de caja chica, anticipos, facturas y planes de pago.

## Módulos

- **Peticiones de pago:** captura, autorización, revisión de Contabilidad, registro del pago y comprobantes. Incluye datos bancarios, cálculo de impuestos y exportación a Excel.
- **Planes de pago:** definición de cuotas y seguimiento de solicitudes asociadas al plan.
- **Expedientes:** seguimiento de anticipos, compensaciones con facturas, saldos y descarga del expediente.
- **Facturas y recepciones:** registro, entrega, recepción o devolución de facturas.
- **Caja chica:** solicitudes, aprobaciones, entrega de efectivo con token, liquidaciones, fondo, cuadre y cortes.
- **Administración:** usuarios, roles, áreas, proveedores, cuentas bancarias y otros catálogos.

## Arquitectura

```text
backend/    Express, Firebase Admin y Firestore
  scripts/  inicialización del primer administrador
  src/      configuración, rutas, controladores, servicios y validaciones
  uploads/  archivos adjuntos guardados en disco
frontend/   Next.js App Router, React y Tailwind CSS
  src/app/  pantallas de autenticación y módulos de la aplicación
  src/      componentes, contexto, servicios HTTP y utilidades
```

El backend verifica los tokens de Firebase Authentication y aplica los permisos por rol. Los roles incluyen Administrador, Empleado, Autorizador, Contabilidad, Cajero y Solicitante de caja chica.

## Requisitos

- Node.js y npm.
- Un proyecto de Firebase con Authentication (correo y contraseña) y Firestore.
- Una cuenta de servicio de Firebase para el backend.

## Configuración

### Firebase

1. Crea un proyecto en [Firebase Console](https://console.firebase.google.com/) y habilita **Authentication → Correo electrónico/contraseña**.
2. Crea Firestore. El navegador no accede directamente a Firestore; las operaciones pasan por el backend.
3. Descarga la clave de cuenta de servicio y guárdala en `backend/credentials/firebase-key.json`. **No subas esa clave al repositorio.** La ruta queda excluida por `.gitignore`.
4. Registra una aplicación web de Firebase y copia sus valores en `frontend/.env.local` según `frontend/.env.local.example`.

### Backend

```bash
cd backend
npm install
```

Copia `.env.example` como `.env` y configura al menos `FRONTEND_URL`. Para iniciar la base de usuarios y catálogos iniciales, ejecuta:

```bash
npm run seed -- admin@tuempresa.com "UnaContraseñaSegura" "Nombre Apellido"
npm run dev
```

El servidor inicia en `http://localhost:5000` por defecto. Las variables SMTP son opcionales; sin ellas se omiten los avisos por correo.

### Frontend

```bash
cd frontend
npm install
```

Copia `.env.local.example` como `.env.local`, completa los valores de Firebase y la URL del backend, y ejecuta:

```bash
npm run dev
```

La aplicación inicia en `http://localhost:3000` por defecto.

## Roles

| Rol | Acceso principal |
|---|---|
| Administrador | Usuarios, catálogos y consulta general |
| Empleado | Crear y dar seguimiento a sus peticiones y solicitudes permitidas |
| Autorizador | Revisar las peticiones que tiene asignadas |
| Contabilidad | Revisar pagos, registrar pagos y operar procesos contables |
| Cajero | Entregar efectivo de caja chica mediante token |
| Solicitante caja chica | Solicitar y liquidar efectivo de caja chica |

Los permisos concretos se validan en el backend; la visibilidad del menú del frontend no sustituye esa validación.

## API

Las rutas de la API usan el prefijo `/api` y requieren un token de Firebase, salvo la ruta raíz de estado del servidor.

| Prefijo | Módulo |
|---|---|
| `/api/auth` | Sesión y perfil autenticado |
| `/api/users` | Usuarios y autorizadores |
| `/api/catalogos` | Áreas, proveedores, cuentas y términos de pago |
| `/api/peticiones` | Peticiones de pago, aprobaciones, adjuntos y exportación |
| `/api/planes` | Planes de pago y cuotas |
| `/api/expedientes` | Expedientes y compensaciones |
| `/api/facturas` | Entrega, recepción y devolución de facturas |
| `/api/caja-chica` | Solicitudes, entregas, liquidaciones, fondos y cortes |
| `/api/notificaciones` | Notificaciones del usuario |

Las rutas y validaciones completas están en `backend/src/routes/` y `backend/src/validators/`.

## Archivos y producción

- Los adjuntos se guardan en `backend/uploads/` (o en la ruta indicada por `UPLOADS_DIR`). En producción, usa almacenamiento persistente y respalda estos archivos junto con Firestore.
- Configura `FRONTEND_URL` con el origen real del frontend para CORS y enlaces de correo.
- Mantén fuera de Git `.env`, `.env.local`, `backend/credentials/` y los directorios `node_modules/`.
- El registro automático está deshabilitado; crea el primer administrador con el script `seed` y administra los demás usuarios desde la aplicación.

## Documentación de proceso

`A3_ASSET_PRO_PAY.md` describe el proceso de peticiones de pago, los controles implementados y una propuesta de medición. Los resultados y metas allí descritos deben validarse con datos de operación.
