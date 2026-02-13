# Contador de Factor de Riesgo Obstétrico - Implementación Completada

## ✅ Resumen de lo Implementado

Se ha creado un sistema completo de contador de factor de riesgo obstétrico que muestra la sumatoria en tiempo real mientras el usuario completa la captura de datos del nuevo paciente.

## 📁 Archivos Creados/Modificados

### 1. **src/lib/riesgoFactores.ts** (NUEVO - 256 líneas)
Módulo core de evaluación de factor de riesgo para la tabla `pacientes`

**Contenido:**
- `DatosFactoresPaciente`: Interfaz con todos los campos evaluables
- `AlertaFactor`: Interfaz para cada factor detectado
- `ResultadoFactores`: Interfaz con resultado final
- `CRITERIOS`: Objeto con reglas de puntuación exactas para 8 campos:

```typescript
const CRITERIOS = {
  gestas: [
    { rango: [2, 4], puntos: 1 },      // 2-4 gestaciones = 1 punto
    { rango: [5, 100], puntos: 4 }     // ≥5 gestaciones = 4 puntos
  ],
  cesareas: [
    { rango: [2, 100], puntos: 4 }     // ≥2 cesáreas = 4 puntos
  ],
  abortos: [
    { rango: [2, 2], puntos: 2 },      // 2 abortos = 2 puntos
    { rango: [3, 100], puntos: 4 }     // ≥3 abortos = 4 puntos
  ],
  ant_preeclampsia: 4,     // 4 puntos
  ant_hemorragia: 4,       // 4 puntos
  ant_sepsis: 4,           // 4 puntos
  ant_bajo_peso_macrosomia: 4,  // 4 puntos
  ant_muerte_perinatal: 4        // 4 puntos
}
```

**Funciones principales:**
- `evaluarCampoIndividual(campo, valor)`: Evalúa un campo específico
- `evaluarFactoresRiesgo(datos)`: Calcula total, factores y nivel

**Niveles de riesgo:**
- **BAJO**: 0-2 puntos
- **MODERADO**: 3-7 puntos
- **ALTO**: 8+ puntos

### 2. **src/app/components/ContadorFactorRiesgo.tsx** (NUEVO - 150 líneas)
Componente visual que muestra el contador con dos variantes

**Variantes:**
1. **Compacta** (`compact={true}`): Muestra score + nivel en una línea
2. **Completa** (`compact={false}`): Muestra detalles completos con:
   - Puntaje total grande (24px font)
   - Lista de factores detectados
   - Razón de cada factor
   - Nivel con color (verde/amarillo/rojo)
   - Recomendación según nivel

**Colores por nivel:**
- 🟢 BAJO: Verde
- 🟡 MODERADO: Amarillo
- 🔴 ALTO: Rojo

### 3. **src/app/components/ContadorRiesgo.tsx** (NUEVO - 45 líneas)
Contenedor que crea la lógica de conexión entre formulario y visualización

**Características:**
- Recibe datos del formulario (`formData`)
- Convierte strings a números (para gestas, cesareas, abortos)
- Convierte checkboxes a booleanos
- Usa `useMemo` para evitar recálculos innecesarios
- Renderiza `ContadorFactorRiesgo`

### 4. **src/app/pacientes/nuevo/page.tsx** (MODIFICADO)
Página de creación de nuevo paciente

**Cambios:**
- Importa `ContadorRiesgo`
- Inserta componente después de sección "Antecedentes gineco-obstétricos"
- Pasa `formData` del formulario al contador
- El contador se actualiza en tiempo real conforme el usuario llena los campos

## 🔄 Flujo de Datos

```
[Formulario pacientes/nuevo]
         ↓
  [onChange handlers]
         ↓
  [Form state actualiza]
         ↓
  [ContadorRiesgo recibe props]
         ↓
  [useMemo crea DatosFactoresPaciente]
         ↓
  [evaluarFactoresRiesgo() calcula]
         ↓
  [ContadorFactorRiesgo muestra resultado]
```

## 📊 Ejemplo de Uso

**Usuario ingresa:**
- Gestas: 2
- Cesáreas: 0
- Abortos: 0
- Antecedentes: todos FALSE

**Resultado mostrado:**
```
FACTOR DE RIESGO OBSTÉTRICO
        1 puntos
        ✅ BAJO
```

**Usuario ingresa:**
- Gestas: 5
- Cesáreas: 2
- Abortos: 0
- ant_preeclampsia: TRUE

**Resultado mostrado:**
```
FACTOR DE RIESGO OBSTÉTRICO
        12 puntos
        🔴 ALTO

FACTORES IDENTIFICADOS (3):
- Gestaciones ≥5: +4 pts
- Cesáreas ≥2: +4 pts
- Antecedente de preeclampsia: +4 pts

RECOMENDACIÓN:
Requiere evaluación especializada...
```

## ⚙️ Características Técnicas

- **Performance**: `useMemo` previene recálculos
- **TypeScript**: Tipado completo
- **Responsive**: Se adapta a mobile/tablet/desktop
- **Accesible**: Semántica HTML correcta
- **Reactivo**: Updates en tiempo real (sin delay)

## 🎨 Estilos

Usa Tailwind CSS con:
- Colores adaptativos por nivel
- Bordes y fondos semi-transparentes
- Iconos emoji para claridad
- Espaciado responsive

## 🚀 Próximos Pasos

Según tu plan, estos son los siguientes:

1. **Integración en detalles del paciente** (`pacientes/[id]/page.tsx`)
   - Mostrar contador persistente en la página de detalles
   - Cargar datos del paciente desde BD

2. **Añadir campos de cat_pacientes**
   - Extender `CRITERIOS` con nuevos campos
   - Modificar `DatosFactoresPaciente` interface

3. **Añadir campos de evaluaciones_clinicas**
   - Otra extensión de criterios
   - Posiblemente separar en módulo aparte

4. **Persistencia en localStorage**
   - Guardar el score mientras se completa el formulario
   - Recuperarlo al reabrir la página

5. **Base de datos**
   - Almacenar puntaje final en `pacientes` table
   - Crear auditoría de cambios de puntuación

## ✨ Validación

✅ Archivos compilados sin errores
✅ TypeScript con tipos completos
✅ Componentes renderizables
✅ Integración en página de nuevo paciente
✅ Contador se actualiza en tiempo real
✅ Niveles de riesgo correctos

## 📝 Notas

- Todos los campos de la tabla `pacientes` que mencionaste están incluidos
- Las puntuaciones coinciden exactamente con tus especificaciones
- El contador aparecerá entre las secciones "Antecedentes gineco-obstétricos" y "Red de apoyo"
- Es completamente funcional desde ahora - no requiere cambios en BD

¡El sistema está listo para usar en la página de nuevo paciente! 🎉
