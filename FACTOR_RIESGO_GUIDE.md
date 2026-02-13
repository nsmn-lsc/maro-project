# Sistema de Factor de Riesgo Obstétrico

## 📋 Descripción General

Sistema centralizado de puntuación de factores de riesgo obstétrico que:
- **Recopila automáticamente** datos de múltiples páginas y tablas de BD
- **Calcula puntuación numérica** basada en criterios clínicos validados
- **Suma factores** de antecedentes, edad, signos vitales, laboratorios, etc.
- **Categoriza riesgo** como BAJO, MODERADO o ALTO
- **Proporciona sugerencias** de acciones clínicas

---

## 🏗️ Arquitectura

### Archivos Creados

```
src/lib/
├── factorRiesgo.ts                  # Motor de cálculo (lógica pura)
├── hooks/
│   └── useFactorRiesgo.ts          # Hook React para uso en componentes
└── api-client.ts                    # Cliente API (actualizado)

src/app/
├── api/casos/
│   └── calcular-factor-riesgo/
│       └── route.ts                 # Endpoint para cálculo
└── components/
    └── FactorRiesgoResultado.tsx   # Componente visual de resultados

database/migrations/
└── 20260205_add_factor_riesgo_scores.sql  # Cambios de BD
```

---

## 📊 Criterios de Puntuación

### Antecedentes Obstétricos

| Campo | Criterio | Puntos |
|-------|----------|--------|
| Gestaciones | 2-4 | 1 |
| Gestaciones | ≥ 5 | 4 |
| Cesáreas | 1 | 2 |
| Cesáreas | ≥ 2 | 4 |
| Abortos | 2 | 2 |
| Abortos | ≥ 3 | 3 |

### Factores Demográficos

| Campo | Criterio | Puntos |
|-------|----------|--------|
| Edad | ≤ 19 años | 2 |
| Edad | ≥ 35 años | 3 |
| IMC | < 18.5 (bajo peso) | 1 |
| IMC | 30-39.9 (obesidad) | 2 |
| IMC | ≥ 40 (obesidad severa) | 4 |

### Condiciones Médicas Previas

| Condición | Puntos |
|-----------|--------|
| Embarazo múltiple | 4 |
| Antecedente de preeclampsia | 4 |
| Antecedente de hemorragia posparto | 3 |
| Diabetes previa | 3 |
| Diabetes gestacional | 2 |
| Hipertensión crónica | 3 |
| Cardiopatía | 4 |
| Nefropatía | 3 |
| Epilepsia | 2 |
| VIH positivo | 3 |

### Signos y Síntomas de Alarma

| Síntoma | Puntos |
|---------|--------|
| Sangrado vaginal | 3 |
| Salida de líquido | 2 |
| Dolor abdominal intenso | 3 |
| Cefalea severa | 3 |
| Fosfenos | 4 |
| Epigastralgia | 2 |
| Fiebre | 2 |
| Disnea | 3 |
| Disminución de movimientos fetales | 3 |

### Signos Vitales Anormales

| Parámetro | Criterio | Puntos |
|-----------|----------|--------|
| Presión sistólica | 140-149 mmHg | 2 |
| Presión sistólica | ≥ 150 mmHg | 3 |
| Presión diastólica | 90-99 mmHg | 2 |
| Presión diastólica | ≥ 100 mmHg | 3 |
| FC materna | < 60 o > 110 bpm | 1 |
| FR | ≥ 25 resp/min | 2 |
| SatO₂ | < 95% | 2 |
| Temperatura | 38.0-38.4°C | 1 |
| Temperatura | ≥ 38.5°C | 2 |

### Laboratorios

| Parámetro | Criterio | Puntos |
|-----------|----------|--------|
| Plaquetas | 100-149 x10³/µL | 1 |
| Plaquetas | < 100 x10³/µL | 3 |
| Creatinina | > 1.2 mg/dL | 2 |
| AST | > 70 U/L | 2 |
| ALT | > 70 U/L | 2 |
| Proteinuria | 1+ | 1 |
| Proteinuria | 2+ | 2 |
| Proteinuria | 3-4+ | 3-4 |

---

## 📱 Categorías de Riesgo

