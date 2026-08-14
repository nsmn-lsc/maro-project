// app/api/sesiones/route.ts
/**
 * @deprecated Este endpoint pertenece al modelo legado `sesiones`.
 * El flujo canónico activo de MARO Hub utiliza `/api/colegiados` y `/api/estatal/colegiados`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { assertCluesScope, requireApiAuth } from '@/lib/apiAuth';

const DEPRECATION_WARNING = '299 - "Endpoint deprecado (/api/sesiones). Migrar a /api/colegiados"';

function deprecatedJsonResponse(body: any, init?: ResponseInit) {
  const res = NextResponse.json(body, init);
  res.headers.set('Warning', DEPRECATION_WARNING);
  res.headers.set('Deprecation', 'true');
  return res;
}

/**
 * @deprecated Usar /api/colegiados
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request, 1);
    if (!authResult.ok) return authResult.response;
    const auth = authResult.auth;

    const body = await request.json();
    let region = body?.region ? String(body.region).trim().toUpperCase() : '';
    const municipio = body?.municipio ? String(body.municipio).trim() : '';
    const unidad = body?.unidad ? String(body.unidad).trim() : '';
    let clues = body?.clues ? String(body.clues).trim().toUpperCase() : null;

    if (auth.nivel === 1) {
      if (!auth.cluesId) {
        return deprecatedJsonResponse({ error: 'Usuario CLUES sin alcance asignado' }, { status: 403 });
      }
      if (clues && clues !== auth.cluesId) {
        return deprecatedJsonResponse({ error: 'Sin permisos para registrar otra CLUES' }, { status: 403 });
      }
      clues = auth.cluesId;

      if (auth.region) {
        if (region && region !== auth.region) {
          return deprecatedJsonResponse({ error: 'Sin permisos para registrar otra región' }, { status: 403 });
        }
        region = auth.region;
      }
    }

    if (auth.nivel === 2) {
      if (!auth.region) {
        return deprecatedJsonResponse({ error: 'Usuario regional sin región asignada' }, { status: 403 });
      }
      if (region && region !== auth.region) {
        return deprecatedJsonResponse({ error: 'Sin permisos para registrar otra región' }, { status: 403 });
      }
      region = auth.region;

      if (clues) {
        const allowed = await assertCluesScope(clues, auth);
        if (!allowed) {
          return deprecatedJsonResponse({ error: 'Sin permisos para registrar esa CLUES' }, { status: 403 });
        }
      }
    }

    if (!region || !municipio || !unidad) {
      return deprecatedJsonResponse(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    const result = await query<any>(
      'INSERT INTO sesiones (region, municipio, unidad, clues) VALUES (?, ?, ?, ?)',
      [region, municipio, unidad, clues]
    );

    return deprecatedJsonResponse({
      success: true,
      sesionId: result.insertId,
      data: {
        id: result.insertId,
        region,
        municipio,
        unidad,
        clues,
      },
    });
  } catch (error: any) {
    console.error('Error al crear sesión:', error);
    return deprecatedJsonResponse(
      { error: 'Error al crear la sesión', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * @deprecated Usar /api/colegiados
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireApiAuth(request, 1);
    if (!authResult.ok) return authResult.response;
    const auth = authResult.auth;

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    const whereScope: string[] = [];
    const scopeParams: Array<string | number> = [];

    if (auth.nivel === 1) {
      if (!auth.cluesId) {
        return deprecatedJsonResponse({ error: 'Usuario CLUES sin alcance asignado' }, { status: 403 });
      }
      whereScope.push('UPPER(s.clues) = ?');
      scopeParams.push(String(auth.cluesId).trim().toUpperCase());
    } else if (auth.nivel === 2) {
      if (!auth.region) {
        return deprecatedJsonResponse({ error: 'Usuario regional sin región asignada' }, { status: 403 });
      }
      whereScope.push('UPPER(s.region) = ?');
      scopeParams.push(String(auth.region).trim().toUpperCase());
    }

    if (id) {
      const idNum = Number(id);
      if (!Number.isFinite(idNum) || idNum <= 0) {
        return deprecatedJsonResponse({ error: 'ID de sesión inválido' }, { status: 400 });
      }

      const where = ['s.id = ?', ...whereScope];
      const sesiones = await query<any[]>(
        `SELECT s.* FROM sesiones s WHERE ${where.join(' AND ')} LIMIT 1`,
        [idNum, ...scopeParams]
      );

      if (sesiones.length === 0) {
        return deprecatedJsonResponse(
          { error: 'Sesión no encontrada' },
          { status: 404 }
        );
      }

      const casos = await query<any[]>(
        'SELECT * FROM casos WHERE sesion_id = ?',
        [idNum]
      );

      return deprecatedJsonResponse({
        success: true,
        data: {
          ...sesiones[0],
          casos,
        },
      });
    }

    const whereClause = whereScope.length ? `WHERE ${whereScope.join(' AND ')}` : '';
    const sesiones = await query<any[]>(
      `SELECT s.* FROM sesiones s ${whereClause} ORDER BY s.created_at DESC`,
      scopeParams
    );

    return deprecatedJsonResponse({
      success: true,
      data: sesiones,
    });
  } catch (error: any) {
    console.error('Error al recuperar sesiones:', error);
    return deprecatedJsonResponse(
      { error: 'Error al recuperar las sesiones', details: error.message },
      { status: 500 }
    );
  }
}
