import { describe, it, expect } from "vitest";
import {
  normalizarAccionesColegiadas,
  fusionarObservacionesConRBAC,
  validarCriterioColegiacion,
  type NivelObservaciones,
} from "../colegiados";

describe("Auditoría de Acciones Colegiadas: normalizarAccionesColegiadas", () => {
  it("asigna status 'pendiente' por defecto cuando no se especifica o es inválido", () => {
    const rawAcciones = [
      { nivel_atencion: "primer_nivel", descripcion: "Acción sin estatus", cumplido: false },
      { nivel_atencion: "primer_nivel", descripcion: "Acción con estatus inválido", estatus: "invalido" },
    ];

    const result = normalizarAccionesColegiadas(rawAcciones);
    expect(result).toHaveLength(2);
    expect(result[0].estatus).toBe("pendiente");
    expect(result[0].cumplido).toBe(0);
    expect(result[1].estatus).toBe("pendiente");
    expect(result[1].cumplido).toBe(0);
  });

  it("sincroniza estatus 'completada' con cumplido = 1 y asigna fecha de cumplimiento", () => {
    const rawAcciones = [
      { nivel_atencion: "segundo_nivel", descripcion: "Acción completada", estatus: "completada" },
    ];

    const result = normalizarAccionesColegiadas(rawAcciones);
    expect(result[0].estatus).toBe("completada");
    expect(result[0].cumplido).toBe(1);
    expect(result[0].fecha_cumplimiento).toBeDefined();
    expect(typeof result[0].fecha_cumplimiento).toBe("string");
  });

  it("sincroniza estatus 'incompleta' y 'no_realizada' con cumplido = 0", () => {
    const rawAcciones = [
      { nivel_atencion: "tercer_nivel", descripcion: "Acción incompleta", estatus: "incompleta", cumplido: true },
      { nivel_atencion: "tercer_nivel", descripcion: "Acción no realizada", estatus: "no_realizada", cumplido: true },
    ];

    const result = normalizarAccionesColegiadas(rawAcciones);
    expect(result[0].estatus).toBe("incompleta");
    expect(result[0].cumplido).toBe(0);
    expect(result[1].estatus).toBe("no_realizada");
    expect(result[1].cumplido).toBe(0);
  });

  it("rechaza si descripcion o respuesta_accion excede 500 caracteres", () => {
    const largoTexto = "A".repeat(501);
    const accionDescripcionExcesiva = [
      {
        nivel_atencion: "primer_nivel",
        descripcion: largoTexto,
        estatus: "pendiente",
      },
    ];

    expect(() => normalizarAccionesColegiadas(accionDescripcionExcesiva)).toThrow(
      /excede 500 caracteres/
    );

    const accionRespuestaExcesiva = [
      {
        nivel_atencion: "primer_nivel",
        descripcion: "Descripción válida",
        respuesta_accion: largoTexto,
        estatus: "pendiente",
      },
    ];

    expect(() => normalizarAccionesColegiadas(accionRespuestaExcesiva)).toThrow(
      /excede 500 caracteres/
    );
  });

  it("permite hasta 500 caracteres exactos en descripcion y respuesta_accion", () => {
    const texto500 = "B".repeat(500);
    const rawAcciones = [
      {
        nivel_atencion: "primer_nivel",
        descripcion: texto500,
        respuesta_accion: texto500,
        estatus: "pendiente",
      },
    ];

    const result = normalizarAccionesColegiadas(rawAcciones);
    expect(result[0].descripcion.length).toBe(500);
    expect(result[0].respuesta_accion?.length).toBe(500);
  });

  it("permite guardar sin fecha_respuesta ni respuesta_accion (no obligatorias al guardar)", () => {
    const rawAcciones = [
      {
        nivel_atencion: "primer_nivel",
        descripcion: "Solicitar interconsulta de alto riesgo",
        fecha_accion: "2026-10-26",
        estatus: "pendiente",
      },
    ];

    const result = normalizarAccionesColegiadas(rawAcciones);
    expect(result[0].fecha_accion).toBe("2026-10-26");
    expect(result[0].fecha_respuesta).toBeNull();
    expect(result[0].respuesta_accion).toBeNull();
    expect(result[0].estatus).toBe("pendiente");
  });

  it("rechaza acciones con descripción vacía o sin nivel de atención válido", () => {
    expect(() =>
      normalizarAccionesColegiadas([{ nivel_atencion: "primer_nivel", descripcion: "   " }])
    ).toThrow(/La descripción es requerida/);

    expect(() =>
      normalizarAccionesColegiadas([{ nivel_atencion: "cuarto_nivel", descripcion: "Válida" }])
    ).toThrow(/Nivel de atención inválido/);
  });

  it("rechaza si se intentan registrar más de 5 acciones por nivel", () => {
    const seisAcciones = Array.from({ length: 6 }, (_, i) => ({
      nivel_atencion: "primer_nivel",
      descripcion: `Acción ${i + 1}`,
    }));

    expect(() => normalizarAccionesColegiadas(seisAcciones)).toThrow(
      /Solo se permiten máximo 5 acciones en primer nivel/
    );
  });
});

