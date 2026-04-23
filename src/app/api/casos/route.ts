// app/api/casos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { assertCluesScope, requireApiAuth } from '@/lib/apiAuth';

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
    const {
      folio,
      sesionId,
      region,
      municipio,
      unidad,
      clues,
      nivelAtencion,
      pacienteIniciales,
      edad,
      semanasGestacion,
      trimestre,
      gesta,
      partos,
      cesareasPrevias,
      estatus,
      nivelRiesgo,
      scoreRiesgo,
      resumenClinico,
    } = body;

    let regionNormalized = normalizeUpper(region);
    let cluesNormalized = normalizeUpper(clues) || null;

    if (auth.nivel === 1) {
      if (!auth.cluesId) {
        return NextResponse.json({ error: 'Usuario CLUES sin alcance asignado' }, { status: 403 });
      }

      if (cluesNormalized && cluesNormalized !== normalizeUpper(auth.cluesId)) {
        return NextResponse.json({ error: 'Sin permisos para registrar otro CLUES' }, { status: 403 });
      }

      cluesNormalized = normalizeUpper(auth.cluesId);
      if (auth.region) {
        regionNormalized = normalizeUpper(auth.region);
      }
    }

    if (auth.nivel === 2) {
      if (!auth.region) {
        return NextResponse.json({ error: 'Usuario regional sin región asignada' }, { status: 403 });
      }

      regionNormalized = normalizeUpper(auth.region);
      if (cluesNormalized) {
        const allowed = await assertCluesScope(cluesNormalized, auth);
        if (!allowed) {
          return NextResponse.json({ error: 'Sin permisos para registrar ese CLUES' }, { status: 403 });
        }
      }
    }

    if (!folio || !regionNormalized || !municipio || !unidad || !pacienteIniciales) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    const result = await query<any>(
      `INSERT INTO casos (
        folio, sesion_id, region, municipio, unidad, clues, nivel_atencion,
        paciente_iniciales, edad, semanas_gestacion, trimestre, gesta, partos,
        cesareas_previas, estatus, nivel_riesgo, score_riesgo, resumen_clinico
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        folio,
        sesionId || null,
        regionNormalized,
        municipio,
        unidad,
        cluesNormalized,
        nivelAtencion || 'Primer Nivel',
        pacienteIniciales,
        edad || null,
        semanasGestacion || null,
        trimestre || null,
        gesta || null,
        partos || null,
        cesareasPrevias || null,
        estatus || 'BORRADOR',
        nivelRiesgo || null,
        scoreRiesgo || null,
        resumenClinico || null,
      ]
    );

    return NextResponse.json({
      success: true,
      casoId: result.insertId,
      folio,
    });
  } catch (error: any) {
    console.error('Error al guardar caso:', error);
    return NextResponse.json(
      { error: 'Error al guardar el caso', details: error.message },
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
    const id = searchParams.get('id');
    const folio = searchParams.get('folio');

    const whereScope: string[] = [];
    const scopeParams: Array<string | number> = [];

    if (auth.nivel === 1) {
      if (!auth.cluesId) {
        return NextResponse.json({ error: 'Usuario CLUES sin alcance asignado' }, { status: 403 });
      }
      whereScope.push('UPPER(c.clues) = ?');
      scopeParams.push(normalizeUpper(auth.cluesId));
    } else if (auth.nivel === 2) {
      if (!auth.region) {
        return NextResponse.json({ error: 'Usuario regional sin región asignada' }, { status: 403 });
      }
      whereScope.push('UPPER(c.region) = ?');
      scopeParams.push(normalizeUpper(auth.region));
    }

    if (id) {
      const idNum = Number(id);
      if (!Number.isFinite(idNum) || idNum <= 0) {
        return NextResponse.json({ error: 'ID de caso inválido' }, { status: 400 });
      }

      const where = ['c.id = ?', ...whereScope];
      const casos = await query<any[]>(
        `SELECT c.* FROM casos c WHERE ${where.join(' AND ')} LIMIT 1`,
        [idNum, ...scopeParams]
      );

      if (casos.length === 0) {
        return NextResponse.json(
          { error: 'Caso no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: casos[0] });
    }

    if (folio) {
      const where = ['c.folio = ?', ...whereScope];
      const casos = await query<any[]>(
        `SELECT c.* FROM casos c WHERE ${where.join(' AND ')} LIMIT 1`,
        [folio, ...scopeParams]
      );

      if (casos.length === 0) {
        return NextResponse.json(
          { error: 'Caso no encontrado' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: casos[0] });
    }

    // Listar todos los casos
    const whereClause = whereScope.length ? `WHERE ${whereScope.join(' AND ')}` : '';
    const casos = await query<any[]>(
      `SELECT c.* FROM casos c ${whereClause} ORDER BY c.created_at DESC LIMIT 100`,
      scopeParams
    );

    return NextResponse.json({ success: true, data: casos });
  } catch (error: any) {
    console.error('Error al recuperar casos:', error);
    return NextResponse.json(
      { error: 'Error al recuperar los casos', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request, 1);
    if (!authResult.ok) return authResult.response;
    const auth = authResult.auth;

    const body = await request.json();
    const { id, estatus, nivelRiesgo, scoreRiesgo, resumenClinico } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID del caso requerido' },
        { status: 400 }
      );
    }

    const idNum = Number(id);
    if (!Number.isFinite(idNum) || idNum <= 0) {
      return NextResponse.json({ error: 'ID de caso inválido' }, { status: 400 });
    }

    const allowed = await canAccessCaso(idNum, auth);
    if (!allowed) {
      return NextResponse.json({ error: 'Sin permisos para actualizar este caso' }, { status: 403 });
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (estatus) {
      updates.push('estatus = ?');
      values.push(estatus);
    }
    if (nivelRiesgo) {
      updates.push('nivel_riesgo = ?');
      values.push(nivelRiesgo);
    }
    if (scoreRiesgo !== undefined) {
      updates.push('score_riesgo = ?');
      values.push(scoreRiesgo);
    }
    if (resumenClinico) {
      updates.push('resumen_clinico = ?');
      values.push(resumenClinico);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No hay campos para actualizar' },
        { status: 400 }
      );
    }

    values.push(idNum);

    await query(
      `UPDATE casos SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error al actualizar caso:', error);
    return NextResponse.json(
      { error: 'Error al actualizar el caso', details: error.message },
      { status: 500 }
    );
  }
}
