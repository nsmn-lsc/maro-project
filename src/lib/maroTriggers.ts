// src/lib/maroTriggers.ts

// Este archivo es el CEREBRO clínico del sistema MARO
// Aquí se decide:
// - nivel de riesgo
// - si debe colegiarse
// - por qué (motivo explícito)

// Tipos de salida posibles
export type NivelRiesgo = "VERDE" | "AMBAR" | "ROJO";

export interface ResultadoRiesgo {
  nivel: NivelRiesgo;
  colegiar: boolean;
  motivo: string;
}

// Datos mínimos que evalúa el sistema
export interface DatosCaso {
  edad: string;
  semanas: string;
  presion: string; // ej. "160/110"
  diagnostico: string;
}

// Función principal de evaluación
export function evaluarCaso(datos: DatosCaso): ResultadoRiesgo {
  const diagnostico = datos.diagnostico.toLowerCase();

  // Intentamos extraer la presión sistólica
  let sistolica = 0;
  if (datos.presion.includes("/")) {
    sistolica = parseInt(datos.presion.split("/")[0]);
  }

  // 🔴 TRIGGER ROJO 1
  // Hipertensión severa (≥160 sistólica)
  if (sistolica >= 160) {
    return {
      nivel: "ROJO",
      colegiar: true,
      motivo:
        "Presión arterial sistólica ≥160 mmHg. Riesgo materno severo. Requiere colegiación inmediata.",
    };
  }

  // 🔴 TRIGGER ROJO 2
  // Preeclampsia antes de 34 semanas
  const semanas = parseFloat(datos.semanas);
  if (diagnostico.includes("preeclampsia") && semanas > 0 && semanas < 34) {
    return {
      nivel: "ROJO",
      colegiar: true,
      motivo:
        "Preeclampsia con edad gestacional menor a 34 semanas. Alto riesgo materno-fetal.",
    };
  }

  // 🟠 TRIGGER ÁMBAR
  // Diagnóstico hipertensivo sin criterios severos
  if (
    diagnostico.includes("hipertension") ||
    diagnostico.includes("hipertensión")
  ) {
    return {
      nivel: "AMBAR",
      colegiar: false,
      motivo:
        "Trastorno hipertensivo del embarazo sin criterios de severidad. Requiere vigilancia estrecha.",
    };
  }

  // 🟢 VERDE
  return {
    nivel: "VERDE",
    colegiar: false,
    motivo: "Sin criterios actuales de muy alto riesgo. Seguimiento local.",
  };
}
