import { describe, it, expect } from "vitest";
import {
  evaluarFactoresRiesgo,
  evaluarCampoIndividual,
  type DatosFactoresPaciente,
} from "../riesgoFactores";
import { evaluarTamizajes, type DatosTamizajes } from "../riesgoTamizajes";
import { calcularFactorRiesgo, type DatosFactorRiesgo } from "../factorRiesgo";

describe("Motor de Factores de Riesgo Obstétrico (riesgoFactores)", () => {
  describe("1. Ponderación por IMC Inicial", () => {
    it("debe asignar 6 puntos para bajo peso (IMC < 18.5)", () => {
      const resultado = evaluarFactoresRiesgo({ imc_inicial: 17.5 });
      expect(resultado.puntajeTotal).toBe(6);
      expect(resultado.factores).toHaveLength(1);
      expect(resultado.factores[0].campo).toBe("Índice de Masa Corporal (IMC)");
      expect(resultado.factores[0].puntos).toBe(6);
    });

    it("no debe asignar puntos para IMC normal (18.5 - 24.9) o sobrepeso (25.0 - 29.9)", () => {
      const normal = evaluarFactoresRiesgo({ imc_inicial: 22.4 });
      expect(normal.puntajeTotal).toBe(0);
      expect(normal.factores).toHaveLength(0);

      const sobrepeso = evaluarFactoresRiesgo({ imc_inicial: 28.1 });
      expect(sobrepeso.puntajeTotal).toBe(0);
      expect(sobrepeso.factores).toHaveLength(0);
    });

    it("debe asignar 4 puntos para obesidad Grado I (IMC 30.0 - 34.99)", () => {
      const resultado = evaluarFactoresRiesgo({ imc_inicial: 32.0 });
      expect(resultado.puntajeTotal).toBe(4);
      expect(resultado.factores[0].puntos).toBe(4);
    });

    it("debe asignar 6 puntos para obesidad Grado II (IMC 35.0 - 39.99)", () => {
      const resultado = evaluarFactoresRiesgo({ imc_inicial: 37.5 });
      expect(resultado.puntajeTotal).toBe(6);
      expect(resultado.factores[0].puntos).toBe(6);
    });

    it("debe asignar 8 puntos para obesidad Grado III / severa (IMC >= 40.0)", () => {
      const resultado = evaluarFactoresRiesgo({ imc_inicial: 42.1 });
      expect(resultado.puntajeTotal).toBe(8);
      expect(resultado.factores[0].puntos).toBe(8);
    });
  });

  describe("2. Umbrales de Riesgo por Edad Materna Extrema", () => {
    it("debe asignar 8 puntos para menores de 15 años (< 15)", () => {
      const resultado = evaluarFactoresRiesgo({ edad: 14 });
      expect(resultado.puntajeTotal).toBe(8);
      expect(resultado.factores[0].campo).toBe("Edad de riesgo");
      expect(resultado.factores[0].puntos).toBe(8);
    });

    it("debe asignar 4 puntos para adolescentes (15 a 19 años)", () => {
      const r15 = evaluarFactoresRiesgo({ edad: 15 });
      expect(r15.puntajeTotal).toBe(4);
      expect(r15.factores[0].puntos).toBe(4);

      const r19 = evaluarFactoresRiesgo({ edad: 19 });
      expect(r19.puntajeTotal).toBe(4);
      expect(r19.factores[0].puntos).toBe(4);
    });

    it("no debe asignar puntos para edad reproductiva óptima (20 a 35 años)", () => {
      const r20 = evaluarFactoresRiesgo({ edad: 20 });
      expect(r20.puntajeTotal).toBe(0);

      const r28 = evaluarFactoresRiesgo({ edad: 28 });
      expect(r28.puntajeTotal).toBe(0);

      const r35 = evaluarFactoresRiesgo({ edad: 35 });
      expect(r35.puntajeTotal).toBe(0);
    });

    it("debe asignar 4 puntos para edad materna avanzada (>= 36 años)", () => {
      const r36 = evaluarFactoresRiesgo({ edad: 36 });
      expect(r36.puntajeTotal).toBe(4);

      const r42 = evaluarFactoresRiesgo({ edad: 42 });
      expect(r42.puntajeTotal).toBe(4);
    });
  });

  describe("3. Antecedentes Gineco-Obstétricos y Comorbilidades", () => {
    it("debe asignar 2 puntos para 1 o 2 gestaciones y 4 puntos para >= 3 gestas", () => {
      const r1 = evaluarFactoresRiesgo({ gestas: 1 });
      expect(r1.puntajeTotal).toBe(2);

      const r2 = evaluarFactoresRiesgo({ gestas: 2 });
      expect(r2.puntajeTotal).toBe(2);

      const r3 = evaluarFactoresRiesgo({ gestas: 3 });
      expect(r3.puntajeTotal).toBe(4);

      const r6 = evaluarFactoresRiesgo({ gestas: 6 });
      expect(r6.puntajeTotal).toBe(4);
    });

    it("debe asignar 6 puntos por cesáreas previas (>= 2)", () => {
      const r1 = evaluarFactoresRiesgo({ cesareas: 1 });
      expect(r1.puntajeTotal).toBe(0);

      const r2 = evaluarFactoresRiesgo({ cesareas: 2 });
      expect(r2.puntajeTotal).toBe(6);

      const r3 = evaluarFactoresRiesgo({ cesareas: 3 });
      expect(r3.puntajeTotal).toBe(6);
    });

    it("debe asignar 4 puntos por abortos previos (>= 2)", () => {
      const r1 = evaluarFactoresRiesgo({ abortos: 1 });
      expect(r1.puntajeTotal).toBe(0);

      const r2 = evaluarFactoresRiesgo({ abortos: 2 });
      expect(r2.puntajeTotal).toBe(4);
    });

    it("debe ponderar correctamente antecedentes graves (4 puntos c/u) y embarazo ectópico (6 puntos)", () => {
      const resultado = evaluarFactoresRiesgo({
        ant_preeclampsia: true,
        ant_hemorragia: true,
        ant_sepsis: true,
        ant_bajo_peso_macrosomia: true,
        ant_muerte_perinatal: true,
        ant_embarazo_ectopico: true,
      });
      // 5 antecedentes * 4 puntos + 6 puntos (embarazo ectópico) = 26 puntos
      expect(resultado.puntajeTotal).toBe(26);
      expect(resultado.factores).toHaveLength(6);
      expect(resultado.nivel).toBe("CRITICO");
    });

    it("debe evaluar antecedente de embarazo ectópico individualmente con 6 puntos", () => {
      const r = evaluarFactoresRiesgo({ ant_embarazo_ectopico: true });
      expect(r.puntajeTotal).toBe(6);
      expect(r.factores[0].campo).toBe("Antecedente de Embarazo Ectópico");
      expect(r.factores[0].puntos).toBe(6);
    });

    it("debe sumar comorbilidades crónicas y toxicomanías", () => {
      const resultado = evaluarFactoresRiesgo({
        factor_diabetes: true,     // 4 pts
        factor_hipertension: true, // 4 pts
        factor_tabaquismo: true,   // 2 pts
        factor_drogas_ilicitas: true, // 6 pts (Otras drogas)
      });
      expect(resultado.puntajeTotal).toBe(16); // 4 + 4 + 2 + 6
      expect(resultado.factores).toHaveLength(4);
    });

    it("debe evaluar y sumar correctamente los nuevos factores de riesgo agregados", () => {
      const resultado = evaluarFactoresRiesgo({
        factor_endocrinopatia: true,            // 12 pts
        factor_neumopatia: true,                // 12 pts
        factor_drogas_ilicitas: true,           // 6 pts (Otras drogas)
        factor_its: true,                       // 4 pts
        factor_cirugias_pelvico_uterinas: true, // 4 pts
        factor_discapacidad: true,              // 12 pts
      });
      // 12 + 12 + 6 + 4 + 4 + 12 = 50 puntos
      expect(resultado.puntajeTotal).toBe(50);
      expect(resultado.factores).toHaveLength(6);
      expect(resultado.nivel).toBe("CRITICO");
    });

    it("debe evaluar factores sociodemográficos y epidemiológicos", () => {
      const rContacto = evaluarFactoresRiesgo({
        indigena: true, // 2 pts
        migrante: true, // 4 pts
        factores_riesgo_epid: "es_contacto", // 4 pts
      });
      expect(rContacto.puntajeTotal).toBe(10);

      const rPortadora = evaluarFactoresRiesgo({
        factores_riesgo_epid: "es_portadora", // 6 pts
      });
      expect(rPortadora.puntajeTotal).toBe(6);
    });
  });

  describe("4. Clasificación de Nivel de Riesgo (Semaforización)", () => {
    it("debe clasificar como BAJO (0 - 3 puntos)", () => {
      const r0 = evaluarFactoresRiesgo({});
      expect(r0.nivel).toBe("BAJO");

      const r2 = evaluarFactoresRiesgo({ gestas: 1 }); // 2 pts
      expect(r2.nivel).toBe("BAJO");
    });

    it("debe clasificar como ALTO (4 - 9 puntos)", () => {
      const r4 = evaluarFactoresRiesgo({ edad: 16 }); // 4 pts
      expect(r4.nivel).toBe("ALTO");

      const r8 = evaluarFactoresRiesgo({ edad: 14 }); // 8 pts
      expect(r8.nivel).toBe("ALTO");
    });

    it("debe clasificar como MUY_ALTO (10 - 25 puntos)", () => {
      const rMuyAlto = evaluarFactoresRiesgo({
        edad: 14,             // 8 pts
        cesareas: 2,          // 6 pts
        ant_preeclampsia: true, // 4 pts
      }); // total = 18 pts
      expect(rMuyAlto.puntajeTotal).toBe(18);
      expect(rMuyAlto.nivel).toBe("MUY_ALTO");
    });

    it("debe clasificar como CRITICO (> 25 puntos)", () => {
      const rCritico = evaluarFactoresRiesgo({
        edad: 14,                 // 8 pts
        cesareas: 2,              // 6 pts
        ant_preeclampsia: true,   // 4 pts
        factor_diabetes: true,    // 4 pts
        factor_hipertension: true,// 4 pts
        imc_inicial: 41,          // 8 pts
      }); // total = 34 pts
      expect(rCritico.puntajeTotal).toBe(34);
      expect(rCritico.nivel).toBe("CRITICO");
    });
  });
});

