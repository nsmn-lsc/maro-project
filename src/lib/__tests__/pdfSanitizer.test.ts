import { describe, it, expect } from "vitest";
import { sanitizePdfText } from "../pdfSanitizer";

describe("sanitizePdfText", () => {
  it("debe reemplazar el símbolo ≥ por >=", () => {
    expect(sanitizePdfText("Puntaje ≥ 25")).toBe("Puntaje >= 25");
    expect(sanitizePdfText("TOTAL: 34 PTS (ALTO RIESGO / CRÍTICO ≥ 25)")).toBe(
      "TOTAL: 34 PTS (ALTO RIESGO / CRÍTICO >= 25)"
    );
  });

  it("debe reemplazar el símbolo ≤ por <=", () => {
    expect(sanitizePdfText("Semana ≤ 12")).toBe("Semana <= 12");
  });

  it("debe reemplazar guiones largos (em-dash y en-dash) por guiones normales", () => {
    expect(sanitizePdfText("CLUES: HGIMB001 — Región: Centro")).toBe("CLUES: HGIMB001 - Región: Centro");
    expect(sanitizePdfText("—")).toBe("-");
  });

  it("debe reemplazar viñetas y grados", () => {
    expect(sanitizePdfText("• Sin acciones")).toBe("* Sin acciones");
    expect(sanitizePdfText("37.5°C")).toBe("37.5oC");
  });

  it("debe reemplazar superíndices como ² y ³", () => {
    expect(sanitizePdfText("IMC 32.4 kg/m²")).toBe("IMC 32.4 kg/m2");
  });

  it("debe preservar caracteres en español válidos en WinAnsi", () => {
    expect(sanitizePdfText("Cédula Médica de Atención y Evaluación Obstétrica")).toBe(
      "Cédula Médica de Atención y Evaluación Obstétrica"
    );
    expect(sanitizePdfText("Años, Niño, ¿Pregunta?, ¡Atención!")).toBe(
      "Años, Niño, ¿Pregunta?, ¡Atención!"
    );
  });

  it("debe manejar valores nulos y undefined de forma segura", () => {
    expect(sanitizePdfText(null)).toBe("");
    expect(sanitizePdfText(undefined)).toBe("");
    expect(sanitizePdfText(123)).toBe("123");
  });
});
