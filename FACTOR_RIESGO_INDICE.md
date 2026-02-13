# 📚 ÍNDICE DE ACCESO RÁPIDO - Factor de Riesgo Obstétrico

## 🎯 ¿Qué Necesito?

### Si quiero... → Lee esto:

| Necesidad | Archivo | Tiempo |
|-----------|---------|--------|
| **Visión general rápida** | `FACTOR_RIESGO_FINAL.md` | 5 min |
| **Entender cómo funciona** | `FACTOR_RIESGO_RESUMEN.md` | 10 min |
| **Activar el sistema** | `FACTOR_RIESGO_INSTALACION.md` | 15 min |
| **Guía completa de uso** | `FACTOR_RIESGO_GUIDE.md` | 30 min |
| **Ver arquitectura/diagramas** | `FACTOR_RIESGO_ARQUITECTURA.md` | 20 min |
| **Integrar en mis páginas** | `src/app/evaluacion-clinica-con-riesgo/page.tsx` | 30 min |
| **Ver ejemplo simple** | `src/app/ejemplo-factor-riesgo/page.tsx` | 10 min |
| **Seguir checklist paso a paso** | `FACTOR_RIESGO_CHECKLIST.md` | 2-3 horas |

---

## 🚀 Ruta Rápida de 15 Minutos

```
1. Leer FACTOR_RIESGO_FINAL.md (5 min)
   ↓
2. Ejecutar migración SQL (2 min)
   mysql -u root -p < database/migrations/20260205_add_factor_riesgo_scores.sql
   ↓
3. Ir a http://localhost:3000/ejemplo-factor-riesgo (5 min)
   ↓
4. Ver resultado funcionando ✅
```

---

## 🔧 Ruta de Desarrollo de 2 Horas

```
1. Leer FACTOR_RIESGO_GUIDE.md (30 min)
   ↓
2. Ejecutar migración (5 min)
   ↓
3. Abrir src/app/evaluacion-clinica-con-riesgo/page.tsx (30 min)
   └─ Entender patrón completo
   ↓
4. Adaptar en tus páginas (45 min)
   └─ Copiar hooks
   └─ Copiar componente
   └─ Integrar en formularios
   ↓
5. Probar localmente (10 min)
   └─ npm run dev
   └─ Verificar cálculos
```

---

## 📖 Documentación por Tema

### Instalación
- `FACTOR_RIESGO_INSTALACION.md` - Paso a paso completo
- `FACTOR_RIESGO_CHECKLIST.md` - Checklist de implementación

### Uso
- `FACTOR_RIESGO_GUIDE.md` - Guía de uso completa
- `FACTOR_RIESGO_RESUMEN.md` - Resumen ejecutivo
- `FACTOR_RIESGO_FINAL.md` - Resumen final

### Arquitectura
- `FACTOR_RIESGO_ARQUITECTURA.md` - Diagramas y flujos
- `src/lib/factorRiesgo.ts` - Código comentado

### Ejemplos
- `src/app/ejemplo-factor-riesgo/page.tsx` - Ejemplo simple
- `src/app/evaluacion-clinica-con-riesgo/page.tsx` - Ejemplo completo
- `FACTOR_RIESGO_GUIDE.md` - Ejemplos de código

---

## 💻 Archivos de Código

### Motor
- `src/lib/factorRiesgo.ts` - Lógica principal (709 líneas)
  - `calcularFactorRiesgo()` - Función principal
  - `obtenerCamposActivos()` - Función auxiliar

### React
- `src/lib/hooks/useFactorRiesgo.ts` - Hooks (160 líneas)
  - `useFactorRiesgo()` - Hook manual
  - `useFactorRiesgoAuto()` - Hook automático
  
- `src/app/components/FactorRiesgoResultado.tsx` - Componente visual

### API
- `src/app/api/casos/calcular-factor-riesgo/route.ts` - Endpoint
  - `POST` - Calcula factor
  - `GET` - Consulta alternativa

- `src/lib/api-client.ts` - Cliente (actualizado)
  - `factorRiesgoAPI.calcular()`
  - `factorRiesgoAPI.obtener()`
  - `factorRiesgoAPI.obtenerHistorial()`

### Tests
- `src/lib/__tests__/factorRiesgo.test.ts` - 40+ pruebas

### Ejemplos
- `src/app/ejemplo-factor-riesgo/page.tsx` - Demo simple
- `src/app/evaluacion-clinica-con-riesgo/page.tsx` - Demo completa

---

## 🗄️ Base de Datos

### Migración
- `database/migrations/20260205_add_factor_riesgo_scores.sql`

### Cambios
- Tabla `casos`: Nuevas columnas
  - `score_factor_riesgo` INT
  - `categoria_riesgo_factor` ENUM
  - `fecha_calculo_factor` TIMESTAMP
  - `detalle_factor_riesgo` JSON

- Tabla `historial_factor_riesgo`: Nueva tabla
  - Auditoría completa de cálculos

---

## 🎯 Escenarios de Uso

### Escenario 1: "Quiero probarlo ya"
```
1. npm run dev
2. Go to http://localhost:3000/ejemplo-factor-riesgo
3. Seleccionar casoId
4. Ver resultado
```

### Escenario 2: "Quiero integrarlo en mi página"
```
1. Leer: src/app/evaluacion-clinica-con-riesgo/page.tsx
2. Copiar el patrón de hooks
3. Adaptar en tu página
4. Probar
```

