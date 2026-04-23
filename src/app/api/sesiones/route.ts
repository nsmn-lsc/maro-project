// app/api/sesiones/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { assertCluesScope, requireApiAuth } from '@/lib/apiAuth';

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
        return NextResponse.json({ error: 'Usuario CLUES sin alcance asignado' }, { status: 403 });
      }
      if (clues && clues !== auth.cluesId) {
        return NextResponse.json({ error: 'Sin permisos para registrar otra CLUES' }, { status: 403 });
      }
      clues = auth.cluesId;

      if (auth.region) {
        if (region && region !== auth.region) {
          return NextResponse.json({ error: 'Sin permisos para registrar otra región' }, { status: 403 });
        }
        region = auth.region;
      }
    }

    if (auth.nivel === 2) {
      if (!auth.region) {
        return NextResponse.json({ error: 'Usuario regional sin región asignada' }, { status: 403 });
      }
      if (region && region !== auth.region) {
        return NextResponse.json({ error: 'Sin permisos para registrar otra región' }, { status: 403 });
      }
      region = auth.region;

      if (clues) {
        const allowed = await assertCluesScope(clues, auth);
        if (!allowed) {
          return NextResponse.json({ error: 'Sin permisos para registrar esa CLUES' }, { status: 403 });
        }
      }
    }

    if (!region || !municipio || !unidad) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    const result = await query<any>(
      'INSERT INTO sesiones (region, municipio, unidad, clues) VALUES (?, ?, ?, ?)',
      [region, municipio, unidad, clues || null]
    );

    return NextResponse.json({
      success: true,
      sesionId: result.insertId,
      data: { region, municipio, unidad, clues }
    });
  } catch (error: any) {
    console.error('Error al guardar sesión:', error);
    return NextResponse.json(
      { error: 'Error al guardar los datos', details: error.message },
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

    const where: string[] = [];
    const params: Array<string | number> = [];

    if (auth.nivel === 1) {
      if (!auth.cluesId) {
        return NextResponse.json({ error: 'Usuario CLUES sin alcance asignado' }, { status: 403 });
      }
      where.push('clues = ?');
      params.push(auth.cluesId);
    } else if (auth.nivel === 2) {
      if (!auth.region) {
        return NextResponse.json({ error: 'Usuario regional sin región asignada' }, { status: 403 });
      }
      where.push('region = ?');
      params.push(auth.region);
    }

    if (id) {
      const idNum = Number(id);
      if (!Number.isFinite(idNum) || idNum <= 0) {
        return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
      }

      where.push('id = ?');
      params.push(idNum);
      const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const sesiones = await query<any[]>(
        `SELECT id, region, municipio, unidad, clues, created_at
         FROM sesiones
         ${whereClause}
         LIMIT 1`,
        params
      );
      
      if (sesiones.length === 0) {
        return NextResponse.json(
          { error: 'Sesión no encontrada' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: sesiones[0] });
    }

    // Listar últimas sesiones
    const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sesiones = await query<any[]>(
      `SELECT id, region, municipio, unidad, clues, created_at
       FROM sesiones
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT 50`,
      params
    );

    return NextResponse.json({ success: true, data: sesiones });
  } catch (error: any) {
    console.error('Error al recuperar sesiones:', error);
    return NextResponse.json(
      { error: 'Error al recuperar los datos', details: error.message },
      { status: 500 }
    );
  }
}
