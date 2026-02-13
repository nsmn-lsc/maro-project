# 🚀 GUÍA RÁPIDA - Cómo Ver el Contador Funcionando

## Paso 1: Abre la Página

En tu navegador, ve a:
```
http://localhost:3000/pacientes/nuevo
```

(Ajusta el puerto si usas otro)

## Paso 2: Baja hasta "Antecedentes gineco-obstétricos"

Encontrarás una sección con estos campos:
- Menarca
- Gestas
- Partos
- Cesáreas
- Abortos
- Checkboxes de antecedentes

## Paso 3: Ingresa Datos y Observa el Contador

**Prueba 1 - Bajo Riesgo:**
```
Gestas: 1
Cesáreas: 0
Abortos: 0
Antecedentes: ✗✗✗✗✗

RESULTADO ESPERADO:
✅ BAJO - 0 puntos
```

**Prueba 2 - Riesgo Moderado:**
```
Gestas: 5
Cesáreas: 0
Abortos: 0
Antecedentes: ✗✗✗✗✗

RESULTADO ESPERADO:
🟡 MODERADO - 4 puntos
(Gestaciones ≥5 = 4 puntos)
```

**Prueba 3 - Alto Riesgo:**
```
Gestas: 6
Cesáreas: 2
Abortos: 3
Preeclampsia: ✓
Hemorragia: ✓
Sepsis: ✓
Bajo peso/macrosomía: ✓
Muerte perinatal: ✓

RESULTADO ESPERADO:
🔴 ALTO - 28 puntos
```

## Paso 4: Observa Características

✅ El contador se actualiza **instantáneamente** conforme escribes  
✅ El color cambia (verde → amarillo → rojo)  
✅ Se listan los factores que elevan el riesgo  
✅ Se muestran puntos por cada factor  
✅ Hay recomendación según el nivel  

## ¿Dónde está el contador?

Está posicionado así en la página:

```
═══════════════════════════════════════════
  NUEVO PACIENTE
═══════════════════════════════════════════

📋 Sección 1: Identificación
   [Nombre] [CURP] [Edad] ...

📋 Sección 2: Ingreso CPN y riesgo
   [FUM] [FPP] [Semanas gestación] ...

📋 Sección 3: Antecedentes gineco-obstétricos
   [Menarca] [Gestas] [Partos] [Cesáreas] [Abortos]
   [☐ Preeclampsia] [☐ Hemorragia] ...

🎯 ← CONTADOR APARECE AQUÍ ←
   [ ✅ FACTOR DE RIESGO ]
   [ 0 puntos - BAJO ]

📋 Sección 4: Red de apoyo y traslado
   [Madrina] [Teléfono] ...

🔘 [Guardar] [Cancelar]
```

## Verificación Técnica

Si tienes dudas de que funciona, abre la **Consola de Desarrollador** (F12):

✅ No hay errores rojos  
✅ No hay warnings de React  
✅ Puedes ver el componente en el inspector  

## Si No Se Ve

1. **¿Hay un componente azul entre secciones?**
   - Sí → Está funcionando ✅
   - No → Revisa la integración

2. **¿Cambia cuando escribes?**
   - Sí → Está vivo ✅
   - No → Revisa los imports

3. **¿Muestra un número?**
   - Sí → Está calculando ✅
   - No → Revisa los datos

## Ejemplos de Puntuación Rápida

| Entrada | Resultado | Nivel |
|---------|-----------|-------|
| Gestas: 1 | 0 pts | 🟢 BAJO |
| Gestas: 2 | 1 pt | 🟢 BAJO |
| Gestas: 5 | 4 pts | 🟡 MODERADO |
| Gestas: 5 + Cesáreas: 2 | 8 pts | 🔴 ALTO |
| + Preeclampsia ✓ | 12 pts | 🔴 ALTO |

## Prueba Completa en 2 Minutos

1. Abre `/pacientes/nuevo` (30 seg)
2. Desplázate a antecedentes (30 seg)
3. Ingresa: Gestas=5, Cesáreas=2 (30 seg)
4. Observa el contador mostrar "🔴 ALTO - 8 puntos" (30 seg)

**Total: 2 minutos para ver todo funcionando.**

---

¡Si todo se ve como se describe, entonces **está funcionando correctamente**! 🎉
