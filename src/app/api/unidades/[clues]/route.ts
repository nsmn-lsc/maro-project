import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ clues: string }> }
) {
  const { clues } = await params;

  if (!clues) {
    return NextResponse.json({ error: "CLUES requerida" }, { status: 400 });
  }

  try {
    const rows = await query(
      "SELECT CLUES, UNIDAD, REGION, MUNICIPIO, NIVEL FROM cat_unidades WHERE CLUES = ? LIMIT 1",
      [clues]
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error interno" }, { status: 500 });
  }
}