```
BAJO:       0-9 puntos      ✓ Seguimiento de rutina
MODERADO:   10-19 puntos    ⚠ Evaluación especializada
ALTO:       ≥20 puntos      🔴 Urgencia/Referencia
```

---

## 💻 Uso en Backend (Node.js/API)

### Opción 1: Llamar el endpoint directamente

```typescript
// POST /api/casos/calcular-factor-riesgo
const respuesta = await fetch('/api/casos/calcular-factor-riesgo', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ casoId: 123 })
});

const { resultado } = await respuesta.json();
console.log(`Puntuación: ${resultado.puntajeTotal}`);
console.log(`Categoría: ${resultado.categoria}`);
```

### Opción 2: Usar la función directamente

```typescript
import { calcularFactorRiesgo, DatosFactorRiesgo } from '@/lib/factorRiesgo';

const datos: DatosFactorRiesgo = {
  gesta: 3,
  cesareasPrevias: 1,
  edad: 38,
  imc: 32,
  antecedentePreeclampsia: true,
  sangradoVaginal: false,
  sistolica: 145,
  plaquetas: 120000,
};

const resultado = calcularFactorRiesgo(datos);
console.log(resultado.puntajeTotal);        // 15
console.log(resultado.categoria);           // "MODERADO"
console.log(resultado.detalles);            // Array con cada factor
console.log(resultado.sugerencias);         // Array de recomendaciones
```

---

## 🎨 Uso en Frontend (React)

### Opción 1: Usar el hook personalizado

```typescript
'use client';

import { useFactorRiesgo } from '@/lib/hooks/useFactorRiesgo';
import FactorRiesgoResultado from '@/app/components/FactorRiesgoResultado';

export default function MiComponente({ casoId }: { casoId: number }) {
  const { resultado, calcular, cargando, error } = useFactorRiesgo();

  const handleCalcular = async () => {
    await calcular(casoId);
  };

  return (
    <div>
      <button 
        onClick={handleCalcular} 
        disabled={cargando}
      >
        {cargando ? 'Calculando...' : 'Calcular Factor de Riesgo'}
      </button>

      {resultado && (
        <FactorRiesgoResultado 
          resultado={resultado}
          mostrarDetalles={true}
        />
      )}
    </div>
  );
}
```

### Opción 2: Auto-cálculo automático

```typescript
'use client';

import { useFactorRiesgoAuto } from '@/lib/hooks/useFactorRiesgo';
import FactorRiesgoResultado from '@/app/components/FactorRiesgoResultado';

export default function MiComponente({ casoId }: { casoId: number }) {
  // Calcula automáticamente cuando casoId cambia
  const { resultado, cargando, error } = useFactorRiesgoAuto(casoId);

  return (
    resultado && (
      <FactorRiesgoResultado 
        resultado={resultado}
        cargando={cargando}
        error={error}
      />
    )
  );
}
```

### Opción 3: Usar directamente el cliente API

```typescript
'use client';

import { factorRiesgoAPI } from '@/lib/api-client';
import { useState } from 'react';

export default function MiComponente({ casoId }: { casoId: number }) {
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);

  const handleCalcular = async () => {
    setCargando(true);
    try {
      const resp = await factorRiesgoAPI.calcular(casoId);
      setResultado(resp.resultado);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  return (
    <button onClick={handleCalcular} disabled={cargando}>
      Calcular
    </button>
  );
}
```

---

## 🗄️ Actualizar Base de Datos

Ejecutar la migración para agregar columnas de puntuación:

```bash
mysql -u root -p < database/migrations/20260205_add_factor_riesgo_scores.sql
```

Esto crea:
- Columna `score_factor_riesgo` en tabla `casos`
- Columna `categoria_riesgo_factor` en tabla `casos`
- Columna `detalle_factor_riesgo` (JSON) en tabla `casos`
- Tabla auxiliar `historial_factor_riesgo` para auditoría

---

## 🔄 Integración en Flujo Existente

### 1. Al crear/actualizar un caso

```typescript
// En la página de evaluación clínica
async function guardarEvaluacion(datos) {
  // Guardar evaluación
  await evaluacionesAPI.crear({
    casoId: miCasoId,
    ...datos
  });

  // Calcular factor de riesgo automáticamente
  const resultado = await factorRiesgoAPI.calcular(miCasoId);
  
  // Mostrar resultado al usuario
  mostrarResultado(resultado);
}
```

