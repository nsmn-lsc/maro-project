# 🚀 Guía de Instalación y Activación del Sistema de Factor de Riesgo

## ⚡ Instalación Rápida (5 minutos)

### Paso 1: Actualizar Base de Datos
```bash
# Conectarse a MySQL y ejecutar migración
mysql -u root -p < database/migrations/20260205_add_factor_riesgo_scores.sql
```

**Lo que hace:**
- Agrega columnas de puntuación a tabla `casos`
- Crea tabla de historial para auditoría
- Agrega índices para mejor performance

### Paso 2: Probar el Sistema (Desarrollo)
```bash
# Asegúrate que el servidor está corriendo
npm run dev

# Luego en navegador:
# http://localhost:3000/ejemplo-factor-riesgo
```

### Paso 3: Integrar en Tus Páginas

**Opción A: Página existente - Agregar cálculo automático**
```typescript
// En tu archivo .tsx existente
'use client';
import { useFactorRiesgoAuto } from '@/lib/hooks/useFactorRiesgo';
import FactorRiesgoResultado from '@/app/components/FactorRiesgoResultado';

export default function MiPagina({ casoId }) {
  const { resultado, cargando, error } = useFactorRiesgoAuto(casoId);
  
  return (
    <div>
      {/* Tu contenido aquí */}
      {resultado && (
        <FactorRiesgoResultado resultado={resultado} />
      )}
    </div>
  );
}
```

**Opción B: Componente nuevo - Mostrar en tabla de casos**
```typescript
import { factorRiesgoAPI } from '@/lib/api-client';

// En tu columna de tabla
async function renderRiesgo(casoId) {
  const { resultado } = await factorRiesgoAPI.calcular(casoId);
  
  return (
    <span className={`
      px-3 py-1 rounded-full font-medium
      ${resultado.categoria === 'ALTO' ? 'bg-red-100 text-red-800' : ''}
      ${resultado.categoria === 'MODERADO' ? 'bg-yellow-100 text-yellow-800' : ''}
      ${resultado.categoria === 'BAJO' ? 'bg-green-100 text-green-800' : ''}
    `}>
      {resultado.puntajeTotal} pts - {resultado.categoria}
    </span>
  );
}
```

---

## 📚 Ejemplos de Uso

### Ejemplo 1: En formulario de evaluación
```typescript
const handleGuardarEvaluacion = async (datos) => {
  // Guardar datos
  await evaluacionesAPI.crear(datos);
  
  // Calcular riesgo automáticamente
  const { resultado } = await factorRiesgoAPI.calcular(casoId);
  
  // Mostrar en la UI
  mostrarAlerta(resultado.categoria, resultado.sugerencias);
};
```

### Ejemplo 2: En dashboard/lista de casos
```typescript
// Agregar columna "Factor de Riesgo"
{
  header: 'Riesgo',
  cell: async (row) => {
    const { resultado } = await factorRiesgoAPI.calcular(row.id);
    return <FactorRiesgoResultado resultado={resultado} />;
  }
}
```

### Ejemplo 3: En backend (Next.js API)
```typescript
// api/casos/[id]/riesgo.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const casoId = parseInt(params.id);
  
  // Llamar directamente la función
  import { calcularFactorRiesgo } from '@/lib/factorRiesgo';
  import { query } from '@/lib/db';
  
  // Obtener datos
  const caseData = await query(...);
  
  // Calcular
  const resultado = calcularFactorRiesgo(caseData);
  
  // Guardar
  await query('UPDATE casos SET score_factor_riesgo = ? WHERE id = ?', 
    [resultado.puntajeTotal, casoId]);
  
  return Response.json({ resultado });
}
```

---

## 🧪 Verificación de Funcionalidad

### Checklist Post-Instalación

```
[ ] Migración ejecutada correctamente
    $ mysql -u root -p maro_hub
    > SHOW TABLES;  # Debería incluir 'historial_factor_riesgo'
    > DESC casos;   # Debería incluir 'score_factor_riesgo'

[ ] Endpoint API funciona
    $ curl -X POST http://localhost:3000/api/casos/calcular-factor-riesgo \
      -H "Content-Type: application/json" \
      -d '{"casoId": 1}'
    # Debería retornar JSON con resultado

[ ] Página de ejemplo carga
    Ir a http://localhost:3000/ejemplo-factor-riesgo
    # Debería mostrar controles y resultado

[ ] Hook funciona en componentes
    Crear componente test con useFactorRiesgoAuto(1)
    # Debería calcular al cargar

[ ] Datos se guardan en BD
    $ mysql -u root -p maro_hub
    > SELECT score_factor_riesgo, categoria_riesgo_factor 
      FROM casos WHERE id = 1;
    # Debería tener valores después de calcular
```

---

## 🐛 Troubleshooting

### Problema: "No se pueden calcular puntos"
**Causa:** El caso no existe o no tiene datos de evaluación
**Solución:**
```bash
# Verificar que el caso existe
mysql -u root -p -e "SELECT * FROM casos WHERE id = 123;"

# Verificar que tiene evaluación
mysql -u root -p -e "SELECT * FROM evaluaciones_clinicas WHERE caso_id = 123;"
```

### Problema: "Error en endpoint API"
**Causa:** Variables de entorno de BD no configuradas
**Solución:**
```bash
# Verificar .env.local
cat .env.local
# Debe tener:
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=...
# DB_NAME=maro_hub
```

