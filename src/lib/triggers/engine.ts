// src/lib/triggers/engine.ts

import { ExplicacionAutomatica } from "@/lib/store/maroStore";

/* ============================
   TIPOS DE RESPUESTA
============================ */

export interface ResultadoEvaluacion {
  nivel: "VERDE" | "AMBAR" | "ROJO";
  colegiar: boolean;
  explicacion: string;
  explicacionesAutomaticas?: ExplicacionAutomatica[];
}

/* ============================
   MOTOR DE EVALUACIÓN
============================ */

export function evaluarCasoConFundamento(params: {
  semanas: number;
  diagnostico?: string;
  pesoKg?: number;
}): ResultadoEvaluacion {
  const { semanas, pesoKg } = params;

  // 🔐 Blindaje absoluto de strings
  const dx = (params.diagnostico || "").toLowerCase();

  /* ============================
     REGLAS ROJAS (COLEGIAR SÍ O SÍ)
  ============================ */

  if (dx.includes("preeclampsia")) {
    return {
      nivel: "ROJO",
      colegiar: true,
      explicacion:
        "Sospecha clínica de preeclampsia. Requiere valoración colegiada inmediata.",
      explicacionesAutomaticas: [
        {
          dato: "Diagnóstico",
          interpretacion:
            "La sospecha de preeclampsia amerita evaluación especializada independientemente de cifras aisladas.",
          fuentes: [
            {
              organismo: "ACOG",
              referencia: "Practice Bulletin No. 222, 2020",
            },
            {
              organismo: "FIGO",
              referencia: "Guidelines on Preeclampsia, 2019",
            },
          ],
        },
      ],
    };
  }

  if (dx.includes("eclampsia")) {
    return {
      nivel: "ROJO",
      colegiar: true,
      explicacion:
        "Diagnóstico de eclampsia. Emergencia obstétrica que requiere manejo en segundo o tercer nivel.",
      explicacionesAutomaticas: [
        {
          dato: "Diagnóstico",
          interpretacion:
            "La eclampsia es una urgencia obstétrica mayor que requiere manejo especializado.",
          fuentes: [
            {
              organismo: "OMS",
              referencia: "WHO recommendations on maternal health, 2015",
            },
          ],
        },
      ],
    };
  }

  /* ============================
     REGLAS ÁMBAR (ALTO RIESGO)
  ============================ */

  if (semanas >= 28 && pesoKg !== undefined && pesoKg >= 90) {
    return {
      nivel: "AMBAR",
      colegiar: true,
      explicacion:
        "Gestación avanzada con obesidad materna. Riesgo obstétrico incrementado.",
      explicacionesAutomaticas: [
        {
          dato: "Peso materno",
          interpretacion:
            "La obesidad materna incrementa el riesgo de complicaciones hipertensivas y perinatales.",
          fuentes: [
            {
              organismo: "OMS",
              referencia: "Obesity and overweight – Fact sheet",
            },
            {
              organismo: "ACOG",
              referencia: "Obesity in Pregnancy, Committee Opinion",
            },
          ],
        },
      ],
    };
  }

  if (dx.includes("diabetes")) {
    return {
      nivel: "AMBAR",
      colegiar: true,
      explicacion:
        "Diabetes durante el embarazo. Requiere seguimiento especializado.",
      explicacionesAutomaticas: [
        {
          dato: "Diagnóstico",
          interpretacion:
            "La diabetes gestacional o pregestacional incrementa el riesgo materno-fetal.",
          fuentes: [
            {
              organismo: "NOM",
              referencia: "NOM-015-SSA2-2010",
            },
          ],
        },
      ],
    };
  }

  /* ============================
     REGLAS VERDES (SEGUIMIENTO LOCAL)
  ============================ */

  return {
    nivel: "VERDE",
    colegiar: false,
    explicacion:
      "Sin criterios mayores de riesgo inmediato. Continuar seguimiento local.",
  };
}
