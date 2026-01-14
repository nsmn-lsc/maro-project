// app/api/casos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
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

    if (!folio || !region || !municipio || !unidad || !pacienteIniciales) {
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
        region,
        municipio,
        unidad,
        clues || null,
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
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const folio = searchParams.get('folio');

    if (id) {
      const casos = await query<any[]>(
        'SELECT * FROM casos WHERE id = ?',
        [id]
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
      const casos = await query<any[]>(
        'SELECT * FROM casos WHERE folio = ?',
        [folio]
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
    const casos = await query<any[]>(
      'SELECT * FROM casos ORDER BY created_at DESC LIMIT 100'
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
    const body = await request.json();
    const { id, estatus, nivelRiesgo, scoreRiesgo, resumenClinico } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'ID del caso requerido' },
        { status: 400 }
      );
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

    values.push(id);

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
