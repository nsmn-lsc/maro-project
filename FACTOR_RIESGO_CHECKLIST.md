# ✅ Checklist de Integración del Factor de Riesgo

## 📋 Checklist Completo

### FASE 0: Preparación (30 minutos)

- [ ] Leer archivos de documentación
  - [ ] `FACTOR_RIESGO_RESUMEN.md` (visión general)
  - [ ] `FACTOR_RIESGO_GUIDE.md` (guía detallada)
  - [ ] `FACTOR_RIESGO_ARQUITECTURA.md` (diagramas)

- [ ] Verificar archivos creados
  ```bash
  ls -la src/lib/factorRiesgo.ts              # ✓ Existe
  ls -la src/lib/hooks/useFactorRiesgo.ts    # ✓ Existe
  ls -la src/app/api/casos/calcular-factor-riesgo/route.ts  # ✓ Existe
  ls -la src/app/components/FactorRiesgoResultado.tsx       # ✓ Existe
  ```

---

### FASE 1: Base de Datos (10 minutos)

- [ ] Ejecutar migración SQL
  ```bash
  mysql -u root -p < database/migrations/20260205_add_factor_riesgo_scores.sql
  ```

- [ ] Verificar cambios en BD
  ```sql
  USE maro_hub;
  SHOW TABLES;                              # ✓ Ver 'historial_factor_riesgo'
  DESC casos;                               # ✓ Ver nuevas columnas
  SHOW CREATE TABLE historial_factor_riesgo; # ✓ Ver estructura
  ```

- [ ] Crear índices (si falta)
  ```sql
  CREATE INDEX idx_score_factor ON casos(score_factor_riesgo);
  CREATE INDEX idx_categoria_factor ON casos(categoria_riesgo_factor);
  ```

---

### FASE 2: Testing Local (20 minutos)

- [ ] Iniciar servidor
  ```bash
  npm run dev
  ```

- [ ] Probar página de ejemplo
  - [ ] Ir a `http://localhost:3000/ejemplo-factor-riesgo`
  - [ ] Seleccionar un casoId existente (ej: 1)
  - [ ] Hacer clic en "Actualizar"
  - [ ] Ver resultado calculado
  - [ ] Verificar categoría (BAJO/MODERADO/ALTO)
  - [ ] Ver tabla de detalles

- [ ] Probar endpoint REST
  ```bash
  curl -X POST http://localhost:3000/api/casos/calcular-factor-riesgo \
    -H "Content-Type: application/json" \
    -d '{"casoId": 1}'
  ```
  - [ ] Debería retornar JSON con `resultado`
  - [ ] Verificar estructura de respuesta

- [ ] Ejecutar tests unitarios
  ```bash
  npm test -- factorRiesgo.test.ts
  ```
  - [ ] Todos los tests deberían pasar (40+)
  - [ ] No debería haber warnings

---

### FASE 3: Integración en Páginas Existentes (1-2 horas)

#### 3.1 - Integración en Página de Evaluación Clínica

- [ ] Abrir archivo: `src/app/evaluacion-clinica/page.tsx`

- [ ] Importar necesarios
  ```typescript
  import { useFactorRiesgoAuto } from '@/lib/hooks/useFactorRiesgo';
  import FactorRiesgoResultado from '@/app/components/FactorRiesgoResultado';
  ```

- [ ] En el componente, agregar estado de caso
  ```typescript
  const [casoId, setCasoId] = useState<number | null>(null);
  ```

- [ ] Agregar hook de factor de riesgo
  ```typescript
  const { resultado, cargando, error } = useFactorRiesgoAuto(casoId);
  ```

- [ ] Al guardar evaluación, actualizar casoId
  ```typescript
  const handleGuardar = async (datos) => {
    await evaluacionesAPI.crear(datos);
    setCasoId(miCasoId);  // Dispara cálculo automático
  };
  ```

- [ ] Agregar componente de resultado
  ```typescript
  {resultado && (
    <FactorRiesgoResultado resultado={resultado} mostrarDetalles={true} />
  )}
  ```

- [ ] Verificar que funciona en navegador

#### 3.2 - Integración en Dashboard/Lista de Casos

- [ ] Abrir archivo: `src/app/coordinacion/page.tsx` (o donde esté tu tabla de casos)

- [ ] Agregar columna "Factor de Riesgo"
  ```typescript
  const columns = [
    // ... columnas existentes
    {
      header: 'Factor de Riesgo',
      accessorKey: 'scoreFactorRiesgo',
      cell: (info) => {
        const caso = info.row.original;
        return (
          <span className={`
            px-3 py-1 rounded-full text-sm font-medium
            ${caso.categoria_riesgo_factor === 'ALTO' ? 'bg-red-100 text-red-800' : ''}
            ${caso.categoria_riesgo_factor === 'MODERADO' ? 'bg-yellow-100 text-yellow-800' : ''}
            ${caso.categoria_riesgo_factor === 'BAJO' ? 'bg-green-100 text-green-800' : ''}
          `}>
            {caso.score_factor_riesgo} pts - {caso.categoria_riesgo_factor}
          </span>
        );
      }
    }
  ];
  ```

