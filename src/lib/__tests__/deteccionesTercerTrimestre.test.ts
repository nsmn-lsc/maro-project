import { describe, it, expect } from "vitest";

// Helper de formateo para visualización en UI
export function formatFechaMostrar(fecha: string | null | undefined): string {
  if (!fecha) return "—";
  const clean = fecha.includes("T") ? fecha.split("T")[0] : fecha;
  const parts = clean.split("-");
  if (parts.length === 3) {
    const [yyyy, mm, dd] = parts;
    if (yyyy && mm && dd && yyyy.length === 4) {
      return `${dd}/${mm}/${yyyy}`;
    }
  }
  return fecha;
}

// Helper para construir el payload de Detecciones del 3er Trimestre con fechas independientes
export function buildDeteccionesT3Payload(form: {
  paciente_id: number;
  prueba_vih_t3?: string | null;
  fecha_vih_t3?: string | null;
  prueba_vdrl_t3?: string | null;
  fecha_vdrl_t3?: string | null;
  prueba_hepatitis_c_t3?: string | null;
  fecha_hepatitis_c_t3?: string | null;
  fecha_deteccion_t3?: string | null;
}) {
  return {
    paciente_id: form.paciente_id,
    prueba_vih_t3: form.prueba_vih_t3 || null,
    fecha_vih_t3: form.fecha_vih_t3 || null,
    prueba_vdrl_t3: form.prueba_vdrl_t3 || null,
    fecha_vdrl_t3: form.fecha_vdrl_t3 || null,
    prueba_hepatitis_c_t3: form.prueba_hepatitis_c_t3 || null,
    fecha_hepatitis_c_t3: form.fecha_hepatitis_c_t3 || null,
    fecha_deteccion_t3: form.fecha_deteccion_t3 || null,
  };
}

// Helper para resolver la fecha efectiva de cada prueba respetando el fallback legacy
export function resolverFechaEfectiva(
  fechaEspecifica: string | null | undefined,
  fechaGeneralLegacy: string | null | undefined
): string {
  const fecha = fechaEspecifica || fechaGeneralLegacy;
  return formatFechaMostrar(fecha);
}

// Helper para evaluar alertas de pruebas reactivas y la leyenda epidemiológica requerida
export const LEYENDA_ALERTA_REACTIVA =
  "Informar inmediatamente a enlace zonal y epidemiologia regional, seguimiento normativo hasta descarte o confirmacion";

export function evaluarAlertaReactiva(detecciones: {
  prueba_vih_t3?: string | null;
  prueba_vdrl_t3?: string | null;
  prueba_hepatitis_c_t3?: string | null;
  prueba_vih?: string | null;
  prueba_vdrl?: string | null;
  prueba_hepatitis_c?: string | null;
}) {
  const reactivas: string[] = [];

  if (detecciones.prueba_vih_t3 === "Reactiva" || detecciones.prueba_vih === "Reactiva") {
    reactivas.push("Prueba VIH");
  }
  if (detecciones.prueba_vdrl_t3 === "Reactiva" || detecciones.prueba_vdrl === "Reactiva") {
    reactivas.push("Prueba VDRL");
  }
  if (detecciones.prueba_hepatitis_c_t3 === "Reactiva" || detecciones.prueba_hepatitis_c === "Reactiva") {
    reactivas.push("Prueba Hepatitis C");
  }

  return {
    esReactiva: reactivas.length > 0,
    pruebasReactivas: reactivas,
    leyendaAlerta: LEYENDA_ALERTA_REACTIVA,
  };
}

