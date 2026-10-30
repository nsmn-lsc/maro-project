import { describe, it, expect } from "vitest";
import {
  calcularDiasDesdeRegistro,
  calcularEstadoSeguimiento,
  validarSeguimientoRegional,
  esPacienteCandidatoSeguimiento,
  PLAZO_SEGUIMIENTO_REGIONAL_DIAS,
  PLAZO_MAX_CONSULTA_EXTERNA_DIAS,
  MAX_ACCIONES_GENERALES_LENGTH,
} from "../seguimiento-regional";

describe("Seguimiento Regional de Riesgo > 25 pts", () => {
  describe("esPacienteCandidatoSeguimiento", () => {
    it("identifica como candidato a pacientes con puntaje > 25 o >= 25", () => {
      expect(esPacienteCandidatoSeguimiento(26)).toBe(true);
      expect(esPacienteCandidatoSeguimiento(25)).toBe(true);
      expect(esPacienteCandidatoSeguimiento(30)).toBe(true);
    });

    it("identifica como candidato si riesgo_25_plus es 1", () => {
      expect(esPacienteCandidatoSeguimiento(20, 1)).toBe(true);
      expect(esPacienteCandidatoSeguimiento(15, true)).toBe(true);
    });

    it("no es candidato si puntaje < 25 y sin bandera activa", () => {
      expect(esPacienteCandidatoSeguimiento(24)).toBe(false);
      expect(esPacienteCandidatoSeguimiento(0)).toBe(false);
      expect(esPacienteCandidatoSeguimiento(null)).toBe(false);
    });
  });

  describe("calcularDiasDesdeRegistro y calcularEstadoSeguimiento", () => {
    it("calcula correctamente los días transcurridos", () => {
      const fechaReg = "2026-10-01";
      const fechaActual = new Date("2026-10-05T12:00:00");
      expect(calcularDiasDesdeRegistro(fechaReg, fechaActual)).toBe(4);
    });

    it("devuelve estado COMPLETADO si ya tiene seguimiento registrado", () => {
      const res = calcularEstadoSeguimiento({
        tieneSeguimiento: true,
        fechaRegistro: "2026-10-01",
        fechaActual: new Date("2026-10-15T00:00:00"),
      });
      expect(res.estado).toBe("COMPLETADO");
      expect(res.alertaEstatalActiva).toBe(false);
    });

    it("devuelve EN_PLAZO y alertaEstatalActiva=false si días <= 7", () => {
      const res = calcularEstadoSeguimiento({
        tieneSeguimiento: false,
        fechaRegistro: "2026-10-10",
        fechaActual: new Date("2026-10-15T00:00:00"), // 5 días transcurridos
      });
      expect(res.estado).toBe("EN_PLAZO");
      expect(res.diasTranscurridos).toBe(5);
      expect(res.diasRestantes).toBe(2);
      expect(res.alertaEstatalActiva).toBe(false);
    });

    it("devuelve VENCIDO y alertaEstatalActiva=true si días > 7", () => {
      const res = calcularEstadoSeguimiento({
        tieneSeguimiento: false,
        fechaRegistro: "2026-10-01",
        fechaActual: new Date("2026-10-10T00:00:00"), // 9 días transcurridos (> 7)
      });
      expect(res.estado).toBe("VENCIDO");
      expect(res.diasTranscurridos).toBe(9);
      expect(res.diasRestantes).toBe(0);
      expect(res.alertaEstatalActiva).toBe(true);
    });

    it("el día 7 exacto sigue en plazo", () => {
      const res = calcularEstadoSeguimiento({
        tieneSeguimiento: false,
        fechaRegistro: "2026-10-01",
        fechaActual: new Date("2026-10-08T00:00:00"), // exactamente 7 días
      });
      expect(res.estado).toBe("EN_PLAZO");
      expect(res.diasTranscurridos).toBe(7);
      expect(res.diasRestantes).toBe(0);
      expect(res.alertaEstatalActiva).toBe(false);
    });

    it("el día 8 entra en alerta estatal por vencimiento", () => {
      const res = calcularEstadoSeguimiento({
        tieneSeguimiento: false,
        fechaRegistro: "2026-10-01",
        fechaActual: new Date("2026-10-09T00:00:00"), // 8 días
      });
      expect(res.estado).toBe("VENCIDO");
      expect(res.alertaEstatalActiva).toBe(true);
    });
  });

  describe("validarSeguimientoRegional", () => {
    const fechaRegistroValida = "2026-10-01";

    it("valida exitosamente un plan de seguimiento regional correcto", () => {
      const payload = {
        fecha_consulta_externa: "2026-10-20", // 19 días después (<= 30)
        fecha_laboratorios: "2026-10-15", // antes de la consulta externa
        acciones_generales: "Se gestionó cita en segundo nivel para gineco-obstetricia y perfil toxémico.",
      };

      const res = validarSeguimientoRegional(payload, fechaRegistroValida);
      expect(res.valido).toBe(true);
      expect(res.errores).toHaveLength(0);
    });

    it("acepta que laboratorios y consulta externa sean el mismo día", () => {
      const payload = {
        fecha_consulta_externa: "2026-10-10",
        fecha_laboratorios: "2026-10-10",
        acciones_generales: "Laboratorios matutinos y valoración posterior.",
      };

      const res = validarSeguimientoRegional(payload, fechaRegistroValida);
      expect(res.valido).toBe(true);
    });

    it("rechaza si la consulta externa excede los 30 días posteriores al registro", () => {
      const payload = {
        fecha_consulta_externa: "2026-11-05", // 35 días después
        fecha_laboratorios: "2026-10-20",
        acciones_generales: "Cita programada tardía.",
      };

      const res = validarSeguimientoRegional(payload, fechaRegistroValida);
      expect(res.valido).toBe(false);
      expect(res.errores.some((e) => e.includes("no puede ser mayor a 30 días"))).toBe(true);
    });

    it("rechaza si la fecha de laboratorios es posterior a la consulta externa", () => {
      const payload = {
        fecha_consulta_externa: "2026-10-15",
        fecha_laboratorios: "2026-10-20", // ¡Posterior a la consulta externa!
        acciones_generales: "Laboratorios programados después de la consulta.",
      };

      const res = validarSeguimientoRegional(payload, fechaRegistroValida);
      expect(res.valido).toBe(false);
      expect(res.errores.some((e) => e.includes("debe ser previa o simultánea"))).toBe(true);
    });

    it("rechaza si alguna fecha es anterior a la fecha de registro", () => {
      const payload = {
        fecha_consulta_externa: "2026-09-25", // anterior al registro
        fecha_laboratorios: "2026-09-20",
        acciones_generales: "Fechas inválidas retroactivas.",
      };

      const res = validarSeguimientoRegional(payload, fechaRegistroValida);
      expect(res.valido).toBe(false);
      expect(res.errores.some((e) => e.includes("no puede ser anterior a la fecha de registro"))).toBe(true);
    });

    it("rechaza si las acciones generales exceden los 500 caracteres", () => {
      const payload = {
        fecha_consulta_externa: "2026-10-20",
        fecha_laboratorios: "2026-10-15",
        acciones_generales: "A".repeat(501),
      };

      const res = validarSeguimientoRegional(payload, fechaRegistroValida);
      expect(res.valido).toBe(false);
      expect(res.errores.some((e) => e.includes("no pueden exceder los 500 caracteres"))).toBe(true);
    });

    it("acepta exactamente 500 caracteres en acciones generales", () => {
      const payload = {
        fecha_consulta_externa: "2026-10-20",
        fecha_laboratorios: "2026-10-15",
        acciones_generales: "A".repeat(500),
      };

      const res = validarSeguimientoRegional(payload, fechaRegistroValida);
      expect(res.valido).toBe(true);
    });

    it("rechaza si faltan campos obligatorios", () => {
      const payload = {};
      const res = validarSeguimientoRegional(payload, fechaRegistroValida);
      expect(res.valido).toBe(false);
      expect(res.errores.length).toBeGreaterThanOrEqual(3);
    });
  });
});
