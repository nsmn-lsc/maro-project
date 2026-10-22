import { describe, it, expect } from "vitest";
import {
  clasificarNivelRiesgo,
  buildWhereNivelRiesgo,
  calcularEstadisticasPadrón,
} from "../estatal-riesgo";

describe("Módulo Estatal - Clasificación de los 3 Niveles de Riesgo", () => {
  describe("Rango BAJO (< 4 puntos)", () => {
    it("debe clasificar 0 puntos como BAJO", () => {
      expect(clasificarNivelRiesgo(0)).toBe("BAJO");
    });

    it("debe clasificar 1, 2 y 3 puntos como BAJO", () => {
      expect(clasificarNivelRiesgo(1)).toBe("BAJO");
      expect(clasificarNivelRiesgo(2)).toBe("BAJO");
      expect(clasificarNivelRiesgo(3)).toBe("BAJO");
      expect(clasificarNivelRiesgo(3.9)).toBe("BAJO");
    });

    it("debe manejar valores nulos o indefinidos asignando BAJO por defecto", () => {
      expect(clasificarNivelRiesgo(null)).toBe("BAJO");
      expect(clasificarNivelRiesgo(undefined)).toBe("BAJO");
      expect(clasificarNivelRiesgo(NaN)).toBe("BAJO");
    });
  });

  describe("Rango ALTO (4 a 24 puntos)", () => {
    it("debe clasificar exactamente 4 puntos como ALTO (límite inferior)", () => {
      expect(clasificarNivelRiesgo(4)).toBe("ALTO");
    });

    it("debe clasificar valores intermedios (10, 15, 20) como ALTO", () => {
      expect(clasificarNivelRiesgo(10)).toBe("ALTO");
      expect(clasificarNivelRiesgo(15)).toBe("ALTO");
      expect(clasificarNivelRiesgo(20)).toBe("ALTO");
    });

    it("debe clasificar exactamente 24 puntos como ALTO (límite superior)", () => {
      expect(clasificarNivelRiesgo(24)).toBe("ALTO");
      expect(clasificarNivelRiesgo(24.9)).toBe("ALTO");
    });
  });

  describe("Rango MUY ALTO RIESGO (≥ 25 puntos o criterio clínico)", () => {
    it("debe clasificar exactamente 25 puntos como MUY ALTO", () => {
      expect(clasificarNivelRiesgo(25)).toBe("MUY ALTO");
    });

    it("debe clasificar puntajes superiores a 25 (30, 45, 60) como MUY ALTO", () => {
      expect(clasificarNivelRiesgo(30)).toBe("MUY ALTO");
      expect(clasificarNivelRiesgo(45)).toBe("MUY ALTO");
    });

    it("debe clasificar como MUY ALTO si tiene alerta clínica activa, incluso con puntaje bajo (< 25)", () => {
      // Paciente con 12 puntos pero con criterio de cardiopatía o edad crítica
      expect(clasificarNivelRiesgo(12, true, false)).toBe("MUY ALTO");
      expect(clasificarNivelRiesgo(2, true, false)).toBe("MUY ALTO");
    });

    it("debe clasificar como MUY ALTO si tiene la bandera riesgo_25_plus activa", () => {
      expect(clasificarNivelRiesgo(18, false, true)).toBe("MUY ALTO");
    });
  });
});

describe("Módulo Estatal - Generación de Cláusulas SQL de Filtrado", () => {
  it("debe generar la cláusula para 'muy_alto' filtrando >= 25 o riesgo_25_plus", () => {
    const sql = buildWhereNivelRiesgo("muy_alto");
    expect(sql).toContain("c.riesgo_25_plus, 0) = 1");
    expect(sql).toContain(">= 25");
  });

  it("debe usar 'muy_alto' como valor predeterminado si no se especifica", () => {
    expect(buildWhereNivelRiesgo(undefined)).toBe(buildWhereNivelRiesgo("muy_alto"));
    expect(buildWhereNivelRiesgo("")).toBe(buildWhereNivelRiesgo("muy_alto"));
  });

  it("debe generar la cláusula para 'alto' entre 4 y 24 puntos excluyendo riesgo_25_plus", () => {
    const sql = buildWhereNivelRiesgo("alto");
    expect(sql).toContain(">= 4");
    expect(sql).toContain("<= 24");
    expect(sql).toContain("c.riesgo_25_plus = 0");
  });

  it("debe generar la cláusula para 'bajo' menor a 4 puntos", () => {
    const sql = buildWhereNivelRiesgo("bajo");
    expect(sql).toContain("< 4");
    expect(sql).toContain("c.riesgo_25_plus = 0");
  });

  it("debe devolver cadena vacía para 'todos'", () => {
    expect(buildWhereNivelRiesgo("todos")).toBe("");
  });
});

describe("Módulo Estatal - Cálculo de Métricas y Agregaciones del Padrón", () => {
  it("debe calcular correctamente las estadísticas con un padrón mixto", () => {
    const muestra = [
      // 2 pacientes BAJO (<4)
      { puntaje: 0 },
      { puntaje: 2 },
      // 3 pacientes ALTO (4-24)
      { puntaje: 8 },
      { puntaje: 14 },
      { puntaje: 20 },
      // 2 pacientes MUY ALTO (≥25)
      { puntaje: 26 },
      { puntaje: 34 },
    ];

    const stats = calcularEstadisticasPadrón(muestra);

    expect(stats.total_pacientes).toBe(7);
    expect(stats.conteo_bajo).toBe(2);
    expect(stats.conteo_alto).toBe(3);
    expect(stats.conteo_muy_alto).toBe(2);
    expect(stats.pacientes_riesgo).toBe(2);

    // Promedio global: (0 + 2 + 8 + 14 + 20 + 26 + 34) / 7 = 104 / 7 = 14.857 -> 14.9
    expect(stats.promedio_global).toBe(14.9);

    // Promedio riesgo >=25: (26 + 34) / 2 = 30.0
    expect(stats.promedio_riesgo_25).toBe(30.0);
  });

  it("debe incluir pacientes con alerta clínica en pacientes_riesgo aunque puntaje sea < 25", () => {
    const muestra = [
      { puntaje: 10, alertaClinica: true }, // Clasifica en MUY ALTO por criterio clínico
      { puntaje: 3 }, // BAJO
    ];

    const stats = calcularEstadisticasPadrón(muestra);

    expect(stats.total_pacientes).toBe(2);
    expect(stats.conteo_muy_alto).toBe(1);
    expect(stats.conteo_bajo).toBe(1);
    expect(stats.pacientes_riesgo).toBe(1);
  });

  it("debe manejar listas vacías sin errores", () => {
    const stats = calcularEstadisticasPadrón([]);
    expect(stats.total_pacientes).toBe(0);
    expect(stats.promedio_global).toBe(0);
    expect(stats.promedio_riesgo_25).toBe(0);
    expect(stats.conteo_bajo).toBe(0);
    expect(stats.conteo_alto).toBe(0);
    expect(stats.conteo_muy_alto).toBe(0);
  });
});
