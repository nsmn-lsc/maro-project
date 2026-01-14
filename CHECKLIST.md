# ✅ Checklist de Implementación MySQL

## Pre-requisitos

- [ ] MySQL 8.0+ instalado
- [ ] Node.js 18+ instalado
- [ ] npm instalado
- [ ] Acceso a terminal/consola

## Configuración Inicial

### 1. Instalación de Dependencias
- [ ] Ejecutar `npm install` en el directorio del proyecto
- [ ] Verificar que `mysql2` aparezca en `package.json`

### 2. Configuración de MySQL

#### Instalación de MySQL (si no está instalado)
- [ ] **Fedora/RHEL**: `sudo dnf install mysql-server`
- [ ] **Ubuntu/Debian**: `sudo apt install mysql-server`
- [ ] Iniciar servicio: `sudo systemctl start mysqld` (o `mysql`)
- [ ] Habilitar en inicio: `sudo systemctl enable mysqld`

#### Configuración de Seguridad
- [ ] Ejecutar: `sudo mysql_secure_installation`
- [ ] Establecer contraseña root
- [ ] Remover usuarios anónimos
- [ ] Deshabilitar login remoto de root
- [ ] Remover base de datos de prueba

#### Crear Base de Datos
- [ ] Ejecutar: `mysql -u root -p < database/schema.sql`
- [ ] O manualmente:
  ```sql
  mysql -u root -p
  source /ruta/completa/a/database/schema.sql
  ```
- [ ] Verificar tablas: `USE maro_hub; SHOW TABLES;`

### 3. Configuración de Variables de Entorno

- [ ] Copiar archivo ejemplo: `cp .env.example .env.local`
- [ ] Editar `.env.local` con editor de texto
- [ ] Actualizar valores:
  ```env
  DB_HOST=localhost
  DB_PORT=3306
  DB_USER=root
  DB_PASSWORD=tu_password_real
  DB_NAME=maro_hub
  ```
- [ ] Guardar archivo
- [ ] Verificar que `.env.local` NO esté en git: `git status`

### 4. Verificación de Conexión

- [ ] Iniciar servidor: `npm run dev`
- [ ] Verificar en consola que no haya errores de conexión
- [ ] Abrir navegador en http://localhost:3000

### 5. Prueba de Funcionalidad

#### Probar Formulario de Solicitud
- [ ] Ir a http://localhost:3000
- [ ] Seleccionar Región
- [ ] Seleccionar Municipio
- [ ] Seleccionar Unidad
- [ ] Click en "Continuar a evaluación clínica"
- [ ] ¿Se guardó sin errores? (verificar en consola del servidor)

#### Verificar Datos en MySQL
- [ ] Abrir MySQL: `mysql -u root -p`
- [ ] Seleccionar BD: `USE maro_hub;`
- [ ] Ver sesiones: `SELECT * FROM sesiones ORDER BY created_at DESC LIMIT 5;`
- [ ] ¿Aparecen los datos? ✅

### 6. Configuración Adicional (Opcional)

#### Crear Usuario Específico para la App
- [ ] Ejecutar en MySQL:
  ```sql
  CREATE USER 'maro_app'@'localhost' IDENTIFIED BY 'password_seguro';
  GRANT SELECT, INSERT, UPDATE ON maro_hub.* TO 'maro_app'@'localhost';
  FLUSH PRIVILEGES;
  ```
- [ ] Actualizar `.env.local` con nuevo usuario
- [ ] Reiniciar servidor: `npm run dev`

#### Configurar Respaldos Automáticos
- [ ] Crear script de respaldo (ver DATABASE_SETUP.md)
- [ ] Programar en cron (Linux/Mac) o Task Scheduler (Windows)

## Problemas Comunes y Soluciones

### ❌ Error: "Cannot connect to database"

**Solución:**
- [ ] Verificar que MySQL esté corriendo: `sudo systemctl status mysqld`
- [ ] Iniciar si está detenido: `sudo systemctl start mysqld`
- [ ] Verificar credenciales en `.env.local`
- [ ] Verificar que puedes conectarte manualmente: `mysql -u root -p`

### ❌ Error: "Access denied for user"

**Solución:**
- [ ] Verificar usuario y contraseña en `.env.local`
- [ ] Resetear contraseña si es necesario
- [ ] Verificar permisos del usuario en MySQL

### ❌ Error: "Unknown database 'maro_hub'"

**Solución:**
- [ ] Ejecutar script de creación: `mysql -u root -p < database/schema.sql`
- [ ] Verificar que la BD exista: `mysql -u root -p -e "SHOW DATABASES;"`

### ❌ Error: "Table doesn't exist"

**Solución:**
- [ ] Ejecutar script completo nuevamente
- [ ] Verificar tablas: `USE maro_hub; SHOW TABLES;`

### ⚠️ Warning: "A tree hydrated but..."

**Solución:**
- [ ] Ya está solucionado en el código actual
- [ ] Si persiste, limpiar caché del navegador (Ctrl+Shift+R)

## Siguiente Fase: Integración Completa

### Páginas Pendientes de Actualizar

- [ ] `src/app/evaluacion-clinica/page.tsx`
  - [ ] Leer sesión actual de localStorage
  - [ ] Guardar caso completo en MySQL
  - [ ] Guardar evaluación clínica

- [ ] `src/app/coordinacion/page.tsx`
  - [ ] Cargar casos desde MySQL
  - [ ] Actualizar estados en MySQL
  - [ ] Registrar eventos en bitácora

- [ ] `src/app/expertos/page.tsx`
  - [ ] Similar a coordinación
  - [ ] Guardar recomendaciones

### Mejoras Adicionales

- [ ] Implementar paginación en listados
- [ ] Agregar búsqueda/filtros de casos
- [ ] Implementar autenticación de usuarios
- [ ] Agregar roles y permisos
- [ ] Crear dashboard con estadísticas
- [ ] Exportación de reportes
- [ ] Notificaciones en tiempo real

## Verificación Final

### Checklist de Producción

- [ ] MySQL configurado con usuario dedicado
- [ ] Contraseñas seguras
- [ ] Variables de entorno en servidor
- [ ] Respaldos automáticos configurados
- [ ] SSL/HTTPS habilitado
- [ ] Autenticación implementada
- [ ] Rate limiting configurado
- [ ] Logs de auditoría activos
- [ ] Monitoreo configurado
- [ ] Plan de recuperación ante desastres

## Recursos

- **Documentación completa**: `DATABASE_SETUP.md`
- **Implementación detallada**: `IMPLEMENTACION_MYSQL.md`
- **Queries útiles**: `database/queries.sql`
- **Script de migración**: `scripts/migrate-localStorage-to-mysql.ts`

## Soporte

Si tienes problemas:

1. Revisar logs del servidor (consola donde corre `npm run dev`)
2. Revisar logs de MySQL: `sudo tail -f /var/log/mysql/error.log`
3. Consultar documentación en los archivos MD
4. Verificar que todas las dependencias estén instaladas
5. Verificar permisos de archivos y conexiones

---

**Estado Actual**: ⏳ En configuración

**Última actualización**: 13 de enero de 2026