### Problema: "Hook retorna undefined"
**Causa:** El casoId es null o no existe
**Solución:**
```typescript
// Verificar casoId
console.log('casoId:', casoId);  // No debe ser null/undefined

// Usar useEffect para debug
useEffect(() => {
  console.log('Calculating for:', casoId);
}, [casoId]);
```

### Problema: "Campos numéricos no se suman"
**Causa:** Tipo de dato incorrecto
**Solución:**
```typescript
// Asegurar que valores son números
const datos = {
  age: parseInt(formData.age),      // ❌ edad = "38"
  sistolica: parseInt(formData.sistolica),  // ✅ sistolica = 140
};
```

---

## 📊 Verificar Datos Calculados

### Ver último cálculo de un caso
```sql
SELECT 
  score_factor_riesgo,
  categoria_riesgo_factor,
  fecha_calculo_factor,
  detalle_factor_riesgo
FROM casos
WHERE id = 123;
```

### Ver historial completo
```sql
SELECT 
  id,
  puntaje_total,
  categoria,
  created_at,
  calculado_por
FROM historial_factor_riesgo
WHERE caso_id = 123
ORDER BY created_at DESC;
```

### Ver campos que aportaron puntos
```sql
SELECT 
  JSON_EXTRACT(detalle_factor_riesgo, '$[*].campo') as campos,
  JSON_EXTRACT(detalle_factor_riesgo, '$[*].puntos') as puntos
FROM casos
WHERE id = 123;
```

---

## 🔄 Actualizar Scores Existentes (Script)

Si quieres recalcular todos los casos:

```bash
# Crear archivo: scripts/recalcular-factor-riesgo.ts
cat > scripts/recalcular-factor-riesgo.ts << 'EOF'
import { query } from '@/lib/db';
import { calcularFactorRiesgo, DatosFactorRiesgo } from '@/lib/factorRiesgo';

async function recalcularTodos() {
  console.log('Iniciando recálculo de factor de riesgo...');
  
  // Obtener todos los casos
  const casos = await query<any[]>('SELECT id FROM casos WHERE estatus != "CERRADO"');
  
  for (const caso of casos) {
    // Obtener datos del caso
    const caseData = await query<any[]>(
      'SELECT edad, gesta, partos, cesareas_previas FROM casos WHERE id = ?',
      [caso.id]
    );
    
    const evalData = await query<any[]>(
      'SELECT * FROM evaluaciones_clinicas WHERE caso_id = ? ORDER BY created_at DESC LIMIT 1',
      [caso.id]
    );
    
    if (caseData.length > 0) {
      const datos: DatosFactorRiesgo = {
        ...caseData[0],
        ...evalData[0],
      };
      
      const resultado = calcularFactorRiesgo(datos);
      
      // Guardar
      await query(
        'UPDATE casos SET score_factor_riesgo = ?, categoria_riesgo_factor = ?, fecha_calculo_factor = NOW() WHERE id = ?',
        [resultado.puntajeTotal, resultado.categoria, caso.id]
      );
      
      console.log(`✓ Caso ${caso.id}: ${resultado.puntajeTotal} pts (${resultado.categoria})`);
    }
  }
  
  console.log('✅ Recálculo completado');
}

recalcularTodos().catch(console.error);
EOF

# Ejecutar
tsx scripts/recalcular-factor-riesgo.ts
```

---

## 📈 Monitoreo en Producción

### Logs de cálculos
```bash
# Ver errores en API
tail -f /var/log/maro/api.log | grep "factor-riesgo"
```

### Performance
```sql
-- Casos que tardan más en calcular
SELECT 
  caso_id,
  COUNT(*) as calculos,
  AVG(TIMESTAMPDIFF(SECOND, created_at, NOW())) as promedio_dias
FROM historial_factor_riesgo
GROUP BY caso_id
ORDER BY promedio_dias DESC
LIMIT 10;
```

---

## ✅ Próximos Pasos después de Instalación

### Semana 1:
- [ ] Ejecutar migración
- [ ] Probar página de ejemplo
- [ ] Integrar en 1-2 páginas existentes

### Semana 2:
- [ ] Mostrar en dashboard
- [ ] Crear alertas por categoría
- [ ] Entrenar usuarios

### Semana 3:
- [ ] Reportes de riesgo
- [ ] Análisis de tendencias
- [ ] Optimizaciones de performance

---

## 💬 Soporte

**Documentación:**
- `FACTOR_RIESGO_GUIDE.md` - Guía completa
- `FACTOR_RIESGO_RESUMEN.md` - Resumen de implementación
- `src/lib/factorRiesgo.ts` - Código comentado

**Ejemplos de código:**
- `src/app/ejemplo-factor-riesgo/page.tsx` - Ejemplo simple
- `src/app/evaluacion-clinica-con-riesgo/page.tsx` - Ejemplo completo

**Tests:**
```bash
npm test -- factorRiesgo.test.ts
```

---

## 🎉 ¡Listo!

Ya tienes el sistema de factor de riesgo funcionando. Ahora:

1. ✅ Los datos ya están en la BD
2. ✅ El motor de cálculo está configurado
3. ✅ Los endpoints API funcionan
4. ✅ Los hooks React están listos

**Solo necesitas:** Integrarlos en tus formularios y páginas.
