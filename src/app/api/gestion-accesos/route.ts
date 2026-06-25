import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/authToken";
import bcrypt from "bcrypt";
import crypto from "crypto";

function generarPasswordAleatoria() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*";
  const bytes = crypto.randomBytes(8);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const session = await verifyAuthToken(token);
    if (!session || session.rol !== "estatal") {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    const pool = await getPool();
    const [rows] = await pool.query(`
      SELECT id, username, nombre, nivel, clues_id, region, activo, last_login_at 
      FROM usuarios 
      WHERE nivel IN ('CLUES', 'REGION')
      ORDER BY nivel DESC, region ASC, username ASC
    `);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const session = await verifyAuthToken(token);
    if (!session || session.rol !== "estatal") {
      return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
    }

    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "ID de usuario requerido" }, { status: 400 });
    }

    const newPassword = generarPasswordAleatoria();
    const hash = await bcrypt.hash(newPassword, 12);

    const pool = await getPool();
    await pool.query(`
      UPDATE usuarios 
      SET password_hash = ?, must_change_password = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND nivel IN ('CLUES', 'REGION')
    `, [hash, userId]);

    return NextResponse.json({ success: true, newPassword });
  } catch (error) {
    console.error("Error al resetear contraseña:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
