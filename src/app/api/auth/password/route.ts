import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { getPool } from "@/lib/db";

const BCRYPT_ROUNDS = 12;
const MIN_LENGTH = 10;

type RequestBody = {
  userId?: number;
  currentPassword?: string;
  newPassword?: string;
};

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { userId, currentPassword, newPassword } = body;

    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json(
        { message: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    if (newPassword.length < MIN_LENGTH) {
      return NextResponse.json(
        { message: `La contraseña debe tener al menos ${MIN_LENGTH} caracteres` },
        { status: 422 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { message: "La nueva contraseña debe ser diferente a la actual" },
        { status: 422 }
      );
    }

    const pool = getPool();

    const [rows] = await pool.query<any[]>(
      `SELECT id, password_hash FROM usuarios WHERE id = ? AND activo = true LIMIT 1`,
      [userId]
    );

    const user = rows[0];

    if (!user) {
      await bcrypt.compare(currentPassword, "$2b$12$invalidhashpaddingtoconstanttime0000000000000000000");
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });
    }

    const currentOk = await bcrypt.compare(currentPassword, user.password_hash);
    if (!currentOk) {
      return NextResponse.json({ message: "La contraseña actual es incorrecta" }, { status: 401 });
    }

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

    await pool.query(
      `UPDATE usuarios
       SET password_hash = ?, must_change_password = false, updated_at = NOW()
       WHERE id = ?`,
      [newHash, userId]
    );

    return NextResponse.json({ message: "Contraseña actualizada correctamente" });
  } catch (error: any) {
    console.error("Error en PATCH /api/auth/password:", error);
    return NextResponse.json({ message: "Error al actualizar contraseña" }, { status: 500 });
  }
}
