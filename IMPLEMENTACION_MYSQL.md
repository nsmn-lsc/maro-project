# Implementación Completa de MySQL en MARO Hub

## ✅ Cambios Realizados

### 1. Dependencias Instaladas
- **mysql2**: Cliente MySQL para Node.js

### 2. Archivos Creados

#### Configuración
- `.env.local` - Variables de entorno para MySQL
- `.env.example` - Plantilla de configuración
- `src/lib/db.ts` - Pool de conexiones MySQL

#### Base de Datos
- `database/schema.sql` - Schema completo con 7 tablas

#### API
- `src/app/api/sesiones/route.ts` - CRUD de sesiones
- `src/app/api/casos/route.ts` - CRUD de casos
- `src/app/api/evaluaciones/route.ts` - CRUD de evaluaciones clínicas

#### Cliente
- `src/lib/api-client.ts` - Helper para llamadas API tipadas

#### Documentación
- `DATABASE_SETUP.md` - Guía completa de configuración
- `README.md` - Actualizado con info de BD

### 3. Archivos Modificados

#### `src/app/solicitud/page.tsx`
**Cambios:**
- Importa `sesionesAPI` y `manejarErrorAPI`
- Agrega estado `guardando` para UX del botón
- Agrega estado `clues` para capturar CLUES
- Implementa función `guardarSesion()` que:
  - Llama a la API para guardar en MySQL
  - Guarda datos en localStorage para página siguiente
  - Maneja errores con mensajes claros
- Botón ahora muestra spinner cuando está guardando
- Captura automáticamente el CLUES de la unidad seleccionada

## 📊 Estructura de Datos

### Flujo de Datos Actual:

```
1. Solicitud (página actual)
   ↓
   Guarda en: sesiones (MySQL)
   También: localStorage (para continuidad)
   ↓
   
2. Evaluación Clínica (siguiente paso)
   ↓
   Recupera: datos de localStorage
   Guarda en: casos + evaluaciones_clinicas (MySQL)
   ↓
   
3. Coordinación/Expertos
   ↓
   Actualiza: casos
   Registra: bitacora
```

### Tablas MySQL:

1. **sesiones**: Región, municipio, unidad, CLUES
2. **casos**: Folio, paciente, riesgo, estado
3. **evaluaciones_clinicas**: Datos clínicos completos
4. **bitacora**: Auditoría de eventos
5. **diagnosticos**: Lista de diagnósticos
6. **estudios**: Estudios realizados
7. **recomendaciones**: Recomendaciones de expertos

## 🚀 Próximos Pasos

### Para poner en funcionamiento:

1. **Instalar MySQL** (si no lo tienes):
   ```bash
   # Fedora/RHEL
   sudo dnf install mysql-server
   sudo systemctl start mysqld
   sudo systemctl enable mysqld
   
   # Ubuntu/Debian
   sudo apt install mysql-server
   sudo systemctl start mysql
   ```

2. **Configurar MySQL**:
   ```bash
   sudo mysql_secure_installation
   ```

3. **Crear la base de datos**:
   ```bash
   mysql -u root -p < database/schema.sql
   ```

4. **Configurar variables de entorno**:
   - Editar `.env.local` con tu password de MySQL

5. **Reiniciar el servidor**:
   ```bash
   # Ctrl+C para detener el servidor actual
   npm run dev
   ```

6. **Probar**:
   - Ir a http://localhost:3000
   - Llenar el formulario de solicitud
   - Click en "Continuar"
   - Verificar en MySQL:
     ```sql
     USE maro_hub;
     SELECT * FROM sesiones ORDER BY created_at DESC LIMIT 5;
     ```

## 🔧 Para Completar la Integración

### Próximas páginas a actualizar:

1. **evaluacion-clinica/page.tsx**:
   - Recuperar datos de localStorage
   - Guardar caso completo en MySQL
   - Crear evaluación clínica

2. **coordinacion/page.tsx**:
   - Leer casos desde MySQL en lugar de localStorage
   - Actualizar estados de casos
   - Registrar eventos en bitácora

3. **expertos/page.tsx**:
   - Similar a coordinación
   - Guardar recomendaciones en MySQL

## 📝 Ejemplo de Uso del API Client

```typescript
import { sesionesAPI, casosAPI, evaluacionesAPI } from '@/lib/api-client';

// Crear sesión
const sesion = await sesionesAPI.crear({
  region: "Región I",
  municipio: "Saltillo",
  unidad: "Hospital General",
  clues: "COAH000001"
});

// Crear caso
const caso = await casosAPI.crear({
  folio: "MG-HGJ-20260113-01",
  sesionId: sesion.sesionId,
  region: "Región I",
  municipio: "Saltillo",
  unidad: "Hospital General",
  pacienteIniciales: "MGH",
  edad: 28,
  semanasGestacion: 34.5,
  nivelRiesgo: "NARANJA"
});

// Crear evaluación clínica
const evaluacion = await evaluacionesAPI.crear({
  casoId: caso.casoId,
  antecedentePreeclampsia: true,
  sistolica: 145,
  diastolica: 95,
  pesoKg: 78.5,
  // ... más campos
});

// Listar casos
const casos = await casosAPI.listar();
```

## 🎯 Beneficios de la Implementación

### Antes (localStorage):
- ❌ Datos solo en navegador
- ❌ Se pierden al limpiar caché
- ❌ No compartibles entre dispositivos
- ❌ Sin respaldo
- ❌ Difícil de auditar

### Ahora (MySQL):
- ✅ Datos persistentes en servidor
- ✅ Respaldos automáticos posibles
- ✅ Acceso desde cualquier dispositivo
- ✅ Auditoría completa
- ✅ Reportes y análisis
- ✅ Escalable para múltiples usuarios
- ✅ Preparado para producción

## 🔐 Consideraciones de Seguridad

Para producción, considera:

1. **Autenticación de usuarios**:
   - NextAuth.js o similar
   - Roles: Médico, Coordinador, Experto

2. **Autorización**:
   - Middleware para proteger APIs
   - Validar permisos por rol

3. **Encriptación**:
   - HTTPS en producción
   - Datos sensibles encriptados en BD

4. **Validación**:
   - Validar inputs en servidor
   - Usar librería como Zod

5. **Rate Limiting**:
   - Limitar peticiones por IP
   - Prevenir abuso

## 📞 Soporte

Si encuentras problemas:

1. Verifica que MySQL esté corriendo
2. Revisa las credenciales en `.env.local`
3. Consulta logs en la consola del servidor
4. Verifica que las tablas existan en MySQL
