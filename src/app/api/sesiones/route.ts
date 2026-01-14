// app/api/sesiones/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { region, municipio, unidad, clues } = body;

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
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (id) {
      const sesiones = await query<any[]>(
        'SELECT * FROM sesiones WHERE id = ?',
        [id]
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
    const sesiones = await query<any[]>(
      'SELECT * FROM sesiones ORDER BY created_at DESC LIMIT 50'
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
