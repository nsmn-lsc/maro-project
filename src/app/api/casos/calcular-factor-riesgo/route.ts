// src/app/api/casos/calcular-factor-riesgo/route.ts
/**
 * @deprecated Este endpoint pertenece al modelo legado `casos`.
 * Para el cálculo y guardado de factores de riesgo de pacientes activos, usar:
 * - POST `/api/pacientes/guardar-factor-riesgo`
 * - Motores puros en `@/lib/riesgoFactores` y `@/lib/factorRiesgo`
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { calcularFactorRiesgo, DatosFactorRiesgo } from '@/lib/factorRiesgo';

const DEPRECATION_WARNING = '299 - "Endpoint deprecado (/api/casos/calcular-factor-riesgo). Migrar a /api/pacientes/guardar-factor-riesgo"';

function deprecatedJsonResponse(body: any, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  res.headers.set('Warning', DEPRECATION_WARNING);
  res.headers.set('Deprecation', 'true');
  return res;
}

/**
 * @deprecated
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { casoId } = body;

    if (!casoId) {
      return deprecatedJsonResponse(
        { error: 'ID del caso requerido' },
        { status: 400 }
      );
    }

    // 1. Obtener datos del caso
    const casosResult = await query<any[]>(
      'SELECT edad, gesta, partos, cesareas_previas, semanas_gestacion FROM casos WHERE id = ?',
      [casoId]
    );

    if (!casosResult || casosResult.length === 0) {
      return deprecatedJsonResponse(
        { error: 'Caso no encontrado' },
        { status: 404 }
      );
    }

    const caseData = casosResult[0];

    // 2. Obtener datos de la evaluación clínica
    const evaluacionesResult = await query<any[]>(
      `SELECT 
        embarazo_multiple, antecedente_preeclampsia, antecedente_hemorragia,
        diabetes_previa, diabetes_gestacional, hipertension_cronica, cardiopatia,
        nefropatia, epilepsia, vih, sangrado_vaginal, salida_liquido,
        dolor_abdominal_intenso, cefalea_severa, fosfenos, epigastralgia,
        fiebre, disnea, disminucion_movimientos_fetales,
        sistolica, diastolica, frecuencia_cardiaca, frecuencia_respiratoria,
        saturacion_o2, temperatura, plaquetas, creatinina, ast, alt,
        proteinuria_tira, peso_kg, talla_cm, imc
      FROM evaluaciones_clinicas 
      WHERE caso_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1`,
      [casoId]
    );

    const evaluacionData = evaluacionesResult?.[0] || {};

    // 3. Construir objeto de datos para evaluación
    const datosRiesgo: DatosFactorRiesgo = {
      // Del caso
      edad: caseData.edad,
      gesta: caseData.gesta,
      partos: caseData.partos,
      cesareasPrevias: caseData.cesareas_previas,
      semanasGestacion: caseData.semanas_gestacion,
      // De la evaluación
      ...evaluacionData,
    };

    // 4. Calcular el factor de riesgo
    const resultado = calcularFactorRiesgo(datosRiesgo);

    // 5. Guardar en la tabla historial_factor_riesgo
    await query(
      `INSERT INTO historial_factor_riesgo 
       (caso_id, puntaje_total, categoria, detalles, sugerencias)
       VALUES (?, ?, ?, ?, ?)`,
      [
        casoId,
        resultado.puntajeTotal,
        resultado.categoria,
        JSON.stringify(resultado.detalles),
        JSON.stringify(resultado.sugerencias),
      ]
    );

    // 6. Actualizar el caso con el score calculado
    await query(
      `UPDATE casos 
       SET score_factor_riesgo = ?,
           categoria_riesgo_factor = ?,
           fecha_calculo_factor = NOW(),
           detalle_factor_riesgo = ?
       WHERE id = ?`,
      [
        resultado.puntajeTotal,
        resultado.categoria,
        JSON.stringify(resultado.detalles),
        casoId,
      ]
    );

    // 7. Retornar el resultado
    return deprecatedJsonResponse({
      success: true,
      data: {
        casoId,
        ...resultado,
        calculadoEn: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error calculando factor de riesgo:', error);
    return deprecatedJsonResponse(
      { error: 'Error al calcular factor de riesgo', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * @deprecated
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const casoId = searchParams.get('casoId');

    if (!casoId) {
      return deprecatedJsonResponse(
        { error: 'casoId requerido' },
        { status: 400 }
      );
    }

    // Obtener el último cálculo del caso
    const result = await query<any[]>(
      `SELECT 
        score_factor_riesgo as puntajeTotal,
        categoria_riesgo_factor as categoria,
        detalle_factor_riesgo as detalles,
        fecha_calculo_factor as calculadoEn
       FROM casos 
       WHERE id = ?`,
      [casoId]
    );

    if (!result || result.length === 0 || !result[0].puntajeTotal) {
      return deprecatedJsonResponse(
        { error: 'No hay cálculo previo para este caso' },
        { status: 404 }
      );
    }

    const data = result[0];
    if (typeof data.detalles === 'string') {
      data.detalles = JSON.parse(data.detalles);
    }

    return deprecatedJsonResponse({
      success: true,
      data: {
        casoId,
        ...data,
      },
    });
  } catch (error: any) {
    console.error('Error obteniendo factor de riesgo:', error);
    return deprecatedJsonResponse(
      { error: 'Error al obtener factor de riesgo', details: error.message },
      { status: 500 }
    );
  }
}
