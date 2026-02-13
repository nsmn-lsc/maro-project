# Sistema de Puerperio - Implementación

## 📋 Descripción

Sistema completo para gestión de seguimiento de puerperio en MARO Hub, con generación automática de folios y flujo integrado desde consultas.

## 🔧 Migración de Base de Datos

### Aplicar migración:

```bash
mysql -u root -p maro_hub < database/migrations/20260126_create_puerperio.sql
```

O desde consola MySQL:

```sql
USE maro_hub;
source /opt/apps/maro-dev/database/migrations/20260126_create_puerperio.sql;
```

### Verificar tabla creada:

```sql
DESCRIBE puerperio;
```

## 🎯 Características Implementadas

### 1. **Tabla `puerperio`**
- Campos completos según especificación
- Foreign key a `cat_pacientes`
- Índices en `paciente_id` y `folio`
- Campos booleanos: `MMEG`, `usuaria_seguimiento`

### 2. **API `/api/puerperio`**
- `GET`: Obtener registros por paciente
- `POST`: Crear nuevo registro
- `GET ?action=generar-folio&clues_id=XXX`: Generar folio automático
- Formato de folio: `P-CLUES-001`, `P-CLUES-002`, etc.

### 3. **Página `/puerperio/nuevo`**
- Formulario completo de captura
- Generación automática de folio
- Diseño consistente con tema morado/purple
- Validaciones y manejo de errores

### 4. **Integración con Consultas**
- Al seleccionar "puerperio" como diagnóstico en consultas
- Redirección automática a página de puerperio
- Mantiene folio del paciente existente
- No genera folio nuevo cuando viene de consulta

## 🔄 Flujo de Trabajo

### Caso 1: Nuevo Puerperio Directo (desde dashboard)
```
Dashboard → + Nuevo Puerperio
  ↓
Se genera folio automático: P-CLUES-001
  ↓
Captura de datos
  ↓
Guardado en BD
```

### Caso 2: Puerperio desde Consulta
```
Paciente → Consultas
  ↓
Seleccionar diagnóstico = "puerperio"
  ↓
Guardar consulta
  ↓
Redirección automática a /puerperio/nuevo
  ↓
Usa folio del paciente existente (no genera nuevo)
  ↓
Captura datos complementarios
  ↓
Guardado en BD
```

## 📊 Estructura de Datos

### Campos de la tabla:
- **Identificación**: `id`, `paciente_id`, `folio`
- **Evento**: `fecha_atencion_evento`, `dias_puerperio`, `valoracion_riesgo`, `complicaciones`, `MMEG`
- **APEO**: `apeo_fecha`, `apeo_metodo`
- **Clínico**: `datos_alarma`, `diagnostico`, `plan`
- **Seguimiento**: `fecha_siguiente_consulta`, `referencia`, `usuaria_seguimiento`
- **Referencias**: `fecha_atencion_sna_tna`, `fecha_contrareferencia`
- **Auditoría**: `created_at`, `updated_at`, `created_by`, `updated_by`

## 🎨 Diseño Visual

- **Color tema**: Morado/Purple
- **Fondo**: Degradado azul oscuro + morado
- **Botones**: Estilo consistente con dashboard
- **Campos readonly**: Folio (no editable por usuario)

## 🔗 Rutas Creadas

1. `/puerperio/nuevo` - Formulario de captura
2. `/api/puerperio` - API REST

## ✅ Validaciones

- `paciente_id` es obligatorio
- Folio se genera automáticamente
- Si viene de consulta, usa folio del paciente
- Todos los campos de fecha son opcionales
- Checkboxes para campos booleanos

## 🚀 Próximos Pasos

1. Aplicar migración en base de datos
2. Probar flujo desde dashboard (botón "+ Nuevo Puerperio")
3. Probar flujo desde consultas (diagnóstico = "puerperio")
4. Verificar generación de folios consecutivos
