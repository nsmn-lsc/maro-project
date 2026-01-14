// src/lib/triggers/persistence.ts

export interface EventoEvaluacion {
  fecha: string; // ISO string
  nivel: "VERDE" | "AMBAR" | "ROJO";
  triggerId?: string;
}

// Regla simple y clara:
// - 2 eventos ROJO en cualquier momento → persistencia
// - 1 ROJO + 1 AMBAR del mismo trigger → persistencia
export function evaluarPersistencia(eventos: EventoEvaluacion[]) {
  if (eventos.length < 2) {
    return { persistente: false, motivo: "" };
  }

  const rojos = eventos.filter((e) => e.nivel === "ROJO");
  if (rojos.length >= 2) {
    return {
      persistente: true,
      motivo:
        "Criterio de alto riesgo detectado en más de una evaluación. Riesgo persistente.",
    };
  }

  const porTrigger: Record<string, EventoEvaluacion[]> = {};
  eventos.forEach((e) => {
    if (!e.triggerId) return;
    porTrigger[e.triggerId] = porTrigger[e.triggerId] || [];
    porTrigger[e.triggerId].push(e);
  });

  for (const t in porTrigger) {
    const lista = porTrigger[t];
    const tieneRojo = lista.some((e) => e.nivel === "ROJO");
    const tieneAmbar = lista.some((e) => e.nivel === "AMBAR");
    if (tieneRojo && tieneAmbar) {
      return {
        persistente: true,
        motivo:
          "Criterio de riesgo elevado sostenido en evaluaciones sucesivas.",
      };
    }
  }

  return { persistente: false, motivo: "" };
}
