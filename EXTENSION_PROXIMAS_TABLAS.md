# Guía para Extender el Contador - Próximas Tablas

Cuando estés listo, seguiremos estos pasos para añadir campos de `cat_pacientes` y `evaluaciones_clinicas`.

## 📋 Plan de Extensión

### Fase 1 ✅ COMPLETADA - PACIENTES
```
✅ 8 campos definidos y funcionando
✅ Contador en pacientes/nuevo
✅ Sistema funcionando en tiempo real
```

### Fase 2 ⏳ PENDIENTE - CAT_PACIENTES
Cuando proporciones los campos y criterios de `cat_pacientes`:

```typescript
// Ejemplo de cómo se vería la extensión:
const CRITERIOS_CAT_PACIENTES = {
  imc: [
    { rango: [18.5, 24.9], puntos: 0, razon: "..." },
    { rango: [25, 29.9], puntos: 1, razon: "..." },
    // ... más rangos
  ],
  // ... más campos
}
```

### Fase 3 ⏳ PENDIENTE - EVALUACIONES_CLINICAS
Cuando proporciones los campos de las evaluaciones clínicas:

```typescript
// Los campos se evaluarían durante consultas
// Podrían ser signos vitales, síntomas, etc.
```

## 🔄 Cómo Agregar Nueva Tabla

### Paso 1: Me Proporcionas los Datos

Necesitaré:
1. **Nombre del campo** (en BD)
2. **Tipo de datos** (número, booleano, string)
3. **Rango/Condición de riesgo** (ej: "≥140" o "presente")
4. **Puntos asignados** (número)
5. **Razón/descripción** (para mostrar en el contador)

**Ejemplo perfecto:**
```
Campo: edad_madre
Tipo: número
Riesgo: <20 años O ≥35 años
Puntos: 2 si <20, 3 si ≥35
Razón: "Edad materna extrema"
```

### Paso 2: Actualizar Interface

```typescript
// src/lib/riesgoFactores.ts

export interface DatosFactoresPaciente {
  // ... campos existentes ...
  
  // NUEVOS CAMPOS CAT_PACIENTES
  edad_madre?: number;
  peso_pregestacional?: number;
  // ... más campos
}
```

### Paso 3: Extender CRITERIOS

```typescript
const CRITERIOS = {
  // ... criterios existentes ...
  
  edad_madre: [
    { rango: [10, 19], puntos: 2, razon: "Edad materna <20 años" },
    { rango: [35, 100], puntos: 3, razon: "Edad materna ≥35 años" }
  ],
  peso_pregestacional: [
    { rango: [40, 50], puntos: 1, razon: "Peso bajo" },
    { rango: [90, 100], puntos: 2, razon: "Sobrepeso" }
  ]
}
```

### Paso 4: Actualizar Componente de Datos

```typescript
// src/app/components/ContadorRiesgo.tsx

const datosFactores: DatosFactoresPaciente = useMemo(() => ({
  // ... campos existentes ...
  
  // NUEVOS CAMPOS
  edad_madre: formData.edad_madre ? parseInt(formData.edad_madre) : 0,
  peso_pregestacional: formData.peso_pregestacional ? 
    parseFloat(formData.peso_pregestacional) : 0,
}), [
  // ... dependencias existentes ...
  formData.edad_madre,
  formData.peso_pregestacional
])
```

### Paso 5: Actualizar Formulario

Añade los nuevos campos en el formulario donde correspondan:

```typescript
// En pacientes/nuevo/page.tsx o donde se capture

const [form, setForm] = useState({
  // ... campos existentes ...
  
  // NUEVOS CAMPOS
  edad_madre: "",
  peso_pregestacional: "",
})
```

## 📊 Estructura para cat_pacientes (Estimado)

Cuando des los criterios, probablemente incluirán:

```
Posibles campos:
- IMC pregestacional
- Peso pregestacional
- Edad al embarazo
- Comorbilidades
- Medicamentos actuales
- Antecedentes médicos
- Estado vacunal
- Infecciones previas
```

## 📝 Campos para evaluaciones_clinicas

Probablemente sean signos que se capturan durante consultas:

```
Posibles campos:
- Presión arterial (sistólica/diastólica)
- Peso actual
- Edema (grado)
- Proteinuria
- Glucosuria
- Frecuencia cardíaca fetal
- Contracciones uterinas
- Altura uterina
- Reflejos osteotendinosos
```

## 🎯 Próximo Paso

**Solo debo proporcionar:**

Para CADA CAMPO nuevo, dame:

```
NOMBRE: _________________
TIPO: número / booleano / texto
VALORES DE RIESGO: _________________
PUNTOS: _________________
RAZÓN: _________________
```

**Ejemplo listo para copiar:**
```
NOMBRE: edad_gestacional
TIPO: número
VALORES DE RIESGO: <20 semanas O >42 semanas
PUNTOS: 3
RAZÓN: "Edad gestacional extrema"

NOMBRE: presion_sistolica
TIPO: número  
VALORES DE RIESGO: <90 O >=160
PUNTOS: 3 si <90, 4 si >=160
RAZÓN: "Presión arterial anormal"

NOMBRE: tiene_diabetes_gestacional
TIPO: booleano
VALORES DE RIESGO: verdadero
PUNTOS: 4
RAZÓN: "Diagnóstico de diabetes gestacional"
```

## 🚀 Ventajas del Sistema Extensible

✅ Modular: Cada tabla es independiente  
✅ Escalable: Fácil añadir nuevos campos  
✅ Mantenible: Cambios centralizados  
✅ Testeable: Cada evaluación es función pura  
✅ Performante: useMemo evita recálculos  
✅ Tipo-seguro: TypeScript completo  

## 📌 Timeline Sugerido

1. **Ahora**: Validar que pacientes/nuevo funciona bien ✅
2. **Próximo**: Proporcionar campos de cat_pacientes
3. **Después**: Proporcionar campos de evaluaciones_clinicas
4. **Final**: Extender a otras tablas si es necesario

## ❓ Preguntas Frecuentes

**P: ¿Los campos de cat_pacientes se capturan en mismo formulario?**
A: Sí, todo puede ser en una página, pero podemos separarlo si prefieres.

**P: ¿El contador se reinicia entre páginas?**
A: Sí por ahora, pero podemos hacer que persista en localStorage.

**P: ¿Puedo tener criterios complejos (ej: rango + otros valores)?**
A: Sí, podemos hacer reglas más complejas con JavaScript.

**P: ¿Qué pasa si falta un campo?**
A: El sistema lo ignora automáticamente (es opcional).

---

**¡Cuando tengas los siguientes campos, los integro rápidamente!**