describe("Auditoría de Control de Acceso (RBAC): fusionarObservacionesConRBAC", () => {
  const existingObs: NivelObservaciones = {
    nivel_atencion: "primer_nivel",
    obs_zonales: "Zonal original en BD",
    obs_regionales: "Regional original en BD",
    obs_estatal_salud_mujeres: "Estatal SM original en BD",
    obs_atencion_medica: "Atención Médica original en BD",
  };

  it("Regional (nivel 2): edita zonales y regionales, pero NO puede alterar comentarios estatales", () => {
    const incomingRegional = {
      obs_zonales: "Zonal modificada por región",
      obs_regionales: "Regional modificada por región",
      // Intento malicioso o accidental de sobreescribir los estatales:
      obs_estatal_salud_mujeres: "HACK intento de sobreescritura estatal",
      obs_atencion_medica: "HACK intento de sobreescritura médica",
    };

    const fusionado = fusionarObservacionesConRBAC({
      nivelUsuario: 2,
      nivelAtencion: "primer_nivel",
      incoming: incomingRegional,
      existing: existingObs,
    });

    expect(fusionado.obs_zonales).toBe("Zonal modificada por región");
    expect(fusionado.obs_regionales).toBe("Regional modificada por región");
    // Deben preservarse intactos los comentarios estatales:
    expect(fusionado.obs_estatal_salud_mujeres).toBe("Estatal SM original en BD");
    expect(fusionado.obs_atencion_medica).toBe("Atención Médica original en BD");
  });

  it("Estatal / Admin (nivel >= 3): edita estatal y atención médica, pero NO puede alterar zonales ni regionales", () => {
    const incomingEstatal = {
      // Intento de sobreescribir comentarios zonales y regionales:
      obs_zonales: "HACK sobreescritura de zona",
      obs_regionales: "HACK sobreescritura regional",
      obs_estatal_salud_mujeres: "Estatal SM actualizado por estatal",
      obs_atencion_medica: "Atención Médica actualizada por estatal",
    };

    const fusionado = fusionarObservacionesConRBAC({
      nivelUsuario: 3,
      nivelAtencion: "primer_nivel",
      incoming: incomingEstatal,
      existing: existingObs,
    });

    // Deben preservarse intactos los comentarios regionales y zonales:
    expect(fusionado.obs_zonales).toBe("Zonal original en BD");
    expect(fusionado.obs_regionales).toBe("Regional original en BD");
    // Deben actualizarse los estatales:
    expect(fusionado.obs_estatal_salud_mujeres).toBe("Estatal SM actualizado por estatal");
    expect(fusionado.obs_atencion_medica).toBe("Atención Médica actualizada por estatal");
  });
});

describe("Auditoría de Criterios de Colegiación: validarCriterioColegiacion", () => {
  it("califica cuando el puntaje total es >= 25", () => {
    const paciente = { edad: 25, imc_inicial: 22 };
    const consulta = { puntaje_total_consulta: 28 };

    const res = validarCriterioColegiacion(paciente, consulta);
    expect(res.califica).toBe(true);
    expect(res.esPuntaje25Plus).toBe(true);
    expect(res.motivo).toContain("28 pts (≥ 25)");
  });

  it("califica cuando riesgo_25_plus es 1 aunque puntaje_total_consulta no esté seteado", () => {
    const paciente = { factor_riesgo_antecedentes: 15, factor_riesgo_tamizajes: 10 };
    const consulta = { riesgo_25_plus: 1 };

    const res = validarCriterioColegiacion(paciente, consulta);
    expect(res.califica).toBe(true);
    expect(res.esPuntaje25Plus).toBe(true);
  });

  it("califica con puntaje bajo (< 25) cuando la paciente tiene entre 10 y 14 años", () => {
    const paciente = { edad: 13, imc_inicial: 21 };
    const consulta = { puntaje_total_consulta: 8 };

    const res = validarCriterioColegiacion(paciente, consulta);
    expect(res.califica).toBe(true);
    expect(res.esPuntaje25Plus).toBe(false);
    expect(res.esCriterioClinicoGrave).toBe(true);
    expect(res.motivo).toContain("13 años (10-14 años)");
  });

  it("califica con puntaje bajo (< 25) cuando el IMC inicial es >= 31 (obesidad severa)", () => {
    const paciente = { edad: 28, imc_inicial: 34.5 };
    const consulta = { puntaje_total_consulta: 12 };

    const res = validarCriterioColegiacion(paciente, consulta);
    expect(res.califica).toBe(true);
    expect(res.esCriterioClinicoGrave).toBe(true);
    expect(res.motivo).toContain("IMC 34.5 (≥ 31)");
  });

  it("califica con puntaje bajo (< 25) si tiene cardiopatía, hepatopatía, coagulopatía o nefropatía", () => {
    const casos = [
      { factor_cardiopatia: 1, esperado: "Cardiopatía" },
      { factor_hepatopatia: 1, esperado: "Hepatopatía" },
      { factor_coagulopatias: 1, esperado: "Coagulopatía" },
      { factor_nefropatia: 1, esperado: "Nefropatía" },
    ];

    for (const c of casos) {
      const res = validarCriterioColegiacion({ edad: 24, imc_inicial: 23, ...c }, { puntaje_total_consulta: 5 });
      expect(res.califica).toBe(true);
      expect(res.esCriterioClinicoGrave).toBe(true);
      expect(res.motivo).toContain(c.esperado);
    }
  });

  it("NO califica si el puntaje es < 25 y no tiene ningún criterio clínico grave", () => {
    const paciente = {
      edad: 26,
      imc_inicial: 24,
      factor_cardiopatia: 0,
      factor_hepatopatia: 0,
      factor_coagulopatias: 0,
      factor_nefropatia: 0,
    };
    const consulta = { puntaje_total_consulta: 16, riesgo_25_plus: 0 };

    const res = validarCriterioColegiacion(paciente, consulta);
    expect(res.califica).toBe(false);
    expect(res.esPuntaje25Plus).toBe(false);
    expect(res.esCriterioClinicoGrave).toBe(false);
    expect(res.motivo).toBeNull();
  });
});