- [ ] Verificar que se muestra en tabla

#### 3.3 - Integración en Formulario de Nuevo Caso

- [ ] Abrir archivo: `src/app/nuevo-caso/page.tsx`

- [ ] Al completar el formulario, calcular riesgo
  ```typescript
  const handleSubmit = async (datos) => {
    const casoResponse = await casosAPI.crear(datos);
    
    // Calcular factor de riesgo
    const riesgoResponse = await factorRiesgoAPI.calcular(casoResponse.casoId);
    
    // Mostrar resultado
    mostrarAlerta(riesgoResponse.resultado.categoria);
  };
  ```

- [ ] Verificar que funciona

---

### FASE 4: Alertas y Notificaciones (30 minutos)

- [ ] Crear componente de alerta por categoría
  ```typescript
  // src/app/components/AlertaFactorRiesgo.tsx
  export function AlertaFactorRiesgo({ categoria, sugerencias }) {
    if (categoria === 'ALTO') {
      return (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4">
          <h4 className="font-bold text-red-900">🔴 RIESGO ALTO</h4>
          <p className="text-red-700 text-sm mt-2">
            Se requiere referencia urgente a nivel superior
          </p>
        </div>
      );
    }
    // ... más categorías
  }
  ```

- [ ] Integrar en páginas donde se muestre riesgo
  ```typescript
  <AlertaFactorRiesgo 
    categoria={resultado.categoria}
    sugerencias={resultado.sugerencias}
  />
  ```

- [ ] Probar que se muestra correctamente

---

### FASE 5: Persistencia en BD (20 minutos)

- [ ] Actualizar endpoint de evaluación para guardar score
  ```typescript
  // src/app/api/evaluaciones/route.ts
  const resultado = calcularFactorRiesgo(evaluacionData);
  
  await query(
    'UPDATE casos SET score_factor_riesgo = ?, categoria_riesgo_factor = ? WHERE id = ?',
    [resultado.puntajeTotal, resultado.categoria, casoId]
  );
  ```

- [ ] Verificar que se guarda en BD
  ```sql
  SELECT score_factor_riesgo, categoria_riesgo_factor 
  FROM casos 
  WHERE id = 1;
  ```

---

### FASE 6: Reportes y Análisis (1 hora)

- [ ] Crear endpoint de estadísticas
  ```typescript
  // src/app/api/factor-riesgo/estadisticas.ts
  export async function GET(request: NextRequest) {
    const estadisticas = await query(`
      SELECT 
        categoria_riesgo_factor,
        COUNT(*) as cantidad,
        AVG(score_factor_riesgo) as promedio
      FROM casos
      WHERE fecha_calculo_factor IS NOT NULL
      GROUP BY categoria_riesgo_factor
    `);
    
    return NextResponse.json({ estadisticas });
  }
  ```

- [ ] Crear página de reportes
  ```typescript
  // src/app/reportes/factor-riesgo.tsx
  - Gráfico de distribución de riesgos
  - Tabla de casos por categoría
  - Tendencias en el tiempo
  ```

- [ ] Verificar que muestra datos correctamente

---

### FASE 7: Documentación del Equipo (30 minutos)

- [ ] Actualizar README principal
  ```markdown
  ## Factor de Riesgo Obstétrico
  
  Se calcula automáticamente al guardar evaluaciones clínicas.
  
  Categorías:
  - BAJO: 0-9 puntos
  - MODERADO: 10-19 puntos
  - ALTO: ≥20 puntos
  
  Ver: FACTOR_RIESGO_GUIDE.md
  ```

- [ ] Crear documento de capacitación para usuarios
  ```markdown
  # Cómo funciona el Factor de Riesgo
  
  1. Ingresas datos clínicos
  2. Sistema calcula automáticamente
  3. Ves puntuación y categoría
  4. Recibes recomendaciones
  ```

- [ ] Compartir documentación con equipo

---

### FASE 8: QA y Testing Final (1 hora)

#### Pruebas Funcionales

- [ ] Casos BAJO (<10 puntos)
  - [ ] Crear un caso con datos "normales"
  - [ ] Verificar que puntaje es < 10
  - [ ] Verificar que categoría es BAJO
  - [ ] Verificar que no hay alertas

- [ ] Casos MODERADO (10-19 puntos)
  - [ ] Crear caso con edad 37 + gesta 5 + IMC 32
  - [ ] Verificar que puntaje es 10-19
  - [ ] Verificar que categoría es MODERADO
  - [ ] Verificar que se sugiere evaluación especializada

