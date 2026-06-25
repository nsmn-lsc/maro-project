# Resumen de Cambios - Sesión 

Este documento resume las modificaciones y nuevas funcionalidades desarrolladas durante la sesión, para proveer contexto en el futuro.

## 1. Modificación de Opciones Clínicas
- **Hemorragias:** Se agregó la opción `"Sin hemorragia"` al campo desplegable en el registro de consultas (`src/app/pacientes/[id]/consultas/page.tsx`).
- **Migración de Base de Datos:** Se actualizaron `schema.sql` y `schema_completo.sql` para aceptar `"sin hemorragia"` en el campo `ENUM`. Se generó el archivo de migración seguro `database/migrations/20260621_add_sin_hemorragia_enum.sql` para los servidores de producción.
- **Fondo Uterino:** Se cambió la etiqueta del formulario de *"Fondo uterino acorde a SDG"* a *"Fondo uterino no acorde a SDG"*. Se ajustó la lógica para que, al marcar esta casilla, se sumen automáticamente **+4 puntos** al riesgo de la consulta y aparezca la justificación dinámica en las tarjetas de hallazgos.

## 2. Correcciones de Seguridad y Privacidad (PII)
- Se detectó e interceptó un riesgo de seguridad de fuga de información. Se eliminaron los `console.log` en el frontend (`consultas/page.tsx`) que estaban imprimiendo la estructura de datos en crudo (incluyendo nombres y teléfonos de pacientes) directamente en la consola del navegador.

## 3. Preparación para Pruebas en Producción
- **Script de Reseteo:** Se creó un script de limpieza profunda (`scripts/reset-db-data.ts`) diseñado para borrar todos los datos operacionales de prueba (casos, consultas, bitácoras) sin eliminar los catálogos primordiales del sistema (`usuarios`, `cat_unidades`).
- Se agregó el comando `npm run db:reset` a `package.json` para ejecutar este script de forma sencilla.
- **Protocolo de Lanzamiento:** Se estableció la secuencia oficial para pasar a producción limpiando la base de datos y regenerando nuevas contraseñas de un solo uso para todos los usuarios:
  1. `mysql -u root -p maro_hub < database/migrations/20260621_add_sin_hemorragia_enum.sql`
  2. `npm run db:reset`
  3. `npm run db:seed-unidades-usuarios`

## 4. Nuevo Módulo de Gestión de Accesos (Recuperación de Contraseñas)
- Ante la ausencia de correos electrónicos, se decidió construir una delegación de recuperación de contraseñas de "Arriba hacia Abajo".
- **Backend (`src/app/api/gestion-accesos/route.ts`):** Nueva API protegida por JWT exclusiva para perfiles `ESTADO` y `ADMIN`. Permite generar, encriptar y forzar una nueva contraseña temporal (`must_change_password = 1`) para usuarios bloqueados de nivel Unidad o Región.
- **Frontend (`src/app/gestion-accesos/page.tsx`):** Nueva vista dedicada de panel de control con un buscador interactivo para hallar rápidamente a cualquier usuario/clínica, visualizar su último acceso y emitir contraseñas de recuperación.
- Se agregó un botón de acceso directo a este módulo en la cabecera principal del dashboard Estatal (`src/app/estatal/page.tsx`).
