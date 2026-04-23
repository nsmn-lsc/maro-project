// app/api/evaluaciones/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireApiAuth } from '@/lib/apiAuth';

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

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request, 1);
    if (!authResult.ok) return authResult.response;
    const auth = authResult.auth;

    const body = await request.json();
    const { casoId, ...evaluacion } = body;

    if (!casoId) {
      return NextResponse.json(
        { error: 'ID del caso requerido' },
        { status: 400 }
      );
    }

    const casoIdNum = Number(casoId);
    if (!Number.isFinite(casoIdNum) || casoIdNum <= 0) {
      return NextResponse.json({ error: 'ID del caso inválido' }, { status: 400 });
    }

    const allowed = await canAccessCaso(casoIdNum, auth);
    if (!allowed) {
      return NextResponse.json({ error: 'Sin permisos para registrar evaluación en este caso' }, { status: 403 });
    }

    const result = await query<any>(
      `INSERT INTO evaluaciones_clinicas (
        caso_id, embarazo_multiple, antecedente_preeclampsia, antecedente_hemorragia,
        diabetes_previa, diabetes_gestacional, hipertension_cronica, cardiopatia,
        nefropatia, epilepsia, vih, sangrado_vaginal, salida_liquido,
        dolor_abdominal_intenso, cefalea_severa, fosfenos, epigastralgia,
        convulsiones, fiebre, disnea, dolor_toracico, alteracion_estado_mental,
        disminucion_movimientos_fetales, sistolica, diastolica, frecuencia_cardiaca,
        frecuencia_respiratoria, saturacion_o2, temperatura, plaquetas, creatinina,
        ast, alt, proteinuria_tira, peso_kg, talla_cm, imc, fondo_uterino_cm
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

    return NextResponse.json({
      success: true,
      evaluacionId: result.insertId,
    });
  } catch (error: any) {
    console.error('Error al guardar evaluación clínica:', error);
    return NextResponse.json(
      { error: 'Error al guardar la evaluación', details: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request, 1);
    if (!authResult.ok) return authResult.response;
    const auth = authResult.auth;

    const searchParams = request.nextUrl.searchParams;
    const casoId = searchParams.get('casoId');

    if (!casoId) {
      return NextResponse.json(
        { error: 'ID del caso requerido' },
        { status: 400 }
      );
    }

    const casoIdNum = Number(casoId);
    if (!Number.isFinite(casoIdNum) || casoIdNum <= 0) {
      return NextResponse.json({ error: 'ID del caso inválido' }, { status: 400 });
    }

    const allowed = await canAccessCaso(casoIdNum, auth);
    if (!allowed) {
      return NextResponse.json({ error: 'Sin permisos para consultar esta evaluación' }, { status: 403 });
    }

    const evaluaciones = await query<any[]>(
      'SELECT * FROM evaluaciones_clinicas WHERE caso_id = ? ORDER BY created_at DESC LIMIT 1',
      [casoIdNum]
    );

    if (evaluaciones.length === 0) {
      return NextResponse.json(
        { error: 'Evaluación no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: evaluaciones[0] });
  } catch (error: any) {
    console.error('Error al recuperar evaluación clínica:', error);
    return NextResponse.json(
      { error: 'Error al recuperar la evaluación', details: error.message },
      { status: 500 }
    );
  }
}
