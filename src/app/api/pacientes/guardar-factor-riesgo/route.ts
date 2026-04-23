/**
 * Endpoint para guardar los factores de riesgo (antecedentes y tamizajes) en cat_pacientes
 * POST /api/pacientes/guardar-factor-riesgo
 */

import { query } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { assertPacienteScope, requireApiAuth } from '@/lib/apiAuth';

export async function POST(req: NextRequest) {
  const authResult = await requireApiAuth(req, 1);
  if (!authResult.ok) return authResult.response;
  const auth = authResult.auth;

  try {
    const { pacienteId, factorRiesgoAntecedentes, factorRiesgoTamizajes } = await req.json();

    // Validar datos
    if (!pacienteId || factorRiesgoAntecedentes === undefined || factorRiesgoTamizajes === undefined) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos: pacienteId, factorRiesgoAntecedentes y factorRiesgoTamizajes' },
        { status: 400 }
      );
    }

    const pacienteIdNum = Number(pacienteId);
    if (!Number.isFinite(pacienteIdNum) || pacienteIdNum <= 0) {
      return NextResponse.json(
        { error: 'pacienteId debe ser un número válido' },
        { status: 400 }
      );
    }

    const allowed = await assertPacienteScope(pacienteIdNum, auth);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Sin permisos para actualizar este paciente' },
        { status: 403 }
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
          fecha_actualizacion_riesgo = NOW(),
          updated_by = ?
      WHERE id = ?
    `;

    const result = await query(sql, [factorRiesgoAntecedentes, factorRiesgoTamizajes, auth.userId, pacienteIdNum]);

    if ((result as any).affectedRows === 0) {
      return NextResponse.json(
        { error: 'Paciente no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Factores de riesgo guardados correctamente',
      pacienteId: pacienteIdNum,
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
