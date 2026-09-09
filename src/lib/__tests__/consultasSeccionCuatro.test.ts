import { describe, it, expect } from "vitest";

// Función auxiliar de formateo y validación de Acciones Solicitadas
export function buildAccionesSolicitadasPayload(form: {
  accion_ginecologia?: boolean;
  accion_medicina_interna?: boolean;
  accion_nutricion?: boolean;
  accion_psicologia?: boolean;
  accion_psiquiatria?: boolean;
  accion_odontologia?: boolean;
  accion_laboratorio_gabinete?: boolean;
  accion_otra_especialidad?: boolean;
  otra_especialidad_texto?: string;
}) {
  const isOtraActive = Boolean(form.accion_otra_especialidad);
  const textoOtra = form.otra_especialidad_texto || "";
  const textoLimpio = isOtraActive ? textoOtra.trim().slice(0, 20) : null;

  return {
    accion_ginecologia: form.accion_ginecologia ? 1 : 0,
    accion_medicina_interna: form.accion_medicina_interna ? 1 : 0,
    accion_nutricion: form.accion_nutricion ? 1 : 0,
    accion_psicologia: form.accion_psicologia ? 1 : 0,
    accion_psiquiatria: form.accion_psiquiatria ? 1 : 0,
    accion_odontologia: form.accion_odontologia ? 1 : 0,
    accion_laboratorio_gabinete: form.accion_laboratorio_gabinete ? 1 : 0,
    accion_otra_especialidad: isOtraActive ? 1 : 0,
    otra_especialidad_texto: textoLimpio,
  };
}

// Evaluación de Alertas Clínicas trabajadas en la sesión
export function evaluarAlertasConsulta(params: {
  respiracion?: string | null;
  fc_fetal?: number | string | null;
  ta_sistolica?: number | null;
  ta_diastolica?: number | null;
  temperatura?: number | null;
  indice_choque?: number | null;
}) {
  const alertas: { campo: string; nivel: "ROJO" | "AMARILLO"; descripcion: string }[] = [];
  let puntosRiesgo = 0;

  // Respiración
  if (params.respiracion === "alterada") {
    alertas.push({
      campo: "Respiración",
      nivel: "ROJO",
      descripcion: "Emergencia Obstétrica Activa",
    });
  }

  // FC Fetal
  const fcFetalNum = params.fc_fetal === "" || params.fc_fetal === null || params.fc_fetal === undefined || isNaN(Number(params.fc_fetal))
    ? null
    : Number(params.fc_fetal);

  if (fcFetalNum !== null && (fcFetalNum < 110 || fcFetalNum > 160)) {
    puntosRiesgo += 9;
    alertas.push({
      campo: "FC Fetal",
      nivel: "ROJO",
      descripcion: "Sufrimiento fetal referencia inmediata a SNA",
    });
  }

  // TA Sistólica (Amarillo = Urgencia calificada 140-159)
  if (params.ta_sistolica !== null && params.ta_sistolica !== undefined) {
    if (params.ta_sistolica >= 140 && params.ta_sistolica <= 159) {
      alertas.push({
        campo: "T/A Sistólica",
        nivel: "AMARILLO",
        descripcion: "Urgencia calificada (140 - 159 mmHg)",
      });
    }
  }

  // TA Diastólica (Amarillo = Urgencia calificada 90-109)
  if (params.ta_diastolica !== null && params.ta_diastolica !== undefined) {
    if (params.ta_diastolica >= 90 && params.ta_diastolica <= 109) {
      alertas.push({
        campo: "T/A Diastólica",
        nivel: "AMARILLO",
        descripcion: "Urgencia calificada (90 - 109 mmHg)",
      });
    }
  }

  // Temperatura (Amarillo = Urgencia calificada 37.5-38.9)
  if (params.temperatura !== null && params.temperatura !== undefined) {
    if (params.temperatura >= 37.5 && params.temperatura <= 38.9) {
      alertas.push({
        campo: "Temperatura",
        nivel: "AMARILLO",
        descripcion: "Urgencia calificada (37.5 - 38.9 °C)",
      });
    }
  }

  // Índice de choque (Amarillo = Urgencia calificada 0.7-0.8)
  if (params.indice_choque !== null && params.indice_choque !== undefined) {
    if (params.indice_choque >= 0.7 && params.indice_choque <= 0.8) {
      alertas.push({
        campo: "Índice de Choque",
        nivel: "AMARILLO",
        descripcion: "Urgencia calificada (0.7 - 0.8)",
      });
    }
  }

  return { alertas, puntosRiesgo };
}

