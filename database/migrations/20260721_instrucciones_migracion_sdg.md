# Migración: Corrección de notación SDG (Semanas de Gestación)

## Contexto

El sistema calculaba las semanas de gestación usando **decimal matemático** (ej: `10.9`), 
pero la notación médica correcta es **semanas.días** donde los días van de `0` a `6`.

| Antes (incorrecto) | Después (correcto) | Significado |
|---|---|---|
| `10.9` | `10.6` | 10 semanas y 6 días |
| `18.9` | `18.6` | 18 semanas y 6 días |
| `3.4` | `3.2` | 3 semanas y 2 días |

## Archivos modificados en código

| Archivo | Cambio |
|---|---|
| `src/app/api/pacientes/route.ts` | Función `computeSdgNotation()` reemplaza `roundToSingleDecimal()` |
| `src/app/pacientes/nuevo/page.tsx` | Cálculo en formulario de nuevo paciente |
| `src/app/dashboard/page.tsx` | Cálculo dinámico en tabla del dashboard |

## Instrucciones para servidor de pruebas

### Pre-requisitos

- Acceso SSH al servidor
- Credenciales de MySQL del servidor de pruebas
- El archivo de migración: `database/migrations/20260721_fix_sdg_notacion_medica.sql`

### Paso 1: Copiar el archivo de migración al servidor

```bash
scp database/migrations/20260721_fix_sdg_notacion_medica.sql usuario@servidor-pruebas:/tmp/
```

### Paso 2: Conectarse al servidor

```bash
ssh usuario@servidor-pruebas
```

### Paso 3: Verificar estado actual (antes de migrar)

```bash
mysql -u root -p NOMBRE_BD -e "
SELECT id, fum, DATE(created_at) AS creado, semanas_gestacion 
FROM cat_pacientes 
WHERE semanas_gestacion IS NOT NULL 
LIMIT 10;
"
```

> Buscar valores con `.7`, `.8` o `.9` — esos son los que están incorrectos.

### Paso 4: Ejecutar la migración

```bash
mysql -u root -p NOMBRE_BD < /tmp/20260721_fix_sdg_notacion_medica.sql
```

> **Nota:** Reemplazar `NOMBRE_BD` con el nombre de la base de datos en pruebas (ej: `maro_hub`).

### Paso 5: Verificar resultados

```bash
mysql -u root -p NOMBRE_BD -e "
SELECT id, fum, DATE(created_at) AS creado, 
       semanas_gestacion_backup AS antes, 
       semanas_gestacion AS despues
FROM cat_pacientes
WHERE semanas_gestacion IS NOT NULL
ORDER BY id;
"
```

### Paso 6: Confirmar que no hay valores inválidos

```bash
mysql -u root -p NOMBRE_BD -e "
SELECT COUNT(*) AS total,
       SUM(CASE WHEN (semanas_gestacion * 10) % 10 > 6 THEN 1 ELSE 0 END) AS dias_invalidos
FROM cat_pacientes 
WHERE semanas_gestacion IS NOT NULL;
"
```

> `dias_invalidos` debe ser **0**.

### Rollback (si fuera necesario)

Si necesitas revertir la migración:

```bash
mysql -u root -p NOMBRE_BD -e "
UPDATE cat_pacientes 
SET semanas_gestacion = semanas_gestacion_backup 
WHERE semanas_gestacion_backup IS NOT NULL;
"
```

Para eliminar la columna de backup después de confirmar que todo está bien:

```bash
mysql -u root -p NOMBRE_BD -e "
ALTER TABLE cat_pacientes DROP COLUMN semanas_gestacion_backup;
"
```

---

> **Importante:** Después de ejecutar la migración, desplegar el código actualizado para que los nuevos registros también usen la notación correcta.
