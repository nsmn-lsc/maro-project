// app/api/evaluaciones/route.ts
/**
 * @deprecated Este endpoint pertenece al modelo legado `casos` / `evaluaciones_clinicas`.
 * Para el registro clínico activo, utilizar `/api/consultas`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireApiAuth } from '@/lib/apiAuth';

const DEPRECATION_WARNING = '299 - "Endpoint deprecado (/api/evaluaciones). Migrar a /api/consultas"';

function deprecatedJsonResponse(body: any, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  res.headers.set('Warning', DEPRECATION_WARNING);
  res.headers.set('Deprecation', 'true');
  return res;
}

function normalizeUpper(value: unknown): string {
  return String(value || '').trim().toUpperCase();
}

async function canAccessCaso(casoId: number, auth: { nivel: number; cluesId: string | null; region: string | null }) {
  const rows = await query<Array<{ clues: string | null; region: string | null }>>(
    `SELECT clues, region FROM casos WHERE id = ? LIMIT 1`,
    [casoId]
  );

  if (!rows || rows.length === 0) return false;
  const row = rows[0];

  if (auth.nivel >= 3) return true;
  if (auth.nivel === 2) {
    return !!auth.region && !!row.region && normalizeUpper(auth.region) === normalizeUpper(row.region);
  }

  return !!auth.cluesId && !!row.clues && normalizeUpper(auth.cluesId) === normalizeUpper(row.clues);
}

/**
 * @deprecated Usar POST /api/consultas
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request, 1);
    if (!authResult.ok) return authResult.response;
    const auth = authResult.auth;

    const body = await request.json();
    const { casoId, ...evaluacion } = body;

    if (!casoId) {
      return deprecatedJsonResponse(
        { error: 'ID del caso requerido' },
        { status: 400 }
      );
    }

    const casoIdNum = Number(casoId);
    if (!Number.isFinite(casoIdNum) || casoIdNum <= 0) {
      return deprecatedJsonResponse({ error: 'ID del caso inválido' }, { status: 400 });
    }

    const allowed = await canAccessCaso(casoIdNum, auth);
    if (!allowed) {
      return deprecatedJsonResponse({ error: 'Sin permisos para registrar evaluación en este caso' }, { status: 403 });
    }

    const result = await query<any>(
      `INSERT INTO evaluaciones_clinicas (
        caso_id, embarazo_multiple, antecedente_preeclampsia, antecedente_hemorragia,
        diabetes_previa, diabetes_gestacional, hipertension_cronica, cardiopatia,
        nefropatia, epilepsia, vih, sangrado_vaginal, salida_liquido,
        dolor_abdominal_intenso, cefalea_severa, fosfenos, epigastralgia,
        convulsiones, fiebre, disnea, dolor_toracico, alteracion_estado_mental,
        disminucion_movimientos_fetales, sistolica, diastolica, frecuencia_cardiaca,
        frecuencia_respiratoria, saturacion_o2, temperatura, plaquetas,
        creatinina, ast, alt, proteinuria_tira, peso_kg, talla_cm, imc, fondo_uterino_cm
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        casoIdNum,
        evaluacion.embarazoMultiple || false,
        evaluacion.antecedentePreeclampsia || false,
        evaluacion.antecedenteHemorragia || false,
        evaluacion.diabetesPrevia || false,
        evaluacion.diabetesGestacional || false,
        evaluacion.hipertensionCronica || false,
        evaluacion.cardiopatia || false,
        evaluacion.nefropatia || false,
        evaluacion.epilepsia || false,
        evaluacion.vih || false,
        evaluacion.sangradoVaginal || false,
        evaluacion.salidaLiquido || false,
        evaluacion.dolorAbdominalIntenso || false,
        evaluacion.cefaleaSevera || false,
        evaluacion.fosfenos || false,
        evaluacion.epigastralgia || false,
        evaluacion.convulsiones || false,
        evaluacion.fiebre || false,
        evaluacion.disnea || false,
        evaluacion.dolorToracico || false,
        evaluacion.alteracionEstadoMental || false,
        evaluacion.disminucionMovimientosFetales || false,
        evaluacion.sistolica || null,
        evaluacion.diastolica || null,
        evaluacion.frecuenciaCardiaca || null,
        evaluacion.frecuenciaRespiratoria || null,
        evaluacion.saturacionO2 || null,
        evaluacion.temperatura || null,
        evaluacion.plaquetas || null,
        evaluacion.creatinina || null,
        evaluacion.ast || null,
        evaluacion.alt || null,
        evaluacion.proteinuriaTira || null,
        evaluacion.pesoKg || null,
        evaluacion.tallaCm || null,
        evaluacion.imc || null,
        evaluacion.fondoUterinoCm || null,
      ]
    );

    return deprecatedJsonResponse({
      success: true,
      evaluacionId: result.insertId,
    });
  } catch (error: any) {
    console.error('Error al guardar evaluación:', error);
    return deprecatedJsonResponse(
      { error: 'Error al guardar la evaluación', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * @deprecated Usar GET /api/consultas
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request, 1);
    if (!authResult.ok) return authResult.response;
    const auth = authResult.auth;

    const searchParams = request.nextUrl.searchParams;
    const casoId = searchParams.get('casoId');

    if (!casoId) {
      return deprecatedJsonResponse(
        { error: 'ID del caso requerido' },
        { status: 400 }
      );
    }

    const casoIdNum = Number(casoId);
    if (!Number.isFinite(casoIdNum) || casoIdNum <= 0) {
      return deprecatedJsonResponse({ error: 'ID del caso inválido' }, { status: 400 });
    }

    const allowed = await canAccessCaso(casoIdNum, auth);
    if (!allowed) {
      return deprecatedJsonResponse({ error: 'Sin permisos para consultar este caso' }, { status: 403 });
    }

    const evaluaciones = await query<any[]>(
      'SELECT * FROM evaluaciones_clinicas WHERE caso_id = ? ORDER BY created_at DESC',
      [casoIdNum]
    );

    return deprecatedJsonResponse({
      success: true,
      data: evaluaciones,
    });
  } catch (error: any) {
    console.error('Error al recuperar evaluaciones:', error);
    return deprecatedJsonResponse(
      { error: 'Error al recuperar las evaluaciones', details: error.message },
      { status: 500 }
    );
  }
}
