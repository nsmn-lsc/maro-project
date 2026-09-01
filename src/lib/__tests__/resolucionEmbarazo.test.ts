import { describe, it, expect } from "vitest";
import {
  computeSdgNotation,
  evaluarCicloObstetrico,
} from "../resolucionEmbarazo";

describe("Motor de Resolución de Embarazo y Puerperio (resolucionEmbarazo)", () => {
  describe("1. Notación médica de Semanas de Gestación (SDG)", () => {
    it("debe calcular semanas exactas", () => {
      expect(computeSdgNotation(70)).toBe(10.0); // 10 semanas 0 días
      expect(computeSdgNotation(280)).toBe(40.0); // 40 semanas 0 días
    });

    it("debe calcular semanas y días correctamente (notación punto decimal)", () => {
      expect(computeSdgNotation(73)).toBe(10.3); // 10 semanas 3 días
      expect(computeSdgNotation(76)).toBe(10.6); // 10 semanas 6 días
      expect(computeSdgNotation(77)).toBe(11.0); // 11 semanas 0 días
    });

    it("debe manejar 0 o días negativos", () => {
      expect(computeSdgNotation(0)).toBe(0);
      expect(computeSdgNotation(-5)).toBe(0);
    });
  });

  describe("2. Embarazo Activo y Detección de FPP Vencida (> 40 SDG)", () => {
    it("debe calcular SDG dinámicamente si el embarazo está activo", () => {
      // FUM: 2026-01-01, Consulta: 2026-04-12 (101 días → 14 semanas 3 días)
      const res = evaluarCicloObstetrico({
        fum: "2026-01-01",
        estadoEmbarazo: "activo",
        fechaReferencia: "2026-04-12",
      });

      expect(res.estadoEmbarazo).toBe("activo");
      expect(res.semanasGestacion).toBe(14.3);
      expect(res.esFppVencida).toBe(false);
      expect(res.diasPuerperio).toBeNull();
    });

    it("debe detectar FPP vencida si la paciente sigue activa y supera 40 semanas", () => {
      // FUM: 2025-10-01 (FPP aprox: 2026-07-08), Consulta: 2026-08-01 (>42 semanas)
      const res = evaluarCicloObstetrico({
        fum: "2025-10-01",
        estadoEmbarazo: "activo",
        fechaReferencia: "2026-08-01",
      });

      expect(res.estadoEmbarazo).toBe("activo");
      expect(res.esFppVencida).toBe(true);
      expect(res.diasVencido).toBeGreaterThan(0);
      expect(res.descripcionClinica).toContain("Requiere registro de resolución");
    });
  });

  describe("3. Congelamiento de SDG y Transición a Puerperio", () => {
    it("debe CONGELAR las semanas de gestación al momento del parto aunque pasen los meses", () => {
      // FUM: 2025-10-01, Parto: 2026-07-05 (39 semanas 4 días = 277 días), Fecha actual: 2026-09-01
      const res = evaluarCicloObstetrico({
        fum: "2025-10-01",
        estadoEmbarazo: "puerperio",
        fechaResolucion: "2026-07-05",
        fechaReferencia: "2026-09-01",
      });

      expect(res.estadoEmbarazo).toBe("puerperio");
      expect(res.semanasGestacion).toBe(39.4); // Congelado al parto, NO 48 semanas!
      expect(res.esFppVencida).toBe(false);
    });

    it("debe calcular correctamente los días y etapas de puerperio", () => {
      // Parto: 2026-08-31, Fecha actual: 2026-09-01 (Día 1 -> Puerperio Inmediato)
      const resInmediato = evaluarCicloObstetrico({
        fum: "2025-11-20",
        estadoEmbarazo: "puerperio",
        fechaResolucion: "2026-08-31",
        fechaReferencia: "2026-09-01",
      });
      expect(resInmediato.diasPuerperio).toBe(1);
      expect(resInmediato.etapaPuerperio).toBe("inmediato");

      // Parto: 2026-08-27, Fecha actual: 2026-09-01 (Día 5 -> Puerperio Mediato)
      const resMediato = evaluarCicloObstetrico({
        fum: "2025-11-20",
        estadoEmbarazo: "puerperio",
        fechaResolucion: "2026-08-27",
        fechaReferencia: "2026-09-01",
      });
      expect(resMediato.diasPuerperio).toBe(5);
      expect(resMediato.etapaPuerperio).toBe("mediato");

      // Parto: 2026-08-10, Fecha actual: 2026-09-01 (Día 22 -> Puerperio Tardío)
      const resTardio = evaluarCicloObstetrico({
        fum: "2025-11-20",
        estadoEmbarazo: "puerperio",
        fechaResolucion: "2026-08-10",
        fechaReferencia: "2026-09-01",
      });
      expect(resTardio.diasPuerperio).toBe(22);
      expect(resTardio.etapaPuerperio).toBe("tardio");

      // Parto: 2026-07-01, Fecha actual: 2026-09-01 (Día 62 -> Concluido)
      const resConcluido = evaluarCicloObstetrico({
        fum: "2025-11-20",
        estadoEmbarazo: "concluido",
        fechaResolucion: "2026-07-01",
        fechaReferencia: "2026-09-01",
      });
      expect(resConcluido.diasPuerperio).toBe(62);
      expect(resConcluido.etapaPuerperio).toBe("concluido");
    });
  });
});