### Escenario 3: "Quiero entender toda la arquitectura"
```
1. Leer: FACTOR_RIESGO_ARQUITECTURA.md
2. Ver diagramas de flujo
3. Revisar: src/lib/factorRiesgo.ts
4. Seguir trace en debugger
```

### Escenario 4: "Quiero deploying a producción"
```
1. Seguir: FACTOR_RIESGO_INSTALACION.md FASE 9
2. Hacer backup de BD
3. Ejecutar migración
4. Desplegar código
5. Verificar en producción
```

---

## 🐛 Si Tengo Problemas

| Problema | Solución | Referencia |
|----------|----------|-----------|
| "No funciona endpoint" | Ver migración de BD | `FACTOR_RIESGO_INSTALACION.md` |
| "Hook retorna undefined" | Verificar casoId | `FACTOR_RIESGO_GUIDE.md` Sección: Uso en Frontend |
| "Cálculo incorrecto" | Revisar criterios | `FACTOR_RIESGO_ARQUITECTURA.md` Tabla de Puntos |
| "BD no se actualiza" | Ver query en endpoint | `src/app/api/casos/calcular-factor-riesgo/route.ts` |
| "Performance lenta" | Ver optimizaciones | `FACTOR_RIESGO_ARQUITECTURA.md` Sección: Performance |

---

## ✅ Checklist Mínimo

- [ ] Leer `FACTOR_RIESGO_FINAL.md` (5 min)
- [ ] Ejecutar migración SQL (2 min)
- [ ] Abrir `http://localhost:3000/ejemplo-factor-riesgo` (5 min)
- [ ] Ver ejemplo funcionando ✅

**Total: 12 minutos para estar operacional**

---

## 📊 Estadísticas

```
Archivos de código:     9 archivos
Líneas de código:       ~2,000 líneas
Documentación:          ~3,000 líneas
Pruebas:               40+ tests
Criterios:             60+
Categorías:            3 (BAJO/MODERADO/ALTO)
Tiempo de desarrollo:  Incluido en esta sesión
Tiempo de instalación: 15 minutos
Tiempo de integración: 1-2 horas
```

---

## 🚀 Orden Recomendado de Lectura

### Para Admin/Product Owner
1. `FACTOR_RIESGO_FINAL.md` - Qué se hizo
2. `FACTOR_RIESGO_RESUMEN.md` - Características
3. `FACTOR_RIESGO_ARQUITECTURA.md` - Diagramas

### Para Desarrollador
1. `FACTOR_RIESGO_FINAL.md` - Visión general
2. `FACTOR_RIESGO_GUIDE.md` - Guía técnica
3. `src/app/evaluacion-clinica-con-riesgo/page.tsx` - Código
4. `src/lib/factorRiesgo.ts` - Motor

### Para QA/Tester
1. `FACTOR_RIESGO_CHECKLIST.md` - Plan de pruebas
2. `src/lib/__tests__/factorRiesgo.test.ts` - Tests
3. `FACTOR_RIESGO_ARQUITECTURA.md` - Casos de prueba

---

## 🎓 Conceptos Clave

### Factor de Riesgo
Puntuación numérica (0-100+) que representa el nivel de riesgo obstétrico

### Categorización
- **BAJO** (0-9): Seguimiento de rutina
- **MODERADO** (10-19): Evaluación especializada
- **ALTO** (≥20): Urgencia/Referencia

### Criterios
60+ campos clínicos que se evalúan y suman puntos

### Auditoría
Historial completo de todos los cálculos realizados

---

## 🔗 Enlaces Rápidos

| Recurso | Ubicación |
|---------|-----------|
| Documentación general | `FACTOR_RIESGO_*.md` |
| Motor de cálculo | `src/lib/factorRiesgo.ts` |
| Hooks React | `src/lib/hooks/useFactorRiesgo.ts` |
| Componente visual | `src/app/components/FactorRiesgoResultado.tsx` |
| Endpoint API | `src/app/api/casos/calcular-factor-riesgo/route.ts` |
| Ejemplo simple | `src/app/ejemplo-factor-riesgo/page.tsx` |
| Ejemplo completo | `src/app/evaluacion-clinica-con-riesgo/page.tsx` |
| Tests | `src/lib/__tests__/factorRiesgo.test.ts` |
| Migración BD | `database/migrations/20260205_add_factor_riesgo_scores.sql` |

---

## 💡 Tips

✅ **Empezar por el ejemplo:** `ejemplo-factor-riesgo/page.tsx` tiene instrucciones inline
✅ **Copiar patrón:** Ver `evaluacion-clinica-con-riesgo/page.tsx` como plantilla
✅ **Tests primero:** Ejecutar `npm test -- factorRiesgo.test.ts` para validar
✅ **Debuging:** Ver logs de cálculo con `console.log(resultado.detalles)`
✅ **Performance:** Cálculos tardan <200ms, muy rápido

---

## 🎉 ¡COMIENZA AQUÍ!

1. Lee: `FACTOR_RIESGO_FINAL.md` (5 min)
2. Instala: Migración SQL (5 min)
3. Prueba: `http://localhost:3000/ejemplo-factor-riesgo` (5 min)
4. Integra: Sigue `FACTOR_RIESGO_CHECKLIST.md` (2-3 horas)

**Total: De 15 minutos a 2 horas de funcionalidad completa.**

---

Última actualización: 5 de febrero de 2026
Versión: 1.0.0 - Production Ready
