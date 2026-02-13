// src/app/api/casos/calcular-factor-riesgo/route.ts
/**
 * Endpoint para calcular el factor de riesgo obstétrico
 * Se integra con los datos existentes en la BD
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { calcularFactorRiesgo, DatosFactorRiesgo } from '@/lib/factorRiesgo';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { casoId } = body;

    if (!casoId) {
      return NextResponse.json(
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
      return NextResponse.json(
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

      // De la evaluación clínica
      embarazoMultiple: evaluacionData.embarazo_multiple,
      antecedentePreeclampsia: evaluacionData.antecedente_preeclampsia,
      antecedenteHemorragiaPosparto: evaluacionData.antecedente_hemorragia,
      diabetesPrevia: evaluacionData.diabetes_previa,
      diabetesGestacional: evaluacionData.diabetes_gestacional,
      hipertensionCronica: evaluacionData.hipertension_cronica,
      cardiopatia: evaluacionData.cardiopatia,
      nefropatia: evaluacionData.nefropatia,
      epilepsia: evaluacionData.epilepsia,
      VIH: evaluacionData.vih,
      sangradoVaginal: evaluacionData.sangrado_vaginal,
      salidaLiquido: evaluacionData.salida_liquido,
      dolorAbdominalIntenso: evaluacionData.dolor_abdominal_intenso,
      cefaleaSevera: evaluacionData.cefalea_severa,
      fosfenos: evaluacionData.fosfenos,
      epigastralgia: evaluacionData.epigastralgia,
      fiebre: evaluacionData.fiebre,
      disnea: evaluacionData.disnea,
      disminucionMovimientosFetales: evaluacionData.disminucion_movimientos_fetales,
      sistolica: evaluacionData.sistolica,
      diastolica: evaluacionData.diastolica,
      frecuenciaCardiaca: evaluacionData.frecuencia_cardiaca,
      frecuenciaRespiratoria: evaluacionData.frecuencia_respiratoria,
      saturacionO2: evaluacionData.saturacion_o2,
      temperatura: evaluacionData.temperatura,
      plaquetas: evaluacionData.plaquetas,
      creatinina: evaluacionData.creatinina,
      ast: evaluacionData.ast,
      alt: evaluacionData.alt,
      proteinuriaTira: evaluacionData.proteinuria_tira,
      imc: evaluacionData.imc,
    };

    // 4. Calcular factor de riesgo
    const resultado = calcularFactorRiesgo(datosRiesgo);

    // 5. Opcionalmente: guardar el score en la BD (tabla casos)
    // Necesitarías agregar una columna "score_factor_riesgo" en la tabla casos
    // await query(
    //   'UPDATE casos SET score_factor_riesgo = ? WHERE id = ?',
    //   [resultado.puntajeTotal, casoId]
    // );

    return NextResponse.json({
      success: true,
      casoId,
      resultado,
    });
  } catch (error: any) {
    console.error('Error al calcular factor de riesgo:', error);
    return NextResponse.json(
      { error: 'Error al calcular factor de riesgo', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET: Obtener factor de riesgo calculado de un caso
 * Uso: /api/casos/calcular-factor-riesgo?casoId=123
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const casoId = searchParams.get('casoId');

  if (!casoId) {
    return NextResponse.json(
      { error: 'ID del caso requerido' },
      { status: 400 }
    );
  }

  // Hacer POST interno con los mismos parámetros
  return POST(
    new NextRequest(request.url, {
      method: 'POST',
      body: JSON.stringify({ casoId: parseInt(casoId) }),
    })
  );
}
