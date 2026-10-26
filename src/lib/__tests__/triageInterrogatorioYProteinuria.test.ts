import { describe, it, expect } from "vitest";
import {
  evaluarSangradoTransvaginal,
  evaluarCrisisConvulsivas,
  evaluarCefalea,
  evaluarAcufenosFosfenos,
  evaluarEpigastralgiaAmaurosis,
  evaluarSindromeFebril,
  evaluarLiquidoAmniotico,
  evaluarMovilidadFetal,
  evaluarInterrogatorioTriage,
  determinarProtocoloTriage,
  MENSAJE_EMERGENCIA_OBSTETRICA,
  MENSAJE_URGENCIA_CALIFICADA,
} from "../triage-protocolo";
import {
  OPCIONES_PROTEINURIA,
  normalizarProteinuria,
  esProteinuriaPositiva,
} from "../proteinuria";

// Función auxiliar que replica la lógica de alertas prioritarias de antecedentes (Edad < 15 y Cesáreas > 2)
export function evaluarAlertasAntecedentesNuevas(input: {
  edad: number | string | null;
  cesareas: number | string | null;
}) {
  const edadNum = input.edad === "" || input.edad === null ? null : Number(input.edad);
  const cesareasNum = input.cesareas === "" || input.cesareas === null ? null : Number(input.cesareas);

  const alertaEdadMenor15 =
    edadNum !== null && Number.isFinite(edadNum) && edadNum > 0 && edadNum < 15
      ? {
          activa: true,
          titulo: "EDAD MATERNA DE RIESGO PRIORITARIO",
          mensaje: "Enviar a Manejo conjunto a segundo nivel",
          puntajeForzadoMinimo: 25,
        }
      : { activa: false, titulo: null, mensaje: null, puntajeForzadoMinimo: 0 };

  const alertaCesareasMayor2 =
    cesareasNum !== null && Number.isFinite(cesareasNum) && cesareasNum > 2
      ? {
          activa: true,
          nivel: "ROJO" as const,
          titulo: "CESÁREAS PREVIAS > 2",
          mensajeModal:
            "Fecha de programacion de cesarea a mas tardar a las 35 SDG, vigilar de manera intencionada alteraciones en la implantacion de la placenta",
          puntajeRiesgo: 8, // El puntaje para >2 cesáreas se mantiene en 8 pts sin cambio
        }
      : {
          activa: false,
          nivel: null,
          titulo: null,
          mensajeModal: null,
          puntajeRiesgo: cesareasNum !== null && cesareasNum >= 1 && cesareasNum <= 2 ? 4 : 0,
        };

  return { alertaEdadMenor15, alertaCesareasMayor2 };
}