- [ ] Casos ALTO (≥20 puntos)
  - [ ] Crear caso con múltiples factores de riesgo
  - [ ] Verificar que puntaje es ≥ 20
  - [ ] Verificar que categoría es ALTO
  - [ ] Verificar que se sugiere referencia urgente

#### Pruebas de BD

- [ ] Datos se guardan en `casos`
  ```sql
  SELECT score_factor_riesgo, categoria_riesgo_factor 
  FROM casos 
  WHERE score_factor_riesgo IS NOT NULL
  LIMIT 5;
  ```

- [ ] Historial se registra en `historial_factor_riesgo`
  ```sql
  SELECT COUNT(*) FROM historial_factor_riesgo;
  ```

#### Pruebas de Performance

- [ ] Cálculo en < 200ms
  ```typescript
  console.time('factorRiesgo');
  await factorRiesgoAPI.calcular(1);
  console.timeEnd('factorRiesgo');
  ```

- [ ] API responde en < 500ms
- [ ] BD queries en < 100ms

#### Pruebas de Seguridad

- [ ] No se pueden ver casos de otro usuario (si hay autenticación)
- [ ] Solo coordinadores pueden ver ALTO/categorías
- [ ] Historial no se puede modificar

---

### FASE 9: Despliegue a Producción (30 minutos)

- [ ] Hacer backup de BD
  ```bash
  mysqldump -u root -p maro_hub > backup_$(date +%Y%m%d).sql
  ```

- [ ] Ejecutar migración en producción
  ```bash
  mysql -u root -p -h [host-prod] < database/migrations/20260205_add_factor_riesgo_scores.sql
  ```

- [ ] Desplegar código
  ```bash
  git add .
  git commit -m "feat: agregar sistema de factor de riesgo obstétrico"
  git push
  npm run build
  npm start
  ```

- [ ] Verificar que funciona en producción
  - [ ] Página de ejemplo accesible
  - [ ] Cálculos correctos
  - [ ] BD actualiza scores
  - [ ] No hay errores en logs

- [ ] Comunicar al equipo

---

### FASE 10: Monitoreo Post-Despliegue (Continuo)

- [ ] Revisar logs diarios
  ```bash
  tail -f logs/error.log | grep "factor-riesgo"
  ```

- [ ] Verificar que cálculos se están haciendo
  ```sql
  SELECT COUNT(DISTINCT caso_id) FROM historial_factor_riesgo 
  WHERE DATE(created_at) = CURDATE();
  ```

- [ ] Monitoring de performance
  ```sql
  SELECT AVG(DATEDIFF(created_at, updated_at)) 
  FROM historial_factor_riesgo;
  ```

- [ ] Feedback de usuarios
  - [ ] ¿Entienden las categorías?
  - [ ] ¿Encuentran las recomendaciones útiles?
  - [ ] ¿Hay casos borderline mal clasificados?

---

## 📊 Métricas de Éxito

Después de la implementación, debería ver:

```
✅ Casos con score_factor_riesgo completado: > 90%
✅ Distribución:
   - BAJO:     30-40%
   - MODERADO: 40-50%
   - ALTO:     10-20%

✅ Tiempo de cálculo: < 200ms

✅ Cambios de categoría captados: 100%

✅ Usuarios satisfechos: > 80%
```

---

## 🆘 Troubleshooting Rápido

| Problema | Causa | Solución |
|----------|-------|----------|
| Endpoint retorna error 404 | Archivo route.ts no existe | Verificar ruta `/api/casos/calcular-factor-riesgo/route.ts` |
| Hook no calcula | casoId es null | Verificar que se está pasando casoId correcto |
| BD no se actualiza | Query no se ejecuta | Ver console del servidor por errores |
| Categoría incorrecta | Lógica de criterios | Verificar tabla de puntos en `factorRiesgo.ts` |
| Performance lenta | Queries sin índices | Ejecutar: `CREATE INDEX idx_score_factor ON casos(...)` |

---

## 📞 Soporte

**Preguntas sobre integración:**
- Ver `FACTOR_RIESGO_GUIDE.md`
- Revisar `src/app/evaluacion-clinica-con-riesgo/page.tsx` (ejemplo completo)

**Problemas técnicos:**
- Revisar logs: `npm run dev` o `/var/log/maro/`
- Ejecutar tests: `npm test -- factorRiesgo.test.ts`
- Consultar BD: Ver query en `FACTOR_RIESGO_ARQUITECTURA.md`

---

## ✅ Sign-off

```
Fecha de inicio: ________________
Fecha de finalización: ________________

Desarrollador: ________________
Responsable QA: ________________
Product Owner: ________________

✓ Todas las fases completadas
✓ Tests pasados
✓ Documentación actualizada
✓ Equipo capacitado
```

---

**¡Listo! El sistema de factor de riesgo está integrado y operacional.**
