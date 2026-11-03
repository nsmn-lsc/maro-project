import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireApiAuth } from "@/lib/apiAuth";
import {
  calcularEstadoSeguimiento,
  normalizarFechaISO,
  type EstadoAlertaSeguimiento,
} from "@/lib/seguimiento-regional";

export async function GET(request: Request) {
  const authResult = await requireApiAuth(request, 3); // Nivel Estatal o Admin
  if (!authResult.ok) return authResult.response;

  const { searchParams } = new URL(request.url);
  const regionParam = searchParams.get("region")?.trim();
  const estadoParam = searchParams.get("estado")?.trim().toUpperCase();
  const busquedaParam = searchParams.get("busqueda")?.trim().toLowerCase();

  try {
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
      WHERE (
        COALESCE(c.riesgo_25_plus, 0) = 1
        OR COALESCE(c.puntaje_total_consulta, p.factor_riesgo_antecedentes + p.factor_riesgo_tamizajes, 0) >= 25
      )
      ORDER BY 
        CASE 
          WHEN s.id IS NULL AND DATEDIFF(CURDATE(), COALESCE(p.fecha_ingreso_cpn, DATE(p.created_at))) > 7 THEN 0
          WHEN s.id IS NULL THEN 1
          ELSE 2 
        END ASC,
        p.created_at DESC`
    );

    let totalAltoRiesgo = 0;
    let alertasVencidas = 0;
    let pendientesEnPlazo = 0;
    let completados = 0;

    const regionesMap = new Map<
      string,
      { total: number; alertas_vencidas: number; en_plazo: number; completados: number }
    >();

    const casosProcesados = (rows || []).map((row) => {
      totalAltoRiesgo++;
      const regionNorm = (row.region || "SIN REGIÓN").trim().toUpperCase();
      const fechaRegistro = row.fecha_ingreso_cpn || row.created_at;
      const tieneSeguimiento = Boolean(row.seguimiento_id && row.fecha_consulta_externa);

      const evaluacion = calcularEstadoSeguimiento({
        tieneSeguimiento,
        fechaRegistro,
      });

      if (evaluacion.estado === "VENCIDO") alertasVencidas++;
      else if (evaluacion.estado === "EN_PLAZO") pendientesEnPlazo++;
      else if (evaluacion.estado === "COMPLETADO") completados++;

      // Acumular estadísticas por región
      const statReg = regionesMap.get(regionNorm) || {
        total: 0,
        alertas_vencidas: 0,
        en_plazo: 0,
        completados: 0,
      };
      statReg.total++;
      if (evaluacion.estado === "VENCIDO") statReg.alertas_vencidas++;
      else if (evaluacion.estado === "EN_PLAZO") statReg.en_plazo++;
      else if (evaluacion.estado === "COMPLETADO") statReg.completados++;
      regionesMap.set(regionNorm, statReg);

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

    // Construir tabla de resumen por región
    const resumenPorRegion = Array.from(regionesMap.entries())
      .map(([reg, val]) => ({
        region: reg,
        total: val.total,
        alertas_vencidas: val.alertas_vencidas,
        en_plazo: val.en_plazo,
        completados: val.completados,
        porcentaje_cumplimiento: val.total > 0 ? Math.round((val.completados / val.total) * 100) : 0,
      }))
      .sort((a, b) => b.alertas_vencidas - a.alertas_vencidas || b.total - a.total);

    // Filtrar casos según los parámetros de búsqueda del usuario estatal
    let casosFiltrados = casosProcesados;

    if (regionParam && regionParam !== "TODAS") {
      const regUpper = regionParam.toUpperCase();
      casosFiltrados = casosFiltrados.filter(
        (c) => String(c.region || "").trim().toUpperCase() === regUpper
      );
    }

    if (estadoParam && ["VENCIDO", "EN_PLAZO", "COMPLETADO"].includes(estadoParam)) {
      casosFiltrados = casosFiltrados.filter(
        (c) => c.evaluacion.estado === (estadoParam as EstadoAlertaSeguimiento)
      );
    }

    if (busquedaParam) {
      casosFiltrados = casosFiltrados.filter(
        (c) =>
          c.nombre_completo?.toLowerCase().includes(busquedaParam) ||
          c.folio?.toLowerCase().includes(busquedaParam) ||
          c.clues_id?.toLowerCase().includes(busquedaParam) ||
          c.unidad?.toLowerCase().includes(busquedaParam) ||
          c.municipio?.toLowerCase().includes(busquedaParam)
      );
    }

    return NextResponse.json({
      metricas: {
        total_alto_riesgo: totalAltoRiesgo,
        alertas_vencidas: alertasVencidas,
        pendientes_en_plazo: pendientesEnPlazo,
        completados,
        porcentaje_global_cumplimiento:
          totalAltoRiesgo > 0 ? Math.round((completados / totalAltoRiesgo) * 100) : 0,
      },
      resumen_por_region: resumenPorRegion,
      casos: casosFiltrados,
    });
  } catch (error: any) {
    console.error("Error en GET /api/estatal/alertas-seguimiento:", error);
    return NextResponse.json(
      { message: "Error interno al consultar alertas de seguimiento estatal", error: error?.message },
      { status: 500 }
    );
  }
}
