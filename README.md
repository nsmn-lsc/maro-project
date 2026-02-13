# MARO Hub

**Sistema de Modelo de Atención y Respuesta Obstétrica**

Aplicación web para la gestión de casos obstétricos de alto riesgo en el sistema de salud. Facilita la detección temprana, colegiación médica y seguimiento de casos entre diferentes niveles de atención.

## 🚀 Inicio Rápido

### Prerequisitos
- Node.js 18+ y npm
- MySQL 8.0+

### Instalación

1. **Clonar el repositorio** (si aplica)
   ```bash
   git clone [url-del-repo]
   cd maro-hub
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar Base de Datos**
   
   Ver instrucciones detalladas en [DATABASE_SETUP.md](DATABASE_SETUP.md)
   
   Resumen rápido:
   ```bash
   # Crear la base de datos
   mysql -u root -p < database/schema.sql
   
   # Copiar archivo de configuración
   cp .env.example .env.local
   
   # Editar .env.local con tus credenciales de MySQL
   ```

4. **Ejecutar servidor de desarrollo**
   ```bash
   npm run dev
   ```

5. **Abrir en navegador**
   
   Visita [http://localhost:3000](http://localhost:3000)

## 📋 Características

### 🆕 Contador de Factor de Riesgo Obstétrico (Recién Implementado!)
Sistema en tiempo real que evalúa y muestra el factor de riesgo durante la captura de datos:
- Actualización automática conforme se llenan los campos
- Tres niveles de riesgo (BAJO/MODERADO/ALTO) con códigos de color
- Detalle de factores individuales que contribuyen al riesgo
- Recomendaciones según nivel de riesgo

**Ver en acción:**
- Página: [`/pacientes/nuevo`](http://localhost:3000/pacientes/nuevo)
- Documentación: [RESUMEN_30_SEGUNDOS.md](RESUMEN_30_SEGUNDOS.md)

### Core Features

- ✅ **Evaluación automatizada de riesgo** obstétrico (AMARILLO/NARANJA/ROJO)
- ✅ **Validación de congruencia clínica** con detección de estudios faltantes
- ✅ **Bitácora legal** completa de decisiones y actores
- ✅ **Sistema de colegiación** entre diferentes niveles de atención
- ✅ **Referencias científicas** (ACOG, OMS, FIGO) integradas
- ✅ **Persistencia en MySQL** para almacenamiento permanente
- ✅ **API RESTful** para integración con otros sistemas

## 🏗️ Arquitectura

**Stack Tecnológico:**
- Frontend: Next.js 16 (App Router), React 19, TypeScript
- Estilos: Tailwind CSS 4
- Base de Datos: MySQL 8.0
- API: Next.js API Routes

**Estructura:**
```
src/
├── app/              # Páginas y rutas
│   ├── api/          # API endpoints
│   ├── solicitud/    # Acceso al sistema
│   ├── evaluacion-clinica/  # Evaluación detallada
│   └── coordinacion/ # Panel de coordinación
├── lib/              # Lógica de negocio
│   ├── db.ts         # Conexión MySQL
│   ├── api-client.ts # Cliente API
│   ├── maroEngine.ts # Motor de riesgo MARO
│   └── riesgoObstetrico.ts # Evaluación clínica
database/
└── schema.sql        # Esquema de base de datos
```

## 📊 Base de Datos

El sistema utiliza MySQL con las siguientes tablas principales:

- `sesiones` - Datos de acceso al sistema
- `casos` - Casos obstétricos
- `evaluaciones_clinicas` - Evaluación clínica detallada
- `bitacora` - Auditoría de eventos
- `diagnosticos`, `estudios`, `recomendaciones` - Datos relacionados

Ver detalles completos en [DATABASE_SETUP.md](DATABASE_SETUP.md)

## 🔌 API Endpoints

### Sesiones
- `POST /api/sesiones` - Crear nueva sesión
- `GET /api/sesiones?id=X` - Obtener sesión

### Casos
- `POST /api/casos` - Crear caso
- `GET /api/casos?id=X` - Obtener caso
- `PUT /api/casos` - Actualizar caso

### Evaluaciones
- `POST /api/evaluaciones` - Crear evaluación clínica
- `GET /api/evaluaciones?casoId=X` - Obtener evaluación

## 🛠️ Desarrollo

```bash
# Modo desarrollo
npm run dev

# Build para producción
npm run build

# Iniciar en producción
npm start

# Linting
npm run lint
```

## 📝 Configuración

Crea un archivo `.env.local` con:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=maro_hub
```

## 🔒 Seguridad

- Nunca subir `.env.local` al repositorio
- Usar contraseñas seguras para MySQL
- Implementar autenticación antes de producción

## 📖 Más Información

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
