import { describe, it, expect } from "vitest";
import {
  parseDateOnly,
  formatDateOnly,
  formatDate,
  formatFum,
  getTodayLocalString,
  getMinFumDateString,
  evaluarFechasObstetricas,
  pacienteFechasZodSchema,
  consultaFechasZodSchema,
} from "../validations/fechaValidations";

describe("Validaciones de Fechas Obstétricas (FUM, Ingreso CPN, Consulta)", () => {
  describe("parseDateOnly y formatDateOnly (Prevención de desfase horario UTC/Local)", () => {
    it("parsea strings YYYY-MM-DD sin restar un día en husos horarios occidentales", () => {
      const parsed = parseDateOnly("2026-09-22");
      expect(parsed).not.toBeNull();
      expect(parsed?.getUTCFullYear()).toBe(2026);
      expect(parsed?.getUTCMonth()).toBe(8); // 0-indexed: 8 = Septiembre
      expect(parsed?.getUTCDate()).toBe(22);
      expect(formatDateOnly(parsed!)).toBe("2026-09-22");
    });

    it("rechaza fechas inválidas o inexistentes en el calendario", () => {
      expect(parseDateOnly("2026-02-31")).toBeNull();
      expect(parseDateOnly("invalido")).toBeNull();
      expect(parseDateOnly("")).toBeNull();
      expect(parseDateOnly(null)).toBeNull();
    });

    it("obtiene la fecha local de hoy en formato YYYY-MM-DD", () => {
      const today = getTodayLocalString();
      expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("calcula la fecha mínima permitida de FUM (294 días / 42 semanas antes)", () => {
      const minFum = getMinFumDateString("2026-09-22");
      expect(minFum).toBe("2025-12-02");
    });
  });

  describe("evaluarFechasObstetricas", () => {
    it("calcula correctamente SDG al ingreso y FPP para una FUM y fecha de ingreso válidas", () => {
      // 100 días de diferencia = 14 semanas + 2 días = 14.2 SDG
      const res = evaluarFechasObstetricas({
        fum: "2026-01-01",
        fechaIngresoCpn: "2026-04-11", // 100 días
      });

      expect(res.fumValida).toBe(true);
      expect(res.fechaIngresoValida).toBe(true);
      expect(res.errorFum).toBeNull();
      expect(res.errorFechaIngreso).toBeNull();
      expect(res.sdgAlIngresoDecimal).toBe(14.2);
      expect(res.sdgAlIngresoEntero).toBe(14);
      expect(res.fpp).toBe("2026-10-08");
      expect(res.bloquearSubmit).toBe(false);
    });

    it("detecta FUM posterior a la fecha de ingreso (cronología invertida)", () => {
      const res = evaluarFechasObstetricas({
        fum: "2026-06-01",
        fechaIngresoCpn: "2026-05-01",
      });

      expect(res.fechaIngresoValida).toBe(false);
      expect(res.errorFechaIngreso).toContain("La fecha de ingreso a control prenatal no puede ser previa a la FUM");
      expect(res.bloquearSubmit).toBe(true);
    });

    it("detecta FUM en el futuro", () => {
      const res = evaluarFechasObstetricas({
        fum: "2099-01-01",
        fechaIngresoCpn: "2099-02-01",
      });

      expect(res.fumValida).toBe(false);
      expect(res.errorFum).toContain("La FUM no puede ser posterior a la fecha actual");
      expect(res.bloquearSubmit).toBe(true);
    });

    it("detecta FUM > 42 semanas respecto a la consulta/ingreso", () => {
      // 320 días (~45.7 semanas)
      const res = evaluarFechasObstetricas({
        fum: "2025-01-01",
        fechaIngresoCpn: "2025-11-17",
      });

      expect(res.fumValida).toBe(false);
      expect(res.errorFum).toContain("La FUM excede las 42 semanas biológicas de gestación");
      expect(res.bloquearSubmit).toBe(true);
    });

    it("advierte sobre años atípicos en la FUM", () => {
      const res = evaluarFechasObstetricas({
        fum: "2020-01-01",
        fechaIngresoCpn: "2020-02-01",
      });

      expect(res.advertenciaAnoAtipico).toContain("Año de FUM capturado (2020) es atípico");
    });

    it("soporta FUM desconocida con captura manual de SDG", () => {
      const res = evaluarFechasObstetricas({
        fumDesconocida: true,
        fechaIngresoCpn: "2026-09-01",
        sdgManual: "12.4",
      });

      expect(res.fumValida).toBe(true);
      expect(res.errorFum).toBeNull();
      expect(res.sdgAlIngresoDecimal).toBe(12.4);
      expect(res.sdgAlIngresoEntero).toBe(12);
      expect(res.fpp).not.toBeNull();
      expect(res.bloquearSubmit).toBe(false);
    });

    it("bloquea FUM desconocida si SDG manual está fuera de rango clínico", () => {
      const res = evaluarFechasObstetricas({
        fumDesconocida: true,
        fechaIngresoCpn: "2026-09-01",
        sdgManual: "50",
      });

      expect(res.fumValida).toBe(false);
      expect(res.errorFum).toContain("deben estar entre 1.0 y 42.0 SDG");
      expect(res.bloquearSubmit).toBe(true);
    });
  });

  describe("pacienteFechasZodSchema", () => {
    it("valida exitosamente un payload correcto", () => {
      const parsed = pacienteFechasZodSchema.safeParse({
        fecha_ingreso_cpn: "2026-05-10",
        fum: "2026-02-01",
      });

      expect(parsed.success).toBe(true);
    });

    it("falla si fecha_ingreso_cpn es futura", () => {
      const parsed = pacienteFechasZodSchema.safeParse({
        fecha_ingreso_cpn: "2099-01-01",
        fum: "2026-01-01",
      });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const issues = parsed.error.issues;
        expect(issues.some((i) => i.path.includes("fecha_ingreso_cpn"))).toBe(true);
      }
    });

    it("falla si FUM > 42 semanas", () => {
      const parsed = pacienteFechasZodSchema.safeParse({
        fecha_ingreso_cpn: "2026-05-10",
        fum: "2024-01-01",
      });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const issues = parsed.error.issues;
        expect(issues.some((i) => i.path.includes("fum"))).toBe(true);
      }
    });

    it("falla si fecha_ingreso_cpn < FUM", () => {
      const parsed = pacienteFechasZodSchema.safeParse({
        fecha_ingreso_cpn: "2026-01-01",
        fum: "2026-02-01",
      });

      expect(parsed.success).toBe(false);
    });
  });

  describe("consultaFechasZodSchema", () => {
    it("falla si fecha_consulta es anterior a la FUM", () => {
      const parsed = consultaFechasZodSchema.safeParse({
        fecha_consulta: "2026-01-01",
        fum: "2026-02-01",
      });

      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toContain("no puede ser previa a la FUM");
      }
    });
  });

  describe("formatDate y formatFum (Blindaje de renderizado para FUM dudosa / null)", () => {
    it("maneja valores null, undefined o strings vacíos con fallbacks limpios", () => {
      expect(formatDate(null)).toBe("—");
      expect(formatDate(undefined)).toBe("—");
      expect(formatDate("")).toBe("—");
      expect(formatDate(null, "S/D")).toBe("S/D");
      expect(formatFum(null)).toBe("No confiable / Dudosa");
      expect(formatFum(undefined)).toBe("No confiable / Dudosa");
      expect(formatFum("")).toBe("No confiable / Dudosa");
    });

    it("formatea correctamente strings YYYY-MM-DD a DD-MM-YYYY", () => {
      expect(formatDate("2026-05-15")).toBe("15-05-2026");
      expect(formatFum("2026-05-15")).toBe("15-05-2026");
    });

    it("formatea instancias de Date de forma segura", () => {
      const d = new Date(Date.UTC(2026, 8, 22));
      expect(formatDate(d)).toBe("22-09-2026");
    });

    it("maneja fechas inválidas sin lanzar excepciones", () => {
      expect(formatDate("fecha-invalida")).toBe("—");
      expect(formatDate(new Date(NaN))).toBe("—");
    });
  });
});

