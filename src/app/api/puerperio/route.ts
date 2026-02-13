import { NextResponse } from "next/server";
import { query } from "@/lib/db";

/**
 * Genera el siguiente folio consecutivo para puerperio
 * Formato: P-CLUES-001, P-CLUES-002, etc.
 */
async function generarSiguienteFolioPuerperio(cluesId: string): Promise<string> {
  const rows: any = await query(
    `SELECT folio FROM puerperio 
     WHERE folio LIKE ? 
     ORDER BY folio DESC 
     LIMIT 1`,
    [`P-${cluesId}-%`]
  );

  let consecutivo = 1;
  
  if (rows && rows.length > 0 && rows[0].folio) {
    const match = rows[0].folio.match(/-(\d+)$/);
    if (match) {
      consecutivo = parseInt(match[1], 10) + 1;
    }
  }

  const consecutivoStr = consecutivo.toString().padStart(3, '0');
  return `P-${cluesId}-${consecutivoStr}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pacienteId = searchParams.get("paciente_id");
  const action = searchParams.get("action");
  const cluesId = searchParams.get("clues_id");

  // Acción especial: generar folio para puerperio
  if (action === "generar-folio" && cluesId) {
    try {
      const folio = await generarSiguienteFolioPuerperio(cluesId);
      return NextResponse.json({ folio });
    } catch (error: any) {
      console.error("Error generando folio puerperio", error);
      return NextResponse.json({ message: "Error al generar folio" }, { status: 500 });
    }
  }

  if (!pacienteId) {
    return NextResponse.json({ message: "paciente_id es requerido" }, { status: 400 });
  }

  try {
    const rows = await query(
      `SELECT * FROM puerperio WHERE paciente_id = ? ORDER BY created_at DESC`,
      [pacienteId]
    );

    return NextResponse.json(rows);
  } catch (error: any) {
    console.error("Error obteniendo registros de puerperio", error);
    return NextResponse.json({ message: "Error al obtener registros" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const pacienteId = body.paciente_id;
    if (!pacienteId) {
      return NextResponse.json({ message: "paciente_id es requerido" }, { status: 400 });
    }

    // Si no viene folio, generar uno nuevo
    let folio = body.folio;
    if (!folio && body.clues_id) {
      folio = await generarSiguienteFolioPuerperio(body.clues_id);
    }

    const payload = {
      paciente_id: pacienteId,
      folio: folio || null,
      complicaciones: body.complicaciones || null,
      MMEG: body.MMEG ? 1 : 0,
      fecha_atencion_evento: body.fecha_atencion_evento || null,
      dias_puerperio: body.dias_puerperio || null,
      valoracion_riesgo: body.valoracion_riesgo || null,
      apeo_fecha: body.apeo_fecha || null,
      apeo_metodo: body.apeo_metodo || null,
      datos_alarma: body.datos_alarma || null,
      diagnostico: body.diagnostico || null,
      plan: body.plan || null,
      fecha_siguiente_consulta: body.fecha_siguiente_consulta || null,
      referencia: body.referencia || null,
      usuaria_seguimiento: body.usuaria_seguimiento ? 1 : 0,
      fecha_atencion_sna_tna: body.fecha_atencion_sna_tna || null,
      fecha_contrareferencia: body.fecha_contrareferencia || null,
      created_by: body.created_by || null,
      updated_by: body.updated_by || null,
    };

    const placeholders = Object.keys(payload).map(() => "?").join(", ");
    const values = Object.values(payload);

    const result: any = await query(
      `INSERT INTO puerperio (${Object.keys(payload).join(", ")}) VALUES (${placeholders})`,
      values
    );

    return NextResponse.json({ id: result.insertId, ...payload }, { status: 201 });
  } catch (error: any) {
    console.error("Error creando registro de puerperio", error);
    return NextResponse.json({ message: "Error al crear registro" }, { status: 500 });
  }
}
