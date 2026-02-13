# 🏗️ Arquitectura del Sistema de Factor de Riesgo Obstétrico

## Diagrama de Flujo General

```
┌─────────────────────────────────────────────────────────────────┐
│                    USUARIO EN NAVEGADOR                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    Ingresa datos clínicos
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│           COMPONENTES REACT (Frontend)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Formularios de:                                          │  │
│  │ - Antecedentes obstétricos                              │  │
│  │ - Signos/síntomas de alarma                             │  │
│  │ - Signos vitales                                        │  │
│  │ - Laboratorios                                          │  │
│  │                                                          │  │
│  │ Hooks personalizados:                                   │  │
│  │ - useFactorRiesgo()      (control manual)               │  │
│  │ - useFactorRiesgoAuto()  (auto-cálculo)                │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    1. Guardar datos
                    2. Calcular riesgo
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌──────────────────┐  ┌────────────────┐  ┌────────────────┐
│ API Endpoints    │  │ Cliente API    │  │ Funciones      │
│ (Next.js)        │  │ (@/lib/api)    │  │ Puras (@/lib)  │
│                  │  │                │  │                │
│ POST /api/       │  │ factorRiesgo   │  │calcularFactor  │
│ casos/calcular-  │  │ API.calcular() │  │Riesgo()        │
│ factor-riesgo    │  │                │  │                │
└────────┬─────────┘  └────┬───────────┘  └────┬───────────┘
         │                 │                    │
         └─────────────────┼────────────────────┘
                           │
          ┌────────────────┴────────────────┐
          │ Recopila datos de:              │
          │ 1. Tabla CASOS (edad, gesta...) │
          │ 2. Tabla EVALUACIONES_CLINICAS  │
          └────────────┬─────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │  MOTOR DE CÁLCULO            │
        │  (factorRiesgo.ts)           │
        │                              │
        │ Evalúa 60+ criterios:        │
        │ - Antecedentes (6 puntos)    │
        │ - Demográficos (4 puntos)    │
        │ - Condiciones médicas (12)   │
        │ - Síntomas/alarma (9)        │
        │ - Signos vitales (7)         │
        │ - Laboratorios (6)           │
        └──────────────┬───────────────┘
                       │
              ┌────────▼────────┐
              │ RESULTADO:      │
              │ ├─ puntajeTotal │
              │ ├─ categoría    │
              │ ├─ detalles[]   │
              │ └─ sugerencias[]│
              └────────┬────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
┌─────────────┐ ┌────────────┐ ┌──────────────┐
│ Guardar en  │ │ Mostrar    │ │ Enviar a     │
│ BD (casos)  │ │ en UI      │ │ coordinación │
│             │ │            │ │ si ALTO      │
│ - score     │ │ Factor     │ │              │
│ - categoría │ │ Riesgo     │ │ Alertas      │
│ - timestamp │ │ Resultado  │ │ automáticas  │
│             │ │            │ │              │
│ + Auditoría │ │ Comp.      │ │              │
│   historial │ │            │ │              │
└─────────────┘ └────────────┘ └──────────────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
              Ciclo de vida completado
              El usuario ve:
              - Puntuación (0-100+)
              - Categoría (BAJO/MODERADO/ALTO)
              - Tabla de factores
              - Recomendaciones personalizadas
```

---

## 📦 Estructura de Archivos Creados

```
src/lib/
├── factorRiesgo.ts                    # Motor principal (709 líneas)
│   ├── DatosFactorRiesgo (interface)
│   ├── DetalleFactorRiesgo (interface)
│   ├── ResultadoFactorRiesgo (interface)
│   ├── calcularFactorRiesgo() ......... FUNCIÓN PRINCIPAL
│   └── obtenerCamposActivos()
│
├── api-client.ts                      # Actualizado con
│   └── factorRiesgoAPI = {
│       ├── calcular(casoId)
│       ├── obtener(casoId)
│       └── obtenerHistorial(casoId)
│
├── hooks/
│   └── useFactorRiesgo.ts             # 160 líneas
│       ├── useFactorRiesgo()          # Hook manual
│       └── useFactorRiesgoAuto()      # Hook automático
│
└── __tests__/
    └── factorRiesgo.test.ts           # 45+ pruebas

src/app/
├── api/casos/
│   └── calcular-factor-riesgo/
│       └── route.ts                   # 100 líneas
│
├── components/
│   └── FactorRiesgoResultado.tsx      # Componente visual
│
└── ejemplos/
    ├── ejemplo-factor-riesgo/page.tsx
    └── evaluacion-clinica-con-riesgo/page.tsx

database/migrations/
└── 20260205_add_factor_riesgo_scores.sql

Documentación/
├── FACTOR_RIESGO_GUIDE.md
├── FACTOR_RIESGO_RESUMEN.md
├── FACTOR_RIESGO_INSTALACION.md
└── FACTOR_RIESGO_ARQUITECTURA.md (Este archivo)
```

---

## 🔄 Ciclos de Integración

### Ciclo 1: Formulario → BD → Cálculo → Mostrar