### 2. En dashboard/coordinación

```typescript
// Mostrar factor de riesgo en tabla de casos
const { resultado } = await factorRiesgoAPI.calcular(caso.id);

return (
  <tr>
    <td>{caso.folio}</td>
    <td>{caso.paciente}</td>
    <td>
      <FactorRiesgoResultado resultado={resultado} />
    </td>
  </tr>
);
```

### 3. Recalcular periódicamente

```typescript
// En cron job o trigger
setInterval(async () => {
  const casos = await obtenerCasosActivos();
  
  for (const caso of casos) {
    const resultado = await factorRiesgoAPI.calcular(caso.id);
    
    // Guardar en BD si cambió
    if (resultado.puntajeTotal !== caso.scoreFactorRiesgo) {
      await actualizarCaso(caso.id, {
        score_factor_riesgo: resultado.puntajeTotal,
        categoria_riesgo_factor: resultado.categoria,
      });
    }
  }
}, 3600000); // Cada hora
```

---

## 📝 Ejemplo Completo de Página

```typescript
// src/app/evaluacion-clinica/page.tsx
'use client';

import { useFactorRiesgoAuto } from '@/lib/hooks/useFactorRiesgo';
import FactorRiesgoResultado from '@/app/components/FactorRiesgoResultado';
import { useState } from 'react';

export default function EvaluacionClinica() {
  const [casoId, setCasoId] = useState<number | null>(null);
  const { resultado, cargando, error } = useFactorRiesgoAuto(casoId);

  return (
    <div className="space-y-6">
      {/* Formulario de datos */}
      <form onSubmit={handleSubmit}>
        {/* Campos de antecedentes, signos vitales, labs, etc */}
      </form>

      {/* Mostrar factor de riesgo */}
      <FactorRiesgoResultado
        resultado={resultado}
        cargando={cargando}
        error={error}
        mostrarDetalles={true}
      />

      {/* Sugerencias según categoría */}
      {resultado?.categoria === 'ALTO' && (
        <div className="bg-red-50 p-4 rounded border border-red-300">
          <h4 className="font-bold text-red-900">Acción requerida:</h4>
          <p>Factor de riesgo ALTO - Se recomienda referencia urgente</p>
        </div>
      )}
    </div>
  );
}
```

---

## 🧪 Pruebas

### Prueba manual del endpoint

```bash
curl -X POST http://localhost:3000/api/casos/calcular-factor-riesgo \
  -H "Content-Type: application/json" \
  -d '{"casoId": 1}'
```

### Respuesta esperada

```json
{
  "success": true,
  "casoId": 1,
  "resultado": {
    "puntajeTotal": 15,
    "categoria": "MODERADO",
    "detalles": [
      {
        "campo": "Gestaciones previas",
        "valor": "3",
        "puntos": 1,
        "criterio": "2-4 gestaciones"
      },
      {
        "campo": "Cesáreas previas",
        "valor": "1",
        "puntos": 2,
        "criterio": "1 cesárea previa"
      },
      // ... más detalles
    ],
    "sugerencias": [
      "Seguimiento clínico regular",
      "Completar estudios faltantes según protocolo",
      "Valorar necesidad de interconsulta especializada"
    ]
  }
}
```

---

## 🔐 Consideraciones de Seguridad

- ✅ Datos validados en servidor antes de calcular
- ✅ Acceso requiere autenticación (agregar si no existe)
- ✅ Auditoría en tabla `historial_factor_riesgo`
- ✅ Campo JSON para rastreabilidad completa

---

## 🚀 Siguientes Pasos

1. **Migración de BD**: Ejecutar script SQL
2. **Integración en formularios**: Agregar cálculo al guardar datos
3. **UI/Dashboard**: Mostrar scores en tabla de casos
4. **Alertas**: Notificar cuando categoría cambia
5. **Reportes**: Análisis de tendencias de riesgo
6. **ML (futuro)**: Predicción basada en histórico

---

## 📞 Soporte

Para preguntas o mejoras, referirse a:
- `src/lib/factorRiesgo.ts` - Lógica de criterios
- `src/app/api/casos/calcular-factor-riesgo/route.ts` - API
- `src/lib/hooks/useFactorRiesgo.ts` - React hooks