describe("Motor de Tamizajes Iniciales (riesgoTamizajes)", () => {
  it("debe retornar SIN_HALLAZGOS cuando todas las pruebas son negativas/normales", () => {
    const res = evaluarTamizajes({
      prueba_vih: "No reactiva",
      prueba_vdrl: "No reactiva",
      prueba_hepatitis_c: "No reactiva",
      diabetes_glicemia: "Normal",
      violencia: "Negativa",
    });
    expect(res.puntajeTotal).toBe(0);
    expect(res.tamizajes).toHaveLength(0);
    expect(res.nivel).toBe("SIN_HALLAZGOS");
  });

  it("debe sumar 4 puntos por cada tamizaje reactivo o positivo y clasificar como ALERTA", () => {
    const res = evaluarTamizajes({
      prueba_vih: "Reactiva",                 // 4 pts
      prueba_vdrl: "Reactiva",                // 4 pts
      diabetes_glicemia: "Diabetes",          // 4 pts
      violencia: "Positiva",                  // 4 pts
    });
    expect(res.puntajeTotal).toBe(16);
    expect(res.tamizajes).toHaveLength(4);
    expect(res.nivel).toBe("ALERTA");
  });
});

describe("Motor Clínico General de Puntuación (factorRiesgo)", () => {
  it("debe calcular un caso clínico con signos vitales y laboratorios", () => {
    const datos: DatosFactorRiesgo = {
      gesta: 3,
      cesareasPrevias: 1,
      edad: 38,
      imc: 35,
      hipertensionCronica: true,
      sistolica: 145,
      diastolica: 92,
      plaquetas: 140000,
      proteinuriaTira: "1+",
    };

    const res = calcularFactorRiesgo(datos);
    expect(res.puntajeTotal).toBeGreaterThan(0);
    expect(res.detalles.length).toBeGreaterThan(0);
    expect(res.sugerencias.length).toBeGreaterThan(0);
    expect(["MODERADO", "ALTO"]).toContain(res.categoria);
  });

  it("debe clasificar correctamente en BAJO, MODERADO y ALTO", () => {
    const bajo = calcularFactorRiesgo({ edad: 25 });
    expect(bajo.categoria).toBe("BAJO");

    // gesta: 5 (4 pts) + cesareasPrevias: 1 (2 pts) + edad: 37 (3 pts) + imc: 32 (2 pts) = 11 pts -> MODERADO
    const moderado = calcularFactorRiesgo({
      gesta: 5,
      cesareasPrevias: 1,
      edad: 37,
      imc: 32,
    });
    expect(moderado.puntajeTotal).toBe(11);
    expect(moderado.categoria).toBe("MODERADO");

    const alto = calcularFactorRiesgo({
      embarazoMultiple: true, // 4 pts
      antecedentePreeclampsia: true, // 4 pts
      cardiopatia: true, // 4 pts
      sangradoVaginal: true, // 3 pts
      fosfenos: true, // 4 pts
      cefaleaSevera: true, // 3 pts
    });
    expect(alto.puntajeTotal).toBe(22);
    expect(alto.categoria).toBe("ALTO");
  });
});