```
Usuario llena     Guardar en      Buscar datos    Motor de     Mostrar
formulario        BD              de BD           cálculo      resultado
    │                 │                │              │           │
    └─ Antecedentes ─►│               │              │           │
    │                 │ evaluaciones_ │              │           │
    ├─ Síntomas ────►│ clinicas      ├─────────────►│           │
    │                 │               │   + datos   │           │
    ├─ Signos vitales►│ + casos       │   del caso  │           │
    │                 │               │             │           │
    └─ Labs ─────────►│               │             │           │
                      │               ├─────────────┤           │
                      │               │ 60+ criterios
                      │               │ Suma puntos │           │
                      │               │ Categoriza  │           │
                      │               │             ├──────────►│
                      │               │             │ JSON:    │
                      │               │             │ puntaje, │
                      │               │             │ detalles,│
                      │               │             │ suger.   │
                      │               │             │          │
                      └───────────────────────────────────────►│
                                                            Guardar
                                                            score en
                                                            casos
```

### Ciclo 2: Recálculo Periódico

```
┌──────────────────────────────────────────────────────┐
│ Cron Job / Trigger (cada 1 hora)                     │
│                                                       │
│ 1. Obtener casos activos                             │
│ 2. Para cada caso:                                   │
│    ├─ Calcular factor de riesgo                      │
│    ├─ Comparar con score anterior                    │
│    ├─ Si cambió categoría: ALERTA                    │
│    └─ Guardar nuevo historial                        │
│                                                       │
│ 3. Notificar coordinadores si ALTO/cambios           │
└──────────────────────────────────────────────────────┘
```

---

## 🧠 Lógica de Puntuación

### Tabla de Puntos por Categoria

```
ANTECEDENTES OBSTÉTRICOS:
├─ Gesta 2-4 ....................... +1
├─ Gesta ≥5 ........................ +4
├─ Cesáreas 1 ...................... +2
├─ Cesáreas ≥2 ..................... +4
├─ Abortos 2 ....................... +2
└─ Abortos ≥3 ...................... +3

DEMOGRÁFICOS:
├─ Edad ≤19 años ................... +2
├─ Edad ≥35 años ................... +3
├─ IMC <18.5 ....................... +1
├─ IMC 30-39.9 ..................... +2
└─ IMC ≥40 ......................... +4

CONDICIONES MÉDICAS:
├─ Embarazo múltiple ............... +4
├─ Preeclampsia previa ............. +4
├─ Hemorragia posparto previa ....... +3
├─ Diabetes previa ................. +3
├─ Diabetes gestacional ............ +2
├─ Hipertensión crónica ............ +3
├─ Cardiopatía ..................... +4
├─ Nefropatía ...................... +3
├─ Epilepsia ....................... +2
└─ VIH positivo .................... +3

SIGNOS/SÍNTOMAS DE ALARMA:
├─ Sangrado vaginal ................ +3
├─ Salida de líquido ............... +2
├─ Dolor abdominal intenso ......... +3
├─ Cefalea severa .................. +3
├─ Fosfenos ........................ +4
├─ Epigastralgia ................... +2
├─ Fiebre .......................... +2
├─ Disnea .......................... +3
└─ Disminución movimientos ......... +3

SIGNOS VITALES:
├─ TA sistólica 140-149 ............ +2
├─ TA sistólica ≥150 .............. +3
├─ TA diastólica 90-99 ............ +2
├─ TA diastólica ≥100 ............ +3
├─ FC <60 o >110 .................. +1
├─ FR ≥25 ......................... +2
├─ SatO₂ <95% ..................... +2
├─ Temp 38.0-38.4°C ............... +1
└─ Temp ≥38.5°C ................... +2

LABORATORIOS:
├─ Plaquetas 100-149 .............. +1
├─ Plaquetas <100 ................. +3
├─ Creatinina >1.2 ................ +2
├─ AST >70 ........................ +2
├─ ALT >70 ........................ +2
├─ Proteinuria 1+ ................. +1
├─ Proteinuria 2+ ................. +2
├─ Proteinuria 3+ ................. +3
└─ Proteinuria 4+ ................. +4

CATEGORIZACIÓN FINAL:
├─ BAJO:     0-9 puntos  ✓ Seguimiento de rutina
├─ MODERADO: 10-19 pts  ⚠️ Evaluación especializada
└─ ALTO:     ≥20 puntos 🔴 Urgencia/Referencia
```

---

## 🔌 Endpoints API

### POST `/api/casos/calcular-factor-riesgo`

**Request:**
```json
{
  "casoId": 123
}
```

