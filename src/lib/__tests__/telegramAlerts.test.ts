import { describe, it, expect } from "vitest";
import { parseTelegramDispatchLimit } from "../telegramDispatch";
import { formatRiesgoTelegramMessage } from "../telegramAlerts";

describe("Worker de Despacho de Alertas Telegram", () => {
  describe("parseTelegramDispatchLimit", () => {
    it("debe retornar 20 por defecto si no se pasa valor o es inválido", () => {
      expect(parseTelegramDispatchLimit(undefined)).toBe(20);
      expect(parseTelegramDispatchLimit(null)).toBe(20);
      expect(parseTelegramDispatchLimit("")).toBe(20);
      expect(parseTelegramDispatchLimit("abc")).toBe(20);
      expect(parseTelegramDispatchLimit("-5")).toBe(20);
    });

    it("debe parsear enteros válidos dentro del rango 1 a 100", () => {
      expect(parseTelegramDispatchLimit("1")).toBe(1);
      expect(parseTelegramDispatchLimit("50")).toBe(50);
      expect(parseTelegramDispatchLimit("100")).toBe(100);
    });

    it("debe limitar a un máximo de 100", () => {
      expect(parseTelegramDispatchLimit("150")).toBe(100);
      expect(parseTelegramDispatchLimit("9999")).toBe(100);
    });
  });

  describe("formatRiesgoTelegramMessage", () => {
    it("debe formatear correctamente el mensaje de alerta con folio, unidad y puntaje", () => {
      const msg = formatRiesgoTelegramMessage({
        folio: "CLUES001-005",
        unidad: "Centro de Salud Urbano",
        puntajeTotal: 34,
        fecha: new Date("2026-08-14T15:30:00Z"),
      });

      expect(msg).toContain("ALERTA OBSTETRICA");
      expect(msg).toContain("Folio: CLUES001-005");
      expect(msg).toContain("Unidad: Centro de Salud Urbano");
      expect(msg).toContain("Puntaje total: 34");
      expect(msg).toContain("Fecha:");
    });

    it("debe manejar folios o unidades nulos de forma segura", () => {
      const msg = formatRiesgoTelegramMessage({
        folio: null,
        unidad: null,
        puntajeTotal: 25,
      });

      expect(msg).toContain("Folio: SIN_FOLIO");
      expect(msg).toContain("Unidad: SIN_UNIDAD");
      expect(msg).toContain("Puntaje total: 25");
    });
  });
});
