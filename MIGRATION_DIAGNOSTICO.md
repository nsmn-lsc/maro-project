# Migración: Campo Diagnóstico a ENUM

## 📋 Descripción
Esta migración convierte el campo `diagnostico` de la tabla `consultas_prenatales` de tipo TEXT a tipo ENUM con valores específicos.

## 🔧 Aplicar Migración

### Opción 1: Desde MySQL CLI
```bash
mysql -u root -p maro_hub < database/migrations/20260126_modify_diagnostico_enum.sql
```

### Opción 2: Desde consola MySQL
```sql
mysql -u root -p
USE maro_hub;
source /opt/apps/maro-dev/database/migrations/20260126_modify_diagnostico_enum.sql;
```

### Opción 3: Ejecutar SQL directamente
```sql
ALTER TABLE consultas_prenatales
  MODIFY COLUMN diagnostico ENUM('seguimiento_embarazo', 'puerperio') NULL;
```

## ⚠️ Consideraciones

- **Datos existentes**: Si hay datos existentes en el campo `diagnostico` que no sean 'seguimiento_embarazo' o 'puerperio', la migración puede fallar.
- **Backup**: Se recomienda hacer un backup antes de aplicar la migración.

## 🔍 Verificar Migración

```sql
DESCRIBE consultas_prenatales;
```

El campo `diagnostico` debe mostrar:
```
Type: enum('seguimiento_embarazo','puerperio')
```

## 📌 Valores Permitidos

1. `seguimiento_embarazo` → "Seguimiento de embarazo"
2. `puerperio` → "Puerperio"

## ✅ Cambios en el Frontend

El formulario ahora muestra un selector (`<select>`) en lugar de un campo de texto libre, con las opciones:
- Seguimiento de embarazo
- Puerperio
