import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireApiAuth } from "@/lib/apiAuth";
import {
  calcularEstadoSeguimiento,
  esPacienteCandidatoSeguimiento,
  validarSeguimientoRegional,
  normalizarFechaISO,
} from "@/lib/seguimiento-regional";

export async function GET(request: Request) {
  const authResult = await requireApiAuth(request, 2);
  if (!authResult.ok) return authResult.response;

  const { auth } = authResult;
  const { searchParams } = new URL(request.url);
  const pacienteIdParam = searchParams.get("paciente_id");
  const regionParam = searchParams.get("region");

  try {
    // 1. Consulta individual de un paciente específico
    if (pacienteIdParam) {
      const pacienteId = Number(pacienteIdParam);
      if (!Number.isFinite(pacienteId) || pacienteId <= 0) {
        return NextResponse.json({ message: "paciente_id inválido" }, { status: 400 });
      }

      const rows: any = await query(
        `SELECT 
          p.id, p.folio, p.nombre_completo, p.region, p.municipio, p.unidad, p.clues_id,
          p.fecha_ingreso_cpn, p.created_at, p.estado_embarazo,
          p.factor_riesgo_antecedentes, p.factor_riesgo_tamizajes,
          COALESCE(
            c.puntaje_total_consulta,
            COALESCE(p.factor_riesgo_antecedentes, 0) + COALESCE(p.factor_riesgo_tamizajes, 0) + COALESCE(c.puntaje_consulta_parametros, 0)
          ) AS puntaje_actual,
          COALESCE(c.riesgo_25_plus, CASE WHEN COALESCE(c.puntaje_total_consulta, 0) >= 25 THEN 1 ELSE 0 END) AS riesgo_25_plus,
          s.id AS seguimiento_id,
          s.fecha_consulta_externa,
          s.fecha_laboratorios,
          s.acciones_generales,
          s.created_at AS seguimiento_created_at,
          s.updated_at AS seguimiento_updated_at
        FROM cat_pacientes p
        LEFT JOIN consultas_prenatales c ON c.id = (
          SELECT MAX(c_sub.id) FROM consultas_prenatales c_sub WHERE c_sub.paciente_id = p.id
        )
        LEFT JOIN seguimiento_riesgo_regional s ON s.paciente_id = p.id
        WHERE p.id = ?
        LIMIT 1`,
        [pacienteId]
      );

      const item = rows?.[0];
      if (!item) {
        return NextResponse.json({ message: "Paciente no encontrado" }, { status: 404 });
      }

      // Validar región si es usuario regional (nivel 2)
      if (auth.nivel === 2 && auth.region) {
        const userRegion = auth.region.trim().toUpperCase();
        const pacRegion = String(item.region || "").trim().toUpperCase();
        if (userRegion !== pacRegion) {
          return NextResponse.json(
            { message: "No tienes permiso para ver pacientes de otra región" },
            { status: 403 }
          );
        }
      }

      const fechaRegistro = item.fecha_ingreso_cpn || item.created_at;
      const tieneSeguimiento = Boolean(item.seguimiento_id && item.fecha_consulta_externa);
      const evaluacion = calcularEstadoSeguimiento({
        tieneSeguimiento,
        fechaRegistro,
      });

      return NextResponse.json({
        paciente: {
          id: item.id,
          folio: item.folio,
          nombre_completo: item.nombre_completo,
          region: item.region,
          municipio: item.municipio,
          unidad: item.unidad,
          clues_id: item.clues_id,
          fecha_ingreso_cpn: item.fecha_ingreso_cpn,
          created_at: item.created_at,
          puntaje_actual: Number(item.puntaje_actual) || 0,
          riesgo_25_plus: Number(item.riesgo_25_plus) || 0,
          es_candidato: esPacienteCandidatoSeguimiento(item.puntaje_actual, item.riesgo_25_plus),
        },
        seguimiento: tieneSeguimiento
          ? {
              id: item.seguimiento_id,
              fecha_consulta_externa: normalizarFechaISO(item.fecha_consulta_externa),
              fecha_laboratorios: normalizarFechaISO(item.fecha_laboratorios),
              acciones_generales: item.acciones_generales,
              created_at: item.seguimiento_created_at,
              updated_at: item.seguimiento_updated_at,
            }
          : null,
        evaluacion,
      });
    }

    // 2. Consulta de lista de pacientes para la región activa
    let targetRegion = auth.region || "";
    if (auth.nivel >= 3 && regionParam) {
      targetRegion = regionParam.trim();
    }

    if (!targetRegion) {
      return NextResponse.json(
        { message: "No se especificó la región para listar los casos" },
        { status: 400 }
      );
    }

    const rows: any[] = await query(
      `SELECT 
        p.id, p.folio, p.nombre_completo, p.region, p.municipio, p.unidad, p.clues_id,
        p.fecha_ingreso_cpn, p.created_at, p.estado_embarazo,
        p.factor_riesgo_antecedentes, p.factor_riesgo_tamizajes,
        COALESCE(
          c.puntaje_total_consulta,
          COALESCE(p.factor_riesgo_antecedentes, 0) + COALESCE(p.factor_riesgo_tamizajes, 0) + COALESCE(c.puntaje_consulta_parametros, 0)
        ) AS puntaje_actual,
        COALESCE(c.riesgo_25_plus, CASE WHEN COALESCE(c.puntaje_total_consulta, 0) >= 25 THEN 1 ELSE 0 END) AS riesgo_25_plus,
        s.id AS seguimiento_id,
        s.fecha_consulta_externa,
        s.fecha_laboratorios,
        s.acciones_generales,
        s.created_at AS seguimiento_created_at,
        s.updated_at AS seguimiento_updated_at
      FROM cat_pacientes p
      LEFT JOIN consultas_prenatales c ON c.id = (
        SELECT MAX(c_sub.id) FROM consultas_prenatales c_sub WHERE c_sub.paciente_id = p.id
      )
      LEFT JOIN seguimiento_riesgo_regional s ON s.paciente_id = p.id
      WHERE UPPER(TRIM(p.region)) = UPPER(TRIM(?))
        AND (
          COALESCE(c.riesgo_25_plus, 0) = 1
          OR COALESCE(c.puntaje_total_consulta, p.factor_riesgo_antecedentes + p.factor_riesgo_tamizajes, 0) >= 25
        )
      ORDER BY 
        CASE WHEN s.id IS NULL THEN 0 ELSE 1 END ASC,
        p.created_at DESC`,
      [targetRegion]
    );

    let totalCandidatos = 0;
    let completados = 0;
    let enPlazo = 0;
    let vencidos = 0;

    const lista = (rows || []).map((row) => {
      totalCandidatos++;
      const fechaRegistro = row.fecha_ingreso_cpn || row.created_at;
      const tieneSeguimiento = Boolean(row.seguimiento_id && row.fecha_consulta_externa);
      const evaluacion = calcularEstadoSeguimiento({
        tieneSeguimiento,
        fechaRegistro,
      });

      if (evaluacion.estado === "COMPLETADO") completados++;
      else if (evaluacion.estado === "EN_PLAZO") enPlazo++;
      else if (evaluacion.estado === "VENCIDO") vencidos++;

      return {
        id: row.id,
        folio: row.folio,
        nombre_completo: row.nombre_completo,
        region: row.region,
        municipio: row.municipio,
        unidad: row.unidad,
        clues_id: row.clues_id,
        fecha_ingreso_cpn: row.fecha_ingreso_cpn,
        created_at: row.created_at,
        puntaje_actual: Number(row.puntaje_actual) || 0,
        riesgo_25_plus: Number(row.riesgo_25_plus) || 0,
        seguimiento: tieneSeguimiento
          ? {
              id: row.seguimiento_id,
              fecha_consulta_externa: normalizarFechaISO(row.fecha_consulta_externa),
              fecha_laboratorios: normalizarFechaISO(row.fecha_laboratorios),
              acciones_generales: row.acciones_generales,
              updated_at: row.seguimiento_updated_at,
            }
          : null,
        evaluacion,
      };
    });

    return NextResponse.json({
      resumen: {
        total_candidatos: totalCandidatos,
        completados,
        en_plazo: enPlazo,
        vencidos,
      },
      pacientes: lista,
    });
  } catch (error: any) {
    console.error("Error en GET /api/region/seguimiento-riesgo:", error);
    return NextResponse.json(
      { message: "Error interno al consultar seguimiento regional", error: error?.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authResult = await requireApiAuth(request, 2);
  if (!authResult.ok) return authResult.response;

  const { auth } = authResult;

  try {
    const body = await request.json();
    const pacienteId = Number(body?.paciente_id);

    if (!Number.isFinite(pacienteId) || pacienteId <= 0) {
      return NextResponse.json({ message: "paciente_id válido es requerido" }, { status: 400 });
    }

    // 1. Obtener datos de la paciente
    const rows: any = await query(
      `SELECT 
        p.id, p.region, p.fecha_ingreso_cpn, p.created_at,
        p.factor_riesgo_antecedentes, p.factor_riesgo_tamizajes,
        COALESCE(
          c.puntaje_total_consulta,
          COALESCE(p.factor_riesgo_antecedentes, 0) + COALESCE(p.factor_riesgo_tamizajes, 0) + COALESCE(c.puntaje_consulta_parametros, 0)
        ) AS puntaje_actual,
        COALESCE(c.riesgo_25_plus, CASE WHEN COALESCE(c.puntaje_total_consulta, 0) >= 25 THEN 1 ELSE 0 END) AS riesgo_25_plus
      FROM cat_pacientes p
      LEFT JOIN consultas_prenatales c ON c.id = (
        SELECT MAX(c_sub.id) FROM consultas_prenatales c_sub WHERE c_sub.paciente_id = p.id
      )
      WHERE p.id = ?
      LIMIT 1`,
      [pacienteId]
    );

    const paciente = rows?.[0];
    if (!paciente) {
      return NextResponse.json({ message: "Paciente no encontrado" }, { status: 404 });
    }

    // 2. Control de acceso: Verificar que pertenezca a la región del usuario regional
    if (auth.nivel === 2 && auth.region) {
      const userRegion = auth.region.trim().toUpperCase();
      const pacRegion = String(paciente.region || "").trim().toUpperCase();
      if (userRegion !== pacRegion) {
        return NextResponse.json(
          {
            message: "No tienes permiso para registrar acciones de seguimiento en otra región",
            region_usuario: userRegion,
            region_paciente: pacRegion,
          },
          { status: 403 }
        );
      }
    }

    // 3. Verificar que la paciente califique al protocolo (> 25 pts)
    const califica = esPacienteCandidatoSeguimiento(paciente.puntaje_actual, paciente.riesgo_25_plus);
    if (!califica) {
      return NextResponse.json(
        {
          message:
            "El protocolo de seguimiento regional aplica únicamente a pacientes con riesgo mayor a 25 puntos.",
          puntaje_actual: paciente.puntaje_actual,
        },
        { status: 422 }
      );
    }

    // 4. Validar fechas y longitud de acciones generales
    const fechaRegistro = paciente.fecha_ingreso_cpn || paciente.created_at;
    const validacion = validarSeguimientoRegional(body, fechaRegistro);

    if (!validacion.valido) {
      return NextResponse.json(
        {
          message: "Errores de validación en el formulario de seguimiento",
          errores: validacion.errores,
        },
        { status: 400 }
      );
    }

    const fechaConsultaExterna = normalizarFechaISO(body.fecha_consulta_externa);
    const fechaLaboratorios = normalizarFechaISO(body.fecha_laboratorios);
    const accionesGenerales = String(body.acciones_generales || "").trim();
    const regionPaciente = paciente.region || auth.region || "DESCONOCIDA";

    // 5. Guardar o actualizar registro de seguimiento regional (UPSERT)
    await query(
      `INSERT INTO seguimiento_riesgo_regional (
        paciente_id, region, fecha_consulta_externa, fecha_laboratorios, acciones_generales, created_by, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        fecha_consulta_externa = VALUES(fecha_consulta_externa),
        fecha_laboratorios = VALUES(fecha_laboratorios),
        acciones_generales = VALUES(acciones_generales),
        updated_by = VALUES(updated_by),
        updated_at = CURRENT_TIMESTAMP`,
      [
        pacienteId,
        regionPaciente,
        fechaConsultaExterna,
        fechaLaboratorios,
        accionesGenerales,
        auth.userId || null,
        auth.userId || null,
      ]
    );

    const evaluacion = calcularEstadoSeguimiento({
      tieneSeguimiento: true,
      fechaRegistro,
    });

    return NextResponse.json({
      ok: true,
      message: "Plan de seguimiento regional guardado con éxito",
      paciente_id: pacienteId,
      seguimiento: {
        fecha_consulta_externa: fechaConsultaExterna,
        fecha_laboratorios: fechaLaboratorios,
        acciones_generales: accionesGenerales,
      },
      evaluacion,
    });
  } catch (error: any) {
    console.error("Error en POST /api/region/seguimiento-riesgo:", error);
    return NextResponse.json(
      { message: "Error interno al guardar seguimiento regional", error: error?.message },
      { status: 500 }
    );
  }
}