**Response (éxito):**
```json
{
  "success": true,
  "casoId": 123,
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

**Response (error):**
```json
{
  "success": false,
  "error": "Caso no encontrado",
  "details": "..."
}
```

---

## 💾 Persistencia en BD

### Tabla: `casos` (Actualizada)
```sql
ALTER TABLE casos ADD COLUMN score_factor_riesgo INT;
ALTER TABLE casos ADD COLUMN categoria_riesgo_factor ENUM('BAJO', 'MODERADO', 'ALTO');
ALTER TABLE casos ADD COLUMN fecha_calculo_factor TIMESTAMP;
ALTER TABLE casos ADD COLUMN detalle_factor_riesgo JSON;
```

### Tabla: `historial_factor_riesgo` (Nueva)
```sql
CREATE TABLE historial_factor_riesgo (
  id INT PRIMARY KEY AUTO_INCREMENT,
  caso_id INT FOREIGN KEY,
  puntaje_total INT,
  categoria ENUM('BAJO', 'MODERADO', 'ALTO'),
  detalles JSON,           -- Array de objetos con factores
  sugerencias JSON,        -- Array de strings
  calculado_por VARCHAR(100),
  created_at TIMESTAMP
);
```

---

## 🧪 Testing

### Unit Tests (40+ pruebas)
```
✓ Antecedentes obstétricos
✓ Factores demográficos
✓ Condiciones médicas
✓ Signos/síntomas
✓ Signos vitales
✓ Laboratorios
✓ Categorización
✓ Casos complejos
✓ Manejo de nulos
```

### Ejecución
```bash
npm test -- factorRiesgo.test.ts
```

---

## 📊 Ejemplo Completo de Cálculo

**Entrada:**
```typescript
{
  gesta: 3,
  cesareasPrevias: 1,
  edad: 38,
  imc: 32,
  antecedentePreeclampsia: false,
  hipertensionCronica: true,
  sangradoVaginal: false,
  sistolica: 145,
  diastolica: 92,
  plaquetas: 140000,
  proteinuriaTira: '1+'
}
```

**Procesamiento:**
```
Gesta 3 (2-4)         → +1
Cesáreas 1            → +2
Edad 38 (≥35)         → +3
IMC 32 (30-39.9)      → +2
TA sistólica 145      → +2
TA diastólica 92      → +2
Plaquetas 140k        → +1
Proteinuria 1+        → +1
Hipertensión crónica  → +3
─────────────────────────
Total = 17 puntos
```

**Salida:**
```json
{
  "puntajeTotal": 17,
  "categoria": "MODERADO",
  "detalles": [...9 objetos...],
  "sugerencias": [
    "Seguimiento clínico regular",
    "Completar estudios faltantes según protocolo",
    "Valorar necesidad de interconsulta especializada"
  ]
}
```

---

## 🚀 Performance

### Optimizaciones incluidas
- ✅ Caché de pool de conexiones MySQL
- ✅ Índices en tablas de historial
- ✅ Query en una sola línea por tabla
- ✅ JSON almacenado para auditoría
- ✅ No requiere cálculos recursivos

### Tiempos esperados
- Cálculo de lógica pura: **< 1ms**
- Consultas a BD: **< 100ms**
- Endpoint completo: **100-200ms**

---

## 🔐 Seguridad

### Validaciones
- ✅ Verifica existencia de caso
- ✅ Valida tipos de datos
- ✅ Sanitiza enums
- ✅ Auditoría completa en historial
- ✅ Error handling granular

### Auditoría
- ✅ Tabla `historial_factor_riesgo` guarda cada cálculo
- ✅ Campo `calculado_por` rastrea quién calculó
- ✅ Timestamp de cada operación
- ✅ JSON con detalles completos

---

## 📈 Escalabilidad

### Preparado para
- ✅ Múltiples casos simultáneos
- ✅ Cálculos periódicos automáticos
- ✅ Reportes masivos
- ✅ Exportación de datos
- ✅ Integración con otros sistemas

---

## 🔄 Flujo de Datos

```
FORMULARIO USUARIO
        ↓
VALIDACIÓN FRONTEND
        ↓
ENVÍO JSON
        ↓
API POST /api/casos/calcular-factor-riesgo
        ↓
VALIDACIÓN BACKEND
        ↓
CONSULTAR TABLA CASOS
        ↓
CONSULTAR EVALUACIONES_CLINICAS
        ↓
CONSTRUIR OBJETO DatosFactorRiesgo
        ↓
LLAMAR calcularFactorRiesgo()
        ↓
EVALUAR 60+ CRITERIOS
        ↓
SUMAR PUNTOS
        ↓
CATEGORIZAR (BAJO/MODERADO/ALTO)
        ↓
GUARDAR EN TABLA CASOS
        ↓
GUARDAR EN HISTORIAL_FACTOR_RIESGO
        ↓
RETORNAR JSON AL FRONTEND
        ↓
MOSTRAR FactorRiesgoResultado
        ↓
USUARIO VE PUNTUACIÓN Y RECOMENDACIONES
```

---

## 🎯 Próximas Mejoras (Futuro)

- [ ] Machine Learning para predicción
- [ ] Integración con alertas push
- [ ] Gráficos de tendencias
- [ ] Comparativas inter-hospitalar
- [ ] Sugerencias adaptadas por región
- [ ] Exportación a PDF
- [ ] Integración con HIS externo

---

## 📞 Referencias

**Código:** `/opt/apps/maro-dev/src/lib/factorRiesgo.ts`
**Tests:** `/opt/apps/maro-dev/src/lib/__tests__/factorRiesgo.test.ts`
**Documentación:** `FACTOR_RIESGO_GUIDE.md`
**Ejemplo:** `http://localhost:3000/ejemplo-factor-riesgo`

