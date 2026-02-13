# Ejemplo Visual del Contador de Riesgo

## 📊 Vista en la Página de Nuevo Paciente

El contador aparecerá en el formulario de `pacientes/nuevo` entre las secciones:

```
┌─────────────────────────────────────────────────────────────┐
│ Antecedentes gineco-obstétricos                             │
│                                                              │
│ [Menarca] [Gestas] [Partos] [Cesáreas] [Abortos]            │
│ [☐ Preeclampsia] [☐ Hemorragia] [☐ Sepsis]                │
│ [☐ Bajo peso/macrosomía] [☐ Muerte perinatal]              │
└─────────────────────────────────────────────────────────────┘
                           ↓
    ╔═════════════════════════════════════════════════╗
    ║  ✅ FACTOR DE RIESGO OBSTÉTRICO               ║
    ║                                                 ║
    ║         Puntaje: 1 puntos                       ║
    ║                                                 ║
    ║  ✅ BAJO  → Seguimiento normal                  ║
    ║                                                 ║
    ║  Factores identificados:                        ║
    ║  • Gestaciones 2-4: +1 pt                       ║
    ║    "Multiparidad normal"                        ║
    ╚═════════════════════════════════════════════════╝
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Red de apoyo y traslado                                      │
│                                                              │
│ [Madrina] [Teléfono] [Mecanismo de traslado]               │
└─────────────────────────────────────────────────────────────┘
```

## 🎨 Estados del Contador

### Estado 1: BAJO RIESGO (0-2 puntos)
```
╔════════════════════════════════════════╗
║  ✅ FACTOR DE RIESGO OBSTÉTRICO       ║
║                                        ║
║         Puntaje: 0 puntos              ║
║                                        ║
║  ✅ BAJO  → Seguimiento normal         ║
║                                        ║
║  ✅ Sin factores de riesgo detectados  ║
║     Antecedentes normales              ║
║                                        ║
║  RECOMENDACIÓN:                        ║
║  Continuar con control prenatal de     ║
║  rutina. Vigilar aparición de nuevos   ║
║  síntomas.                             ║
╚════════════════════════════════════════╝
```

### Estado 2: RIESGO MODERADO (3-7 puntos)
```
╔════════════════════════════════════════╗
║  ⚠️ FACTOR DE RIESGO OBSTÉTRICO       ║
║                                        ║
║         Puntaje: 5 puntos              ║
║                                        ║
║  ⚠️ MODERADO  → Vigilancia especial    ║
║                                        ║
║  FACTORES IDENTIFICADOS (2):           ║
║                                        ║
║  • Gestaciones ≥5                      ║
║    "Gran multiparidad (alto riesgo)"   ║
║    +4 pts                              ║
║                                        ║
║  • RN bajo peso/macrosomía             ║
║    "Antecedente de complicación        ║
║     neonatal"                          ║
║    +1 pt                               ║
║                                        ║
║  RECOMENDACIÓN:                        ║
║  Incrementar frecuencia de vigilancia. ║
║  Considerar interconsulta si factores  ║
║  empeoran.                             ║
╚════════════════════════════════════════╝
```

### Estado 3: ALTO RIESGO (8+ puntos)
```
╔════════════════════════════════════════╗
║  🔴 FACTOR DE RIESGO OBSTÉTRICO       ║
║                                        ║
║         Puntaje: 16 puntos             ║
║                                        ║
║  🔴 ALTO  → Requiere evaluación       ║
║           especializada                ║
║                                        ║
║  FACTORES IDENTIFICADOS (5):           ║
║                                        ║
║  • Gestaciones ≥5                      ║
║    "Gran multiparidad"                 ║
║    +4 pts                              ║
║                                        ║
║  • Cesáreas ≥2                         ║
║    "Cicatrices uterinas múltiples"     ║
║    +4 pts                              ║
║                                        ║
║  • Antecedente de preeclampsia         ║
║    "Riesgo de recurrencia"             ║
║    +4 pts                              ║
║                                        ║
║  • Antecedente de hemorragia           ║
║    "Predisposición a sangrado"         ║
║    +4 pts                              ║
║                                        ║
║  TOTAL: 16 puntos                      ║
║                                        ║
║  RECOMENDACIÓN:                        ║
║  Requiere evaluación especializada.    ║
║  Coordinar con nivel de atención       ║
║  superior si es necesario.             ║
╚════════════════════════════════════════╝
```

## 📱 Versión Compacta

Para mostrar en resúmenes o barras laterales:

```
╔══════════════════════════════════════╗
║  FACTOR DE RIESGO    │  ⚠️ MODERADO  ║
║  5 puntos            │  →Vigilancia  ║
╚══════════════════════════════════════╝
```

## ⚡ Interactividad en Tiempo Real

**Mientras el usuario escribe:**

```
1️⃣ Usuario ingresa "Gestas: 2"
   ↓ Contador actualiza → 1 punto (BAJO)

2️⃣ Usuario ingresa "Cesáreas: 2"
   ↓ Contador actualiza → 5 puntos (MODERADO)

3️⃣ Usuario marca "Preeclampsia: ✓"
   ↓ Contador actualiza → 9 puntos (ALTO)

4️⃣ Usuario limpia "Cesáreas: 0"
   ↓ Contador actualiza → 5 puntos (MODERADO)
```

## 📋 Tabla de Puntuaciones

| Campo | Condición | Puntos |
|-------|-----------|--------|
| Gestas | 2-4 | 1 |
| Gestas | ≥5 | 4 |
| Cesáreas | ≥2 | 4 |
| Abortos | 2 | 2 |
| Abortos | ≥3 | 4 |
| Preeclampsia | Presente | 4 |
| Hemorragia | Presente | 4 |
| Sepsis | Presente | 4 |
| Bajo peso/Macrosomía | Presente | 4 |
| Muerte perinatal | Presente | 4 |

## 🎯 Casos de Uso

### Caso 1: Paciente Joven, Primigesta
```
Gestas: 1, Cesáreas: 0, Abortos: 0, Antecedentes: ✗✗✗✗✗
→ 0 PUNTOS → 🟢 BAJO
```

### Caso 2: Gran Multípara
```
Gestas: 6, Cesáreas: 0, Abortos: 1, Antecedentes: ✗✗✗✗✗
→ 4 PUNTOS → 🟡 MODERADO
```

### Caso 3: Paciente de Alto Riesgo
```
Gestas: 8, Cesáreas: 3, Abortos: 3
Preeclampsia: ✓, Hemorragia: ✓, Sepsis: ✓
→ 18 PUNTOS → 🔴 ALTO
```

## 🔗 Ubicación en el Formulario

El contador aparecerá exactamente aquí en `/pacientes/nuevo`:

1. Identificación
2. Ingreso CPN y riesgo
3. **Antecedentes gineco-obstétricos** ← Sección que dispara el contador
4. **← CONTADOR APARECE AQUÍ ← Recalcula automáticamente**
5. Red de apoyo y traslado
6. Botones [Guardar] [Cancelar]

---

**¡El contador está vivo y funcionando! Actualiza automáticamente conforme cambias los campos.**
