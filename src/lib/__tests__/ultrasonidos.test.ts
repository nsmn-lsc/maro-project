import { describe, it, expect } from "vitest";
import {
  OPCIONES_ULTRASONIDO,
  esTipoUltrasonidoValido,
  esFechaValida,
  sanitizarDescripcionUSG,
  validarListaUltrasonidos,
  prepararRegistrosUSG,
} from "../ultrasonidos";

describe("Módulo de Ultrasonidos Obstétricos para Ficha Paciente (ultrasonidos.ts)", () => {
  describe("1. Catálogo Oficial de Estudios", () => {
    it("debe contener exactamente los 6 tipos de ultrasonidos requeridos", () => {
      expect(OPCIONES_ULTRASONIDO).toHaveLength(6);
      expect(OPCIONES_ULTRASONIDO).toContain("USG 1er trimestre");
      expect(OPCIONES_ULTRASONIDO).toContain("USG 2o trimestre");
      expect(OPCIONES_ULTRASONIDO).toContain("USG 3er trimestre");
      expect(OPCIONES_ULTRASONIDO).toContain("USG cromosomopatías");
      expect(OPCIONES_ULTRASONIDO).toContain("USG estructural");
      expect(OPCIONES_ULTRASONIDO).toContain("USG Doppler Arterias Uterinas");
    });

    it("debe validar correctamente tipos permitidos e inválidos", () => {
      expect(esTipoUltrasonidoValido("USG 1er trimestre")).toBe(true);
      expect(esTipoUltrasonidoValido("USG Doppler Arterias Uterinas")).toBe(true);
      expect(esTipoUltrasonidoValido("USG 4D no oficial")).toBe(false);
      expect(esTipoUltrasonidoValido("")).toBe(false);
    });

    it("debe validar correctamente el formato de fecha (YYYY-MM-DD)", () => {
      expect(esFechaValida("2026-09-03")).toBe(true);
      expect(esFechaValida("2026-01-15")).toBe(true);
      expect(esFechaValida("03-09-2026")).toBe(false);
      expect(esFechaValida("fecha-invalida")).toBe(false);
      expect(esFechaValida("")).toBe(false);
    });
  });

  describe("2. Sanitización de Descripción (Máximo 100 Caracteres)", () => {
    it("debe recortar espacios iniciales y finales", () => {
      expect(sanitizarDescripcionUSG("  Embrión único vivo  ")).toBe("Embrión único vivo");
    });

    it("debe truncar texto que supere los 100 caracteres exactamente a 100", () => {
      const textoLargo = "A".repeat(120);
      const resultado = sanitizarDescripcionUSG(textoLargo);
      expect(resultado.length).toBe(100);
      expect(resultado).toBe("A".repeat(100));
    });

    it("debe retornar string vacío para valores nulos o indefinidos", () => {
      expect(sanitizarDescripcionUSG(null)).toBe("");
      expect(sanitizarDescripcionUSG(undefined)).toBe("");
      expect(sanitizarDescripcionUSG("")).toBe("");
    });
  });

  describe("3. Validación y Múltiples Estudios por Tipo", () => {
    it("debe permitir múltiples estudios del mismo tipo con distintas fechas", () => {
      const entrada = [
        { tipo: "USG 1er trimestre", fecha_toma_usg: "2026-01-15", descripcion: "LCN 22mm, hematoma" },
        { tipo: "USG 1er trimestre", fecha_toma_usg: "2026-02-10", descripcion: "LCN 45mm, hematoma reabsorbido" },
      ];

      const { validos, errores } = validarListaUltrasonidos(entrada);

      expect(errores).toHaveLength(0);
      expect(validos).toHaveLength(2);
      expect(validos[0].fecha_toma_usg).toBe("2026-01-15");
      expect(validos[1].fecha_toma_usg).toBe("2026-02-10");
    });

    it("debe reportar error para fechas no válidas", () => {
      const entrada = [
        { tipo: "USG estructural", fecha_toma_usg: "invalida", descripcion: "Prueba" },
      ];

      const { validos, errores } = validarListaUltrasonidos(entrada);

      expect(validos).toHaveLength(0);
      expect(errores).toHaveLength(1);
      expect(errores[0]).toContain("Fecha de toma de USG no válida");
    });
  });

  describe("4. Preparación de Registros para Base de Datos (pacientes_ultrasonidos)", () => {
    it("debe mapear correctamente los campos incluyendo paciente_id, fecha_toma_usg y created_by", () => {
      const entrada = [
        { tipo: "USG Doppler Arterias Uterinas", fecha_toma_usg: "2026-09-01", descripcion: "IP promedio 1.1" },
      ];

      const registros = prepararRegistrosUSG(entrada, 42, null, 10);

      expect(registros).toEqual([
        {
          paciente_id: 42,
          consulta_id: null,
          tipo: "USG Doppler Arterias Uterinas",
          fecha_toma_usg: "2026-09-01",
          descripcion: "IP promedio 1.1",
          created_by: 10,
        },
      ]);
    });
  });
});
