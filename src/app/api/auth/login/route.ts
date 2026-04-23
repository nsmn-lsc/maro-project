import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { getPool } from "@/lib/db";
import {
  AUTH_COOKIE_MAX_AGE_SECONDS,
  AUTH_COOKIE_NAME,
  createAuthToken,
  mapNivelToRolAndLevel,
} from "@/lib/authToken";

type LoginBody = {
  usuario?: string;
  password?: string;
};

type UsuarioRow = {
  id: number;
  username: string;
  password_hash: string;
  nombre: string | null;
  nivel: "CLUES" | "REGION" | "ESTADO" | "ADMIN";
  clues_id: string | null;
  region: string | null;
  activo: boolean;
  must_change_password: boolean;
};

type UnidadRow = {
  clues: string;
  unidad: string;
  region: string;
  municipio: string;
  nivel: number;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const usuario = (body.usuario || "").trim();
    const password = body.password || "";

    if (!usuario || !password) {
      return NextResponse.json(
        { message: "Usuario y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    const pool = getPool();

    const [rows] = await pool.query<any[]>(
      `SELECT id, username, password_hash, nombre, nivel, clues_id, region,
              activo, must_change_password
       FROM usuarios
       WHERE username = ?
       LIMIT 1`,
      [usuario]
    );

    const user: UsuarioRow | undefined = rows[0];

    if (!user) {
      // Tiempo constante para evitar enumeración de usuarios
      await bcrypt.compare(password, "$2b$12$invalidhashpaddingtoconstanttime0000000000000000000");
      return NextResponse.json({ message: "Credenciales inválidas" }, { status: 401 });
    }

    if (!user.activo) {
      return NextResponse.json({ message: "Cuenta desactivada" }, { status: 403 });
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      return NextResponse.json({ message: "Credenciales inválidas" }, { status: 401 });
    }

    // Actualizar last_login_at de forma asíncrona sin bloquear la respuesta
    pool
      .query(`UPDATE usuarios SET last_login_at = NOW() WHERE id = ?`, [user.id])
      .catch((err) => console.error("Error actualizando last_login_at:", err));

    // Construir sesión según nivel
    if (user.nivel === "CLUES" && user.clues_id) {
      const [unidadRows] = await pool.query<any[]>(
        `SELECT clues, unidad, region, municipio, nivel
         FROM cat_unidades
         WHERE clues = ?
         LIMIT 1`,
        [user.clues_id]
      );
      const unidad: UnidadRow | undefined = unidadRows[0];

      if (!unidad) {
        return NextResponse.json(
          { message: "Unidad no encontrada en catálogo" },
          { status: 500 }
        );
      }

      const sessionBody = {
        userId: user.id,
        clues: unidad.clues,
        unidad: unidad.unidad,
        region: unidad.region,
        municipio: unidad.municipio,
        nivel: unidad.nivel,
        displayName: user.nombre || unidad.unidad,
        rol: "clues",
        mustChangePassword: Boolean(user.must_change_password),
      };

      const token = await createAuthToken({
        userId: user.id,
        nivel: 1,
        rol: "clues",
        mustChangePassword: Boolean(user.must_change_password),
      });

      const response = NextResponse.json(sessionBody);
      response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
      });

      return response;
    }

    if (user.nivel === "REGION") {
      const sessionBody = {
        userId: user.id,
        clues: `REGION-${user.region}`,
        unidad: user.nombre || `Región ${user.region}`,
        region: user.region || "",
        municipio: "",
        nivel: 2,
        displayName: user.nombre || `Región ${user.region}`,
        rol: "regional",
        mustChangePassword: Boolean(user.must_change_password),
      };

      const token = await createAuthToken({
        userId: user.id,
        nivel: 2,
        rol: "regional",
        mustChangePassword: Boolean(user.must_change_password),
      });

      const response = NextResponse.json(sessionBody);
      response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
      });

      return response;
    }

    if (user.nivel === "ESTADO" || user.nivel === "ADMIN") {
      const sessionBody = {
        userId: user.id,
        clues: user.nivel,
        unidad: user.nombre || "Coordinación Estatal",
        region: "ESTATAL",
        municipio: "ESTATAL",
        nivel: 3,
        displayName: user.nombre || "Usuario Estatal",
        rol: "estatal",
        mustChangePassword: Boolean(user.must_change_password),
      };

      const mapped = mapNivelToRolAndLevel(user.nivel);
      const token = await createAuthToken({
        userId: user.id,
        nivel: mapped.nivelNum,
        rol: mapped.rol,
        mustChangePassword: Boolean(user.must_change_password),
      });

      const response = NextResponse.json(sessionBody);
      response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: AUTH_COOKIE_MAX_AGE_SECONDS,
      });

      return response;
    }

    return NextResponse.json({ message: "Nivel de usuario no reconocido" }, { status: 500 });
  } catch (error: any) {
    console.error("Error en /api/auth/login:", error);
    return NextResponse.json({ message: "Error de autenticación" }, { status: 500 });
  }
}
