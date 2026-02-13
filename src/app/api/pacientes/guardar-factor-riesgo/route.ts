/**
 * Endpoint para guardar los factores de riesgo (antecedentes y tamizajes) en cat_pacientes
 * POST /api/pacientes/guardar-factor-riesgo
 */

import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { pacienteId, factorRiesgoAntecedentes, factorRiesgoTamizajes } = await req.json();

    // Validar datos
    if (!pacienteId || factorRiesgoAntecedentes === undefined || factorRiesgoTamizajes === undefined) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos: pacienteId, factorRiesgoAntecedentes y factorRiesgoTamizajes' },
        { status: 400 }
      );
    }

    // Validar que sean números
    if (typeof factorRiesgoAntecedentes !== 'number' || factorRiesgoAntecedentes < 0) {
      return NextResponse.json(
        { error: 'factorRiesgoAntecedentes debe ser un número positivo' },
        { status: 400 }
      );
    }

    if (typeof factorRiesgoTamizajes !== 'number' || factorRiesgoTamizajes < 0) {
      return NextResponse.json(
        { error: 'factorRiesgoTamizajes debe ser un número positivo' },
        { status: 400 }
      );
    }

    // Actualizar en BD
    const sql = `
      UPDATE cat_pacientes 
      SET factor_riesgo_antecedentes = ?,
          factor_riesgo_tamizajes = ?,
          fecha_actualizacion_riesgo = NOW()
      WHERE id = ?
    `;

    const result = await query(sql, [factorRiesgoAntecedentes, factorRiesgoTamizajes, pacienteId]);

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { error: 'Paciente no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Factores de riesgo guardados correctamente',
      pacienteId,
      factorRiesgoAntecedentes,
      factorRiesgoTamizajes,
    });
  } catch (error) {
    console.error('Error al guardar factores de riesgo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
