import { NextResponse } from "next/server";
import { query } from "@/lib/db";

function parseDateOnly(dateValue: string): Date | null {
  if (!dateValue) return null;

  const [year, month, day] = dateValue.split("-").map(Number);
  if (!year || !month || !day) return null;

  const parsed = new Date(Date.UTC(year, month - 1, day));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateOnly(dateValue: Date): string {
  return dateValue.toISOString().slice(0, 10);
}

function roundToSingleDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function computeGestacionDesdeFum(fum: string | null | undefined) {
  const fumDate = parseDateOnly(String(fum || "").trim());
  if (!fumDate) {
    return {
      fum: null,
      fpp: null,
      semanasGestacion: null,
    };
  }

  const fppDate = new Date(fumDate);
  fppDate.setUTCDate(fppDate.getUTCDate() + 280);

  const today = new Date();
  const todayUtc = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const diffInMs = todayUtc.getTime() - fumDate.getTime();
  const diffInWeeks = Math.max(0, diffInMs / (1000 * 60 * 60 * 24 * 7));

  return {
    fum: formatDateOnly(fumDate),
    fpp: formatDateOnly(fppDate),
    semanasGestacion: roundToSingleDecimal(diffInWeeks),
  };
}

/**
 * Genera el siguiente folio consecutivo para un CLUES
 * Formato: CLUES-001, CLUES-002, etc.
 */
async function generarSiguienteFolio(cluesId: string): Promise<string> {
  // Obtener el último folio para este CLUES
  const rows: any = await query(
    `SELECT folio FROM cat_pacientes 
     WHERE clues_id = ? AND folio LIKE ? 
     ORDER BY folio DESC 
     LIMIT 1`,
    [cluesId, `${cluesId}-%`]
  );

  let consecutivo = 1;
  
  if (rows && rows.length > 0 && rows[0].folio) {
    // Extraer el número consecutivo del último folio
    const match = rows[0].folio.match(/-(\d+)$/);
    if (match) {
      consecutivo = parseInt(match[1], 10) + 1;
    }
  }

  // Formatear con 3 dígitos (001, 002, etc.)
  const consecutivoStr = consecutivo.toString().padStart(3, '0');
  return `${cluesId}-${consecutivoStr}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = parseInt(searchParams.get("limit") || "8", 10);
  const limit = Number.isNaN(parsed) ? 8 : Math.min(Math.max(parsed, 1), 50);
  const summary = (searchParams.get("summary") || "").toLowerCase();
  const cluesFilter = (searchParams.get("clues_id") || "").trim();
  const regionFilter = (searchParams.get("region") || "").trim();
  const idFilter = searchParams.get("id");
  const action = searchParams.get("action");

  // Acción especial: generar folio para un CLUES
  if (action === "generar-folio" && cluesFilter) {
    try {
      const folio = await generarSiguienteFolio(cluesFilter);
      return NextResponse.json({ folio });
    } catch (error: any) {
      console.error("Error generando folio", error);
      return NextResponse.json({ message: "Error al generar folio" }, { status: 500 });
    }
  }

  if (summary === "metrics") {
    try {
      const where: string[] = [];
      const params: any[] = [];

      if (cluesFilter) {
        where.push("p.clues_id = ?");
        params.push(cluesFilter);
      }
      if (regionFilter) {
        where.push("p.region = ?");
        params.push(regionFilter);
        if (!cluesFilter) {
          where.push("c.paciente_id IS NOT NULL");
        }
      }

      const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const rows: any = await query(
        `SELECT 
            COUNT(*) AS total,
            SUM(
              CASE WHEN COALESCE(
                c.puntaje_total_consulta,
                COALESCE(p.factor_riesgo_antecedentes, 0) + COALESCE(p.factor_riesgo_tamizajes, 0) + COALESCE(c.puntaje_consulta_parametros, 0)
              ) >= 25 THEN 1 ELSE 0 END
            ) AS alto_riesgo,
            SUM(CASE WHEN DATE(p.fecha_ingreso_cpn) BETWEEN DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND CURDATE() THEN 1 ELSE 0 END) AS semana_ingreso,
            SUM(CASE WHEN DATE(p.created_at) BETWEEN DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND CURDATE() THEN 1 ELSE 0 END) AS semana_sistema,
            SUM(
              CASE
                WHEN DATE(p.fecha_ingreso_cpn) BETWEEN DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND CURDATE()
                  OR DATE(p.created_at) BETWEEN DATE_SUB(CURDATE(), INTERVAL 6 DAY) AND CURDATE()
                THEN 1 ELSE 0
              END
            ) AS semana_actual
         FROM cat_pacientes p
         LEFT JOIN (
             SELECT c1.id AS last_consulta_id, c1.paciente_id, c1.puntaje_consulta_parametros, c1.puntaje_total_consulta
           FROM consultas_prenatales c1
           INNER JOIN (
             SELECT paciente_id, MAX(id) AS last_consulta_id
             FROM consultas_prenatales
             GROUP BY paciente_id
           ) last_c ON last_c.last_consulta_id = c1.id
         ) c ON c.paciente_id = p.id
         ${whereClause}`,
        params
      );

      const metrics = rows?.[0] || {
        total: 0,
        alto_riesgo: 0,
        semana_ingreso: 0,
        semana_sistema: 0,
        semana_actual: 0,
      };
      return NextResponse.json({
        total: Number(metrics.total) || 0,
        alto_riesgo: Number(metrics.alto_riesgo) || 0,
        semana_ingreso: Number(metrics.semana_ingreso) || 0,
        semana_sistema: Number(metrics.semana_sistema) || 0,
        semana_actual: Number(metrics.semana_actual) || 0,
        clues_id: cluesFilter || null,
        region: regionFilter || null,
      });
    } catch (error: any) {
      console.error("Error fetching pacientes metrics", error);
      return NextResponse.json({ message: "Error al obtener métricas" }, { status: 500 });
    }
  }

  try {
    const where: string[] = [];
    const params: any[] = [];

    if (idFilter) {
      where.push("p.id = ?");
      params.push(idFilter);
    }
    if (cluesFilter) {
      where.push("p.clues_id = ?");
      params.push(cluesFilter);
    }
    if (regionFilter) {
      where.push("p.region = ?");
      params.push(regionFilter);
      if (!cluesFilter) {
        where.push("c.paciente_id IS NOT NULL");
      }
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // SELECT más completo cuando se consulta por ID (para detalle del paciente)
    const selectFields = idFilter ? `
      p.id, p.folio, p.nombre_completo, p.clues_id, p.unidad, p.municipio, p.region, p.fecha_ingreso_cpn, 
      p.edad,
      p.fum, p.fpp, p.semanas_gestacion, p.sdg_ingreso, p.riesgo_obstetrico_ingreso, 
      p.factor_riesgo_antecedentes, p.factor_riesgo_tamizajes, p.telefono, p.direccion,
      p.gestas, p.partos, p.cesareas, p.abortos,
      p.ant_preeclampsia, p.ant_hemorragia, p.ant_sepsis, p.ant_bajo_peso_macrosomia, p.ant_muerte_perinatal,
      p.factor_diabetes, p.factor_hipertension, p.factor_obesidad, p.factor_cardiopatia, p.factor_hepatopatia,
      p.factor_enf_autoinmune, p.factor_nefropatia, p.factor_coagulopatias, p.factor_neuropatia,
      p.factor_enf_psiquiatrica, p.factor_alcoholismo, p.factor_tabaquismo, p.factor_drogas_ilicitas,
      p.factores_riesgo_epid,
      d.prueba_vih, d.prueba_vdrl, d.prueba_hepatitis_c, d.diabetes_glicemia, d.violencia
    ` : `
      p.id, p.folio, p.nombre_completo, p.clues_id, p.unidad, p.municipio, p.fecha_ingreso_cpn, 
      p.edad,
      p.sdg_ingreso, p.semanas_gestacion, p.factor_riesgo_antecedentes, p.factor_riesgo_tamizajes,
      p.factor_cardiopatia, p.factor_hepatopatia, p.factor_coagulopatias, p.factor_nefropatia,
        c.last_consulta_id AS ultima_consulta_id,
      COALESCE(c.puntaje_consulta_parametros, 0) AS puntaje_ultima_consulta,
      COALESCE(
        c.puntaje_total_consulta,
        COALESCE(p.factor_riesgo_antecedentes, 0) + COALESCE(p.factor_riesgo_tamizajes, 0) + COALESCE(c.puntaje_consulta_parametros, 0)
      ) AS puntaje_total_actual
    `;

    const fromClause = idFilter ? `
      FROM cat_pacientes p
      LEFT JOIN detecciones d ON p.id = d.paciente_id
    ` : `
      FROM cat_pacientes p
      LEFT JOIN (
          SELECT c1.id AS last_consulta_id, c1.paciente_id, c1.puntaje_consulta_parametros, c1.puntaje_total_consulta
        FROM consultas_prenatales c1
        INNER JOIN (
          SELECT paciente_id, MAX(id) AS last_consulta_id
          FROM consultas_prenatales
          GROUP BY paciente_id
        ) last_c ON last_c.last_consulta_id = c1.id
      ) c ON c.paciente_id = p.id
    `;

    const rows = await query(
      `SELECT ${selectFields}
       ${fromClause}
       ${whereClause}
       ORDER BY ${idFilter ? 'p.created_at' : 'created_at'} DESC
       ${idFilter ? "LIMIT 1" : `LIMIT ${limit}`}`,
      params
    );

    if (idFilter) {
      if (!rows || rows.length === 0) {
        return NextResponse.json({ message: "Paciente no encontrado" }, { status: 404 });
      }
      return NextResponse.json(rows[0]);
    }

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("Error fetching pacientes", error);
    return NextResponse.json({ message: "Error al obtener pacientes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const gestacionCalculada = computeGestacionDesdeFum(body.fum);

    const nombre = (body.nombre_completo || "").trim();
    const clues = String(body.clues_id || "").trim().toUpperCase();
    if (!nombre) {
      return NextResponse.json({ message: "El nombre es obligatorio" }, { status: 400 });
    }
    if (!clues) {
      return NextResponse.json({ message: "La CLUES es obligatoria" }, { status: 400 });
    }

    const unidadRows: any = await query(
      `SELECT clues, unidad, region, municipio FROM cat_unidades WHERE clues = ? LIMIT 1`,
      [clues]
    );

    if (!unidadRows || unidadRows.length === 0) {
      return NextResponse.json(
        {
          message: `La CLUES ${clues} no existe en catálogo de unidades (cat_unidades). Importa el catálogo antes de registrar pacientes.`,
          code: "CLUES_NOT_FOUND",
        },
        { status: 400 }
      );
    }

    const unidadCatalogo = unidadRows[0];

    // Generar folio automáticamente si no se proporciona
    const folio = body.folio || await generarSiguienteFolio(clues);

    const payload = {
      folio: folio,
      region: body.region || unidadCatalogo.region || null,
      fecha_ingreso_cpn: body.fecha_ingreso_cpn || null,
      clues_id: clues,
      unidad: body.unidad || unidadCatalogo.unidad || null,
      tipo_localidad: body.tipo_localidad || null,
      hospital_referencia: body.hospital_referencia || null,
      municipio: body.municipio || unidadCatalogo.municipio || null,
      localidad: body.localidad || null,
      colonia: body.colonia || null,
      direccion: body.direccion || null,
      telefono: body.telefono || null,
      madrina_nombre: body.madrina_nombre || null,
      madrina_telefono: body.madrina_telefono || null,
      mecanismo_traslado: body.mecanismo_traslado || null,
      menarca: body.menarca || null,
      gestas: body.gestas || null,
      partos: body.partos || null,
      cesareas: body.cesareas || null,
      abortos: body.abortos || null,
      ant_preeclampsia: body.ant_preeclampsia ? 1 : 0,
      ant_hemorragia: body.ant_hemorragia ? 1 : 0,
      ant_sepsis: body.ant_sepsis ? 1 : 0,
      ant_bajo_peso_macrosomia: body.ant_bajo_peso_macrosomia ? 1 : 0,
      ant_muerte_perinatal: body.ant_muerte_perinatal ? 1 : 0,
      fum: gestacionCalculada.fum,
      fpp: gestacionCalculada.fpp,
      semanas_gestacion: gestacionCalculada.semanasGestacion,
      sdg_ingreso: body.sdg_ingreso || null,
      factores_riesgo_epid: body.factores_riesgo_epid || 'ninguno',
      imc_inicial: body.imc_inicial || null,
      ganancia_ponderal_max: body.ganancia_ponderal_max || null,
      tipo_riesgo_social: body.tipo_riesgo_social || null,
      riesgo_obstetrico_ingreso: body.riesgo_obstetrico_ingreso || null,
      nombre_completo: nombre,
      curp: body.curp || null,
      edad: body.edad || null,
      indigena: body.indigena ? 1 : 0,
      // Factores de riesgo (comorbilidades y toxicomanías)
      factor_diabetes: body.factor_diabetes ? 1 : 0,
      factor_hipertension: body.factor_hipertension ? 1 : 0,
      factor_obesidad: body.factor_obesidad ? 1 : 0,
      factor_cardiopatia: body.factor_cardiopatia ? 1 : 0,
      factor_hepatopatia: body.factor_hepatopatia ? 1 : 0,
      factor_enf_autoinmune: body.factor_enf_autoinmune ? 1 : 0,
      factor_nefropatia: body.factor_nefropatia ? 1 : 0,
      factor_coagulopatias: body.factor_coagulopatias ? 1 : 0,
      factor_neuropatia: body.factor_neuropatia ? 1 : 0,
      factor_enf_psiquiatrica: body.factor_enf_psiquiatrica ? 1 : 0,
      factor_alcoholismo: body.factor_alcoholismo ? 1 : 0,
      factor_tabaquismo: body.factor_tabaquismo ? 1 : 0,
      factor_drogas_ilicitas: body.factor_drogas_ilicitas ? 1 : 0,
      created_by: body.created_by || null,
      updated_by: body.updated_by || null,
    };

    const placeholders = Object.keys(payload)
      .map(() => "?")
      .join(", ");

    const values = Object.values(payload);

    const result: any = await query(
      `INSERT INTO cat_pacientes (${Object.keys(payload).join(", ")}) VALUES (${placeholders})`,
      values
    );

    const pacienteId = result.insertId;

    // Si se proporcionaron tamizajes iniciales, crear el registro de detecciones
    const detecciones = {
      prueba_vih: body.prueba_vih || null,
      prueba_vdrl: body.prueba_vdrl || null,
      prueba_hepatitis_c: body.prueba_hepatitis_c || null,
      diabetes_glicemia: body.diabetes_glicemia || null,
      violencia: body.violencia || null,
    };

    // Solo crear detecciones si al menos un campo está capturado
    const hayDetecciones = Object.values(detecciones).some(v => v !== null);
    
    if (hayDetecciones) {
      try {
        await query(
          `INSERT INTO detecciones 
           (paciente_id, prueba_vih, prueba_vdrl, prueba_hepatitis_c, diabetes_glicemia, violencia, created_by, updated_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            pacienteId,
            detecciones.prueba_vih,
            detecciones.prueba_vdrl,
            detecciones.prueba_hepatitis_c,
            detecciones.diabetes_glicemia,
            detecciones.violencia,
            body.created_by || null,
            body.updated_by || null,
          ]
        );
        console.log(`✅ Detecciones iniciales guardadas para paciente ${pacienteId}`);
      } catch (detError: any) {
        console.error("⚠️ Error guardando detecciones iniciales (paciente ya creado):", detError);
        // No fallar la creación del paciente si las detecciones fallan
      }
    }

    return NextResponse.json({ id: pacienteId, ...payload }, { status: 201 });
  } catch (error: any) {
    console.error("Error creando paciente", error);
    return NextResponse.json({ message: "Error al crear paciente" }, { status: 500 });
  }
}
