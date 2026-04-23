import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { assertCluesScope, requireApiAuth } from "@/lib/apiAuth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ clues: string }> }
) {
  const authResult = await requireApiAuth(req, 1);
  if (!authResult.ok) return authResult.response;
  const auth = authResult.auth;

  const { clues } = await params;
  const normalizedClues = String(clues || "").trim().toUpperCase();

  if (!normalizedClues) {
    return NextResponse.json({ error: "CLUES requerida" }, { status: 400 });
  }

  const allowed = await assertCluesScope(normalizedClues, auth);
  if (!allowed) {
    return NextResponse.json({ message: "Sin permisos para consultar esa CLUES" }, { status: 403 });
  }

  try {
    const rows = await query(
      "SELECT CLUES, UNIDAD, REGION, MUNICIPIO, NIVEL FROM cat_unidades WHERE CLUES = ? LIMIT 1",
      [normalizedClues]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error interno" }, { status: 500 });
  }
}
