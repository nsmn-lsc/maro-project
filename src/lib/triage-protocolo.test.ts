import { describe, it, expect } from "vitest";
import {
  determinarProtocoloTriage,
  evaluarEstadoConciencia,
  evaluarHemorragia,
  evaluarRespiracion,
  evaluarColorPiel,
  MENSAJE_EMERGENCIA_OBSTETRICA,
  MENSAJE_URGENCIA_CALIFICADA,
  AlertaSignoVital,
} from "./triage-protocolo";

describe("Triage Obstétrico - Evaluación de Signos de Alarma", () => {
  describe("Estado de Conciencia", () => {
    it("debe clasificar 'alteraciones' como ROJO (Emergencia Obstétrica)", () => {
      const alerta = evaluarEstadoConciencia("alteraciones");
      expect(alerta).not.toBeNull();
      expect(alerta?.nivel).toBe("ROJO");
      expect(alerta?.campo).toBe("Estado de Conciencia");
      expect(alerta?.descripcion).toContain("Alteración neurológica");
    });

    it("debe clasificar 'conciente' como AMARILLO (Urgencia Calificada)", () => {
      const alerta = evaluarEstadoConciencia("conciente");
      expect(alerta).not.toBeNull();
      expect(alerta?.nivel).toBe("AMARILLO");
      expect(alerta?.descripcion).toBe("Urgencia calificada");
    });

    it("debe retornar null para valores vacíos o no definidos", () => {
      expect(evaluarEstadoConciencia("")).toBeNull();
    });
  });

  describe("Hemorragia", () => {
    it("debe clasificar 'visible o abundante' como ROJO (Emergencia Obstétrica)", () => {
      const alerta = evaluarHemorragia("visible o abundante");
      expect(alerta?.nivel).toBe("ROJO");
      expect(alerta?.descripcion).toBe("Emergencia Obstétrica Activa");
    });

    it("debe clasificar 'no visible o moderada' como AMARILLO (Urgencia calificada)", () => {
      const alerta = evaluarHemorragia("no visible o moderada");
      expect(alerta?.nivel).toBe("AMARILLO");
      expect(alerta?.descripcion).toBe("Urgencia calificada");
    });

    it("debe clasificar 'no visible o escasa' como AMARILLO", () => {
      const alerta = evaluarHemorragia("no visible o escasa");
      expect(alerta?.nivel).toBe("AMARILLO");
      expect(alerta?.descripcion).toBe("Hemorragia detectada");
    });

    it("debe retornar null para 'sin hemorragia'", () => {
      expect(evaluarHemorragia("sin hemorragia")).toBeNull();
    });
  });

  describe("Respiración", () => {
    it("debe clasificar 'alterada' como ROJO (Emergencia Obstétrica)", () => {
      const alerta = evaluarRespiracion("alterada");
      expect(alerta?.nivel).toBe("ROJO");
      expect(alerta?.descripcion).toBe("Emergencia Obstétrica Activa");
    });

    it("debe clasificar 'normal' como AMARILLO (Urgencia calificada)", () => {
      const alerta = evaluarRespiracion("normal");
      expect(alerta?.nivel).toBe("AMARILLO");
      expect(alerta?.descripcion).toBe("Urgencia calificada");
    });
  });

  describe("Color de Piel", () => {
    it("debe clasificar 'cianotica' como ROJO (Hipoxia / Emergencia Obstétrica)", () => {
      const alerta = evaluarColorPiel("cianotica");
      expect(alerta?.nivel).toBe("ROJO");
      expect(alerta?.descripcion).toContain("Emergencia Obstétrica");
    });

    it("debe clasificar 'palida' como AMARILLO (Urgencia calificada)", () => {
      const alerta = evaluarColorPiel("palida");
      expect(alerta?.nivel).toBe("AMARILLO");
      expect(alerta?.descripcion).toBe("Urgencia calificada");
    });

    it("debe retornar null para piel normal", () => {
      expect(evaluarColorPiel("normal")).toBeNull();
    });
  });
});

describe("Determinación del Protocolo Clínico de Actuación", () => {
  it("debe devolver NORMAL cuando no hay alertas activas", () => {
    const alertas: AlertaSignoVital[] = [];
    const resultado = determinarProtocoloTriage(alertas);

    expect(resultado.tipo).toBe("NORMAL");
    expect(resultado.mensaje).toBeNull();
    expect(resultado.tieneEmergenciaObstetrica).toBe(false);
    expect(resultado.tieneUrgenciaCalificada).toBe(false);
  });

  it("debe activar URGENCIA CALIFICADA cuando hay elementos amarillos y ninguno rojo", () => {
    const alertas: AlertaSignoVital[] = [
      {
        campo: "Color de Piel",
        valor: "Pálida",
        nivel: "AMARILLO",
        descripcion: "Urgencia calificada",
      },
      {
        campo: "Estado de Conciencia",
        valor: "Consciente",
        nivel: "AMARILLO",
        descripcion: "Urgencia calificada",
      },
    ];

    const resultado = determinarProtocoloTriage(alertas);

    expect(resultado.tipo).toBe("URGENCIA_CALIFICADA");
    expect(resultado.tieneEmergenciaObstetrica).toBe(false);
    expect(resultado.tieneUrgenciaCalificada).toBe(true);
    expect(resultado.mensaje).toBe(MENSAJE_URGENCIA_CALIFICADA);
    expect(resultado.mensaje).toBe(
      "URGENCIA CALIFICADA: iniciar manejo, notificación inmediata a enlace zonal y referencia segura"
    );
  });

  it("debe activar EMERGENCIA OBSTÉTRICA cuando hay al menos un elemento rojo", () => {
    const alertas: AlertaSignoVital[] = [
      {
        campo: "T/A Sistólica",
        valor: "165 mmHg",
        nivel: "ROJO",
        descripcion: "Emergencia Obstétrica (≤ 89 o ≥ 160 mmHg)",
      },
    ];

    const resultado = determinarProtocoloTriage(alertas);

    expect(resultado.tipo).toBe("EMERGENCIA_OBSTETRICA");
    expect(resultado.tieneEmergenciaObstetrica).toBe(true);
    expect(resultado.tieneUrgenciaCalificada).toBe(false);
    expect(resultado.mensaje).toBe(MENSAJE_EMERGENCIA_OBSTETRICA);
    expect(resultado.mensaje).toBe(
      "EMERGENCIA OBSTÉTRICA: Alerta de manejo inicial, notificación inmediata a enlace zonal y referencia segura"
    );
  });

  it("debe priorizar EMERGENCIA OBSTÉTRICA cuando coinciden alertas rojas y amarillas", () => {
    const alertas: AlertaSignoVital[] = [
      {
        campo: "Color de Piel",
        valor: "Pálida",
        nivel: "AMARILLO",
        descripcion: "Urgencia calificada",
      },
      {
        campo: "Hemorragia",
        valor: "Visible o abundante",
        nivel: "ROJO",
        descripcion: "Emergencia Obstétrica Activa",
      },
      {
        campo: "Respiración",
        valor: "Normal",
        nivel: "AMARILLO",
        descripcion: "Urgencia calificada",
      },
    ];

    const resultado = determinarProtocoloTriage(alertas);

    expect(resultado.tipo).toBe("EMERGENCIA_OBSTETRICA");
    expect(resultado.tieneEmergenciaObstetrica).toBe(true);
    // La presencia de una emergencia obstétrica debe anular la urgencia calificada
    expect(resultado.tieneUrgenciaCalificada).toBe(false);
    expect(resultado.mensaje).toBe(MENSAJE_EMERGENCIA_OBSTETRICA);
  });
});
