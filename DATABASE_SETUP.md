# Configuración de Base de Datos MySQL para MARO Hub

## Prerequisitos
- MySQL 8.0 o superior instalado y corriendo
- Node.js y npm ya instalados

## Pasos de Configuración

### 1. Crear la Base de Datos

Ejecuta el script SQL para crear las tablas:

```bash
mysql -u root -p < database/schema.sql
```

O accede a MySQL y ejecuta el script:

```bash
mysql -u root -p
```

Luego ejecuta:
```sql
source /ruta/completa/a/database/schema.sql
```

### 2. Configurar Variables de Entorno

El archivo `.env.local` ya fue creado con valores por defecto. **Actualiza estos valores** según tu configuración:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=tu_password_aqui
DB_NAME=maro_hub
```

**Importante:** Si estás usando un usuario diferente o una contraseña, actualiza estos valores.

### 3. Verificar la Conexión

Puedes verificar que la base de datos esté funcionando correctamente:

```bash
mysql -u root -p -e "USE maro_hub; SHOW TABLES;"
```

Deberías ver las siguientes tablas:
- bitacora
- casos
- diagnosticos
- estudios
- evaluaciones_clinicas
- recomendaciones
- sesiones

### 4. Reiniciar el Servidor de Desarrollo

Si el servidor ya está corriendo, reinícialo para cargar las nuevas variables de entorno:

```bash
# Detener el servidor actual (Ctrl+C)
npm run dev
```

## Estructura de la Base de Datos

### Tabla: `sesiones`
Almacena los datos de acceso (región, municipio, unidad).

### Tabla: `casos`
Almacena los casos obstétricos con su información básica y estado.

### Tabla: `evaluaciones_clinicas`
Almacena la evaluación clínica detallada de cada caso.

### Tabla: `bitacora`
Registro de auditoría de todas las acciones realizadas en cada caso.

### Tablas adicionales:
- `diagnosticos`: Diagnósticos asociados a cada caso
- `estudios`: Estudios realizados
- `recomendaciones`: Recomendaciones de expertos

## API Endpoints Disponibles

### Sesiones
- `POST /api/sesiones` - Crear nueva sesión
- `GET /api/sesiones?id=X` - Obtener sesión por ID
- `GET /api/sesiones` - Listar todas las sesiones

### Casos
- `POST /api/casos` - Crear nuevo caso
- `GET /api/casos?id=X` - Obtener caso por ID
- `GET /api/casos?folio=XXX` - Obtener caso por folio
- `GET /api/casos` - Listar todos los casos
- `PUT /api/casos` - Actualizar caso existente

### Evaluaciones Clínicas
- `POST /api/evaluaciones` - Crear evaluación clínica
- `GET /api/evaluaciones?casoId=X` - Obtener evaluación de un caso

## Flujo de Datos

1. **Solicitud (Login):** Usuario selecciona región/municipio/unidad → Guardar en `sesiones`
2. **Evaluación Clínica:** Captura datos del paciente → Crear registro en `casos`
3. **Evaluación Detallada:** Captura datos clínicos → Guardar en `evaluaciones_clinicas`
4. **Seguimiento:** Todas las acciones se registran en `bitacora`

## Troubleshooting

### Error: "Cannot connect to database"
- Verifica que MySQL esté corriendo: `sudo systemctl status mysql`
- Verifica credenciales en `.env.local`
- Verifica que la base de datos `maro_hub` exista

### Error: "Table doesn't exist"
- Ejecuta el script `database/schema.sql` nuevamente

### Error: "Access denied"
- Verifica usuario y contraseña en `.env.local`
- Verifica permisos del usuario MySQL:
  ```sql
  GRANT ALL PRIVILEGES ON maro_hub.* TO 'tu_usuario'@'localhost';
  FLUSH PRIVILEGES;
  ```

## Migración desde localStorage

Si ya tienes datos en localStorage, puedes:
1. Exportarlos desde la consola del navegador
2. Crear un script de migración para importarlos a MySQL
3. Los nuevos datos se guardarán automáticamente en MySQL

## Seguridad

⚠️ **Importante:**
- Nunca subas el archivo `.env.local` al repositorio
- Usa contraseñas seguras para MySQL
- En producción, considera usar variables de entorno del servidor
- Implementa autenticación de usuarios antes de desplegar