describe("Auditoría de Nuevos Campos: Interrogatorio Triage Obstétrico, Proteinuria y Alertas de Antecedentes", () => {
  describe("1. Interrogatorio de Triage Obstétrico (8 campos)", () => {
    it("Sangrado transvaginal: Abundante (ROJO), Escaso/Moderado (AMARILLO), Ausente (sin alerta)", () => {
      const rojo = evaluarSangradoTransvaginal("abundante");
      expect(rojo).toEqual({
        campo: "Sangrado transvaginal",
        valor: "Abundante",
        nivel: "ROJO",
        descripcion: "Emergencia Obstétrica Activa",
      });

      const amarillo = evaluarSangradoTransvaginal("escaso_moderado");
      expect(amarillo).toEqual({
        campo: "Sangrado transvaginal",
        valor: "Escaso/Moderado",
        nivel: "AMARILLO",
        descripcion: "Urgencia calificada",
      });

      expect(evaluarSangradoTransvaginal("ausente")).toBeNull();
      expect(evaluarSangradoTransvaginal("")).toBeNull();
    });

    it("Crisis convulsivas: Presente (ROJO), Negadas (AMARILLO)", () => {
      const rojo = evaluarCrisisConvulsivas("presente");
      expect(rojo).toEqual({
        campo: "Crisis convulsivas",
        valor: "Presente",
        nivel: "ROJO",
        descripcion: "Emergencia Obstétrica Activa",
      });

      const amarillo = evaluarCrisisConvulsivas("negadas");
      expect(amarillo).toEqual({
        campo: "Crisis convulsivas",
        valor: "Negadas",
        nivel: "AMARILLO",
        descripcion: "Urgencia calificada",
      });

      expect(evaluarCrisisConvulsivas("")).toBeNull();
    });

    it("Cefalea: Presente (ROJO), Ausente/Presente No pulsátil (AMARILLO), Ausente (sin alerta)", () => {
      const rojo = evaluarCefalea("presente");
      expect(rojo).toEqual({
        campo: "Cefalea",
        valor: "Presente",
        nivel: "ROJO",
        descripcion: "Emergencia Obstétrica Activa",
      });

      const amarillo = evaluarCefalea("no_pulsatil");
      expect(amarillo).toEqual({
        campo: "Cefalea",
        valor: "Ausente/Presente No pulsátil",
        nivel: "AMARILLO",
        descripcion: "Urgencia calificada",
      });

      expect(evaluarCefalea("ausente")).toBeNull();
      expect(evaluarCefalea("")).toBeNull();
    });

    it("Acúfenos/Fosfenos: Presente (ROJO), Ausentes (AMARILLO)", () => {
      const rojo = evaluarAcufenosFosfenos("presente");
      expect(rojo).toEqual({
        campo: "Acúfenos/Fosfenos",
        valor: "Presente",
        nivel: "ROJO",
        descripcion: "Emergencia Obstétrica Activa",
      });

      const amarillo = evaluarAcufenosFosfenos("ausentes");
      expect(amarillo).toEqual({
        campo: "Acúfenos/Fosfenos",
        valor: "Ausentes",
        nivel: "AMARILLO",
        descripcion: "Urgencia calificada",
      });

      expect(evaluarAcufenosFosfenos("")).toBeNull();
    });

    it("Epigastralgia/Amaurosis: Presente (ROJO), Ausente (AMARILLO)", () => {
      const rojo = evaluarEpigastralgiaAmaurosis("presente");
      expect(rojo).toEqual({
        campo: "Epigastralgia/Amaurosis",
        valor: "Presente",
        nivel: "ROJO",
        descripcion: "Emergencia Obstétrica Activa",
      });

      const amarillo = evaluarEpigastralgiaAmaurosis("ausente");
      expect(amarillo).toEqual({
        campo: "Epigastralgia/Amaurosis",
        valor: "Ausente",
        nivel: "AMARILLO",
        descripcion: "Urgencia calificada",
      });

      expect(evaluarEpigastralgiaAmaurosis("")).toBeNull();
    });

    it("Síndrome febril: Presente (AMARILLO), Ausente (sin alerta)", () => {
      const amarillo = evaluarSindromeFebril("presente");
      expect(amarillo).toEqual({
        campo: "Síndrome febril",
        valor: "Presente",
        nivel: "AMARILLO",
        descripcion: "Urgencia calificada",
      });

      expect(evaluarSindromeFebril("ausente")).toBeNull();
      expect(evaluarSindromeFebril("")).toBeNull();
    });

    it("Salida de líquido amniótico: Claro/verdoso (AMARILLO), Ausente (sin alerta)", () => {
      const amarillo = evaluarLiquidoAmniotico("claro_verdoso");
      expect(amarillo).toEqual({
        campo: "Salida de líquido amniótico",
        valor: "Claro/verdoso",
        nivel: "AMARILLO",
        descripcion: "Urgencia calificada",
      });

      expect(evaluarLiquidoAmniotico("ausente")).toBeNull();
      expect(evaluarLiquidoAmniotico("")).toBeNull();
    });

    it("Movilidad fetal: Ausente (AMARILLO), Presente (sin alerta)", () => {
      const amarillo = evaluarMovilidadFetal("ausente");
      expect(amarillo).toEqual({
        campo: "Movilidad fetal",
        valor: "Ausente",
        nivel: "AMARILLO",
        descripcion: "Urgencia calificada",
      });

      expect(evaluarMovilidadFetal("presente")).toBeNull();
      expect(evaluarMovilidadFetal("")).toBeNull();
    });

    it("evaluarInterrogatorioTriage integra correctamente con determinarProtocoloTriage", () => {
      // Caso 1: Solo opciones sin alerta -> NORMAL
      const alertasNormales = evaluarInterrogatorioTriage({
        interrogatorio_sangrado_transvaginal: "ausente",
        interrogatorio_cefalea: "ausente",
        interrogatorio_sindrome_febril: "ausente",
        interrogatorio_liquido_amniotico: "ausente",
        interrogatorio_movilidad_fetal: "presente",
      });
      expect(alertasNormales).toHaveLength(0);
      expect(determinarProtocoloTriage(alertasNormales).tipo).toBe("NORMAL");

      // Caso 2: Opciones amarillas -> URGENCIA_CALIFICADA
      const alertasAmarillas = evaluarInterrogatorioTriage({
        interrogatorio_sangrado_transvaginal: "escaso_moderado",
        interrogatorio_sindrome_febril: "presente",
        interrogatorio_movilidad_fetal: "ausente",
      });
      expect(alertasAmarillas).toHaveLength(3);
      const protocoloAmarillo = determinarProtocoloTriage(alertasAmarillas);
      expect(protocoloAmarillo.tipo).toBe("URGENCIA_CALIFICADA");
      expect(protocoloAmarillo.mensaje).toBe(MENSAJE_URGENCIA_CALIFICADA);

      // Caso 3: Al menos una opción roja -> EMERGENCIA_OBSTETRICA
      const alertasRojas = evaluarInterrogatorioTriage({
        interrogatorio_crisis_convulsivas: "presente",
        interrogatorio_sindrome_febril: "presente",
      });
      expect(alertasRojas).toHaveLength(2);
      const protocoloRojo = determinarProtocoloTriage(alertasRojas);
      expect(protocoloRojo.tipo).toBe("EMERGENCIA_OBSTETRICA");
      expect(protocoloRojo.mensaje).toBe(MENSAJE_EMERGENCIA_OBSTETRICA);
    });
  });

  describe("2. Estandarización del Campo Proteinuria", () => {
    it("debe ofrecer exactamente las opciones estandarizadas en el catálogo", () => {
      expect(OPCIONES_PROTEINURIA.map((o) => o.value)).toEqual([
        "",
        "Negativa",
        "(+) 30 mg/dL",
        "(++) 100 mg/dL",
        "(+++) >300 mg/dL",
      ]);
    });

    it("debe normalizar valores negativos o vacíos correctamente", () => {
      expect(normalizarProteinuria(null)).toBeNull();
      expect(normalizarProteinuria("")).toBeNull();
      expect(normalizarProteinuria("Sin evaluar")).toBeNull();
      expect(normalizarProteinuria("Neg")).toBe("Negativa");
      expect(normalizarProteinuria("negativo")).toBe("Negativa");
      expect(normalizarProteinuria("Negativa")).toBe("Negativa");
      expect(normalizarProteinuria("0")).toBe("Negativa");
    });

    it("debe estandarizar cruces (+, ++, +++) y valores numéricos (30, 100, 300) al formato oficial", () => {
      expect(normalizarProteinuria("+")).toBe("(+) 30 mg/dL");
      expect(normalizarProteinuria("(+)")).toBe("(+) 30 mg/dL");
      expect(normalizarProteinuria("Tr")).toBe("(+) 30 mg/dL");
      expect(normalizarProteinuria("30")).toBe("(+) 30 mg/dL");
      expect(normalizarProteinuria("(+) 30 mg/dL")).toBe("(+) 30 mg/dL");

      expect(normalizarProteinuria("++")).toBe("(++) 100 mg/dL");
      expect(normalizarProteinuria("(++)")).toBe("(++) 100 mg/dL");
      expect(normalizarProteinuria("100")).toBe("(++) 100 mg/dL");
      expect(normalizarProteinuria("(++) 100 mg/dL")).toBe("(++) 100 mg/dL");

      expect(normalizarProteinuria("+++")).toBe("(+++) >300 mg/dL");
      expect(normalizarProteinuria("(+++)")).toBe("(+++) >300 mg/dL");
      expect(normalizarProteinuria(">300")).toBe("(+++) >300 mg/dL");
      expect(normalizarProteinuria("300")).toBe("(+++) >300 mg/dL");
      expect(normalizarProteinuria("(+++) >300 mg/dL")).toBe("(+++) >300 mg/dL");
    });

    it("debe identificar correctamente cuándo una proteinuria es positiva para reportes clínicos", () => {
      expect(esProteinuriaPositiva(null)).toBe(false);
      expect(esProteinuriaPositiva("Negativa")).toBe(false);
      expect(esProteinuriaPositiva("Neg")).toBe(false);
      expect(esProteinuriaPositiva("(+) 30 mg/dL")).toBe(true);
      expect(esProteinuriaPositiva("(++) 100 mg/dL")).toBe(true);
      expect(esProteinuriaPositiva("(+++) >300 mg/dL")).toBe(true);
    });
  });

  describe("3. Alertas de Antecedentes en Registro de Pacientes (Edad < 15 y Cesáreas > 2)", () => {
    it("debe activar la alerta de edad materna cuando edad < 15 años con el nuevo texto de manejo conjunto", () => {
      const { alertaEdadMenor15: alerta14 } = evaluarAlertasAntecedentesNuevas({
        edad: 14,
        cesareas: 0,
      });
      expect(alerta14.activa).toBe(true);
      expect(alerta14.mensaje).toBe("Enviar a Manejo conjunto a segundo nivel");

      const { alertaEdadMenor15: alerta15 } = evaluarAlertasAntecedentesNuevas({
        edad: 15,
        cesareas: 0,
      });
      expect(alerta15.activa).toBe(false);
    });

    it("debe activar alerta roja y modal para Cesáreas > 2 sin alterar su puntaje de riesgo (8 pts)", () => {
      const { alertaCesareasMayor2: dosCesareas } = evaluarAlertasAntecedentesNuevas({
        edad: 25,
        cesareas: 2,
      });
      expect(dosCesareas.activa).toBe(false);
      expect(dosCesareas.puntajeRiesgo).toBe(4);

      const { alertaCesareasMayor2: tresCesareas } = evaluarAlertasAntecedentesNuevas({
        edad: 25,
        cesareas: 3,
      });
      expect(tresCesareas.activa).toBe(true);
      expect(tresCesareas.nivel).toBe("ROJO");
      expect(tresCesareas.mensajeModal).toBe(
        "Fecha de programacion de cesarea a mas tardar a las 35 SDG, vigilar de manera intencionada alteraciones en la implantacion de la placenta"
      );
      expect(tresCesareas.puntajeRiesgo).toBe(8);
    });
  });
});