describe("Pruebas Unitarias de Cambios en la Sesión (Sección 4 y Alertas de Triage)", () => {
  describe("1. Mapeo y Límite de Caracteres para Acciones Solicitadas", () => {
    it("debe mapear miniswitches booleanos a valores numéricos 1 / 0 para la BD", () => {
      const payload = buildAccionesSolicitadasPayload({
        accion_ginecologia: true,
        accion_nutricion: true,
        accion_psicologia: false,
      });

      expect(payload.accion_ginecologia).toBe(1);
      expect(payload.accion_nutricion).toBe(1);
      expect(payload.accion_psicologia).toBe(0);
      expect(payload.accion_laboratorio_gabinete).toBe(0);
    });

    it("debe recortar estrictamente a un máximo de 20 caracteres el texto de otra especialidad", () => {
      const payloadLargo = buildAccionesSolicitadasPayload({
        accion_otra_especialidad: true,
        otra_especialidad_texto: "Cardiología Pediátrica Avanzada", // 31 caracteres
      });

      expect(payloadLargo.accion_otra_especialidad).toBe(1);
      expect(payloadLargo.otra_especialidad_texto).toBe("Cardiología Pediátri"); // 20 car exactos
      expect(payloadLargo.otra_especialidad_texto?.length).toBe(20);
    });

    it("debe ignorar el texto si el miniswitch de otra especialidad está apagado", () => {
      const payloadInactivo = buildAccionesSolicitadasPayload({
        accion_otra_especialidad: false,
        otra_especialidad_texto: "Nefrología",
      });

      expect(payloadInactivo.accion_otra_especialidad).toBe(0);
      expect(payloadInactivo.otra_especialidad_texto).toBeNull();
    });
  });

  describe("2. Alertas de Sufrimiento Fetal (FC Fetal)", () => {
    it("debe asignar 0 puntos de riesgo cuando FC fetal está entre 110 y 160 lpm", () => {
      const resNormal = evaluarAlertasConsulta({ fc_fetal: 145 });
      expect(resNormal.puntosRiesgo).toBe(0);
      expect(resNormal.alertas.find((a) => a.campo === "FC Fetal")).toBeUndefined();
    });

    it("debe asignar 9 puntos de riesgo y alerta ROJA de Sufrimiento Fetal si FC fetal es < 110 lpm", () => {
      const resBajo = evaluarAlertasConsulta({ fc_fetal: 100 });
      expect(resBajo.puntosRiesgo).toBe(9);

      const alerta = resBajo.alertas.find((a) => a.campo === "FC Fetal");
      expect(alerta).toBeDefined();
      expect(alerta?.nivel).toBe("ROJO");
      expect(alerta?.descripcion).toBe("Sufrimiento fetal referencia inmediata a SNA");
    });

    it("debe asignar 9 puntos de riesgo y alerta ROJA de Sufrimiento Fetal si FC fetal es > 160 lpm", () => {
      const resAlto = evaluarAlertasConsulta({ fc_fetal: 175 });
      expect(resAlto.puntosRiesgo).toBe(9);

      const alerta = resAlto.alertas.find((a) => a.campo === "FC Fetal");
      expect(alerta).toBeDefined();
      expect(alerta?.nivel).toBe("ROJO");
      expect(alerta?.descripcion).toBe("Sufrimiento fetal referencia inmediata a SNA");
    });
  });

  describe("3. Alertas de Emergencia y Urgencia Calificada", () => {
    it("debe generar alerta ROJA de Emergencia Obstétrica Activa si respiración es alterada", () => {
      const resResp = evaluarAlertasConsulta({ respiracion: "alterada" });
      const alerta = resResp.alertas.find((a) => a.campo === "Respiración");

      expect(alerta).toBeDefined();
      expect(alerta?.nivel).toBe("ROJO");
      expect(alerta?.descripcion).toBe("Emergencia Obstétrica Activa");
    });

    it("debe clasificar parámetros amarillos con la leyenda 'Urgencia calificada'", () => {
      const resAmarillo = evaluarAlertasConsulta({
        ta_sistolica: 145,
        ta_diastolica: 95,
        temperatura: 38.0,
        indice_choque: 0.75,
      });

      expect(resAmarillo.alertas).toHaveLength(4);
      expect(resAmarillo.alertas.every((a) => a.nivel === "AMARILLO")).toBe(true);

      expect(resAmarillo.alertas[0].descripcion).toContain("Urgencia calificada");
      expect(resAmarillo.alertas[1].descripcion).toContain("Urgencia calificada");
      expect(resAmarillo.alertas[2].descripcion).toContain("Urgencia calificada");
      expect(resAmarillo.alertas[3].descripcion).toContain("Urgencia calificada");
    });
  });
});