describe("Pruebas Unitarias - Detecciones 3er Trimestre y Fechas Independientes", () => {
  describe("Formateo de fechas (formatFechaMostrar)", () => {
    it("debe retornar '—' cuando la fecha es null, undefined o vacía", () => {
      expect(formatFechaMostrar(null)).toBe("—");
      expect(formatFechaMostrar(undefined)).toBe("—");
      expect(formatFechaMostrar("")).toBe("—");
    });

    it("debe formatear correctamente una fecha YYYY-MM-DD a DD/MM/YYYY", () => {
      expect(formatFechaMostrar("2026-09-14")).toBe("14/09/2026");
      expect(formatFechaMostrar("2026-01-05")).toBe("05/01/2026");
    });

    it("debe limpiar correctamente fechas en formato ISO timestamp", () => {
      expect(formatFechaMostrar("2026-09-14T00:00:00.000Z")).toBe("14/09/2026");
    });
  });

  describe("Construcción del Payload de Detecciones (buildDeteccionesT3Payload)", () => {
    it("debe construir un payload limpio asignando null a campos no seleccionados", () => {
      const formInput = {
        paciente_id: 105,
        prueba_vih_t3: "No reactiva",
        fecha_vih_t3: "2026-09-10",
        prueba_vdrl_t3: "",
        fecha_vdrl_t3: "",
      };

      const result = buildDeteccionesT3Payload(formInput);

      expect(result).toEqual({
        paciente_id: 105,
        prueba_vih_t3: "No reactiva",
        fecha_vih_t3: "2026-09-10",
        prueba_vdrl_t3: null,
        fecha_vdrl_t3: null,
        prueba_hepatitis_c_t3: null,
        fecha_hepatitis_c_t3: null,
        fecha_deteccion_t3: null,
      });
    });

    it("debe soportar fechas independientes para cada una de las 3 pruebas en días distintos", () => {
      const formInput = {
        paciente_id: 200,
        prueba_vih_t3: "No reactiva",
        fecha_vih_t3: "2026-09-01",
        prueba_vdrl_t3: "Reactiva",
        fecha_vdrl_t3: "2026-09-05",
        prueba_hepatitis_c_t3: "No reactiva",
        fecha_hepatitis_c_t3: "2026-09-12",
      };

      const result = buildDeteccionesT3Payload(formInput);

      expect(result.fecha_vih_t3).toBe("2026-09-01");
      expect(result.fecha_vdrl_t3).toBe("2026-09-05");
      expect(result.fecha_hepatitis_c_t3).toBe("2026-09-12");
    });
  });

  describe("Resolución y Fallback de Fechas (resolverFechaEfectiva)", () => {
    it("debe dar prioridad a la fecha de toma específica de la prueba sobre la fecha legacy", () => {
      const fechaEspecifica = "2026-09-14";
      const fechaLegacy = "2026-09-01";

      expect(resolverFechaEfectiva(fechaEspecifica, fechaLegacy)).toBe("14/09/2026");
    });

    it("debe usar la fecha legacy si la fecha específica de la prueba no está presente", () => {
      const fechaEspecifica = null;
      const fechaLegacy = "2026-09-01";

      expect(resolverFechaEfectiva(fechaEspecifica, fechaLegacy)).toBe("01/09/2026");
    });

    it("debe retornar '—' si ni la fecha específica ni la fecha legacy están presentes", () => {
      expect(resolverFechaEfectiva(null, null)).toBe("—");
    });
  });

  describe("Evaluación de Alertas de Pruebas Reactivas (evaluarAlertaReactiva)", () => {
    it("debe detectar si ninguna prueba es reactiva y no activar la alerta", () => {
      const deteccionesInput = {
        prueba_vih_t3: "No reactiva",
        prueba_vdrl_t3: "No reactiva",
        prueba_hepatitis_c_t3: "No reactiva",
      };

      const evalResult = evaluarAlertaReactiva(deteccionesInput);
      expect(evalResult.esReactiva).toBe(false);
      expect(evalResult.pruebasReactivas).toEqual([]);
    });

    it("debe activar la alerta epidemiológica con la leyenda exacta cuando alguna prueba es Reactiva", () => {
      const deteccionesInput = {
        prueba_vih_t3: "Reactiva",
        prueba_vdrl_t3: "No reactiva",
        prueba_hepatitis_c_t3: "Reactiva",
      };

      const evalResult = evaluarAlertaReactiva(deteccionesInput);
      expect(evalResult.esReactiva).toBe(true);
      expect(evalResult.pruebasReactivas).toEqual(["Prueba VIH", "Prueba Hepatitis C"]);
      expect(evalResult.leyendaAlerta).toBe(
        "Informar inmediatamente a enlace zonal y epidemiologia regional, seguimiento normativo hasta descarte o confirmacion"
      );
    });
  });
});
