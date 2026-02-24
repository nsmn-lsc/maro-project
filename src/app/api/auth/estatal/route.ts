import { NextResponse } from "next/server";

type LoginBody = {
  usuario?: string;
  password?: string;
};

const DEFAULT_ESTATAL_USER = "estatal_maro_2026";
const DEFAULT_ESTATAL_PASSWORD = "Maro.Estatal#2026!";

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

    const expectedUser = process.env.ESTATAL_USER || DEFAULT_ESTATAL_USER;
    const expectedPassword =
      process.env.ESTATAL_PASSWORD || DEFAULT_ESTATAL_PASSWORD;

    if (usuario !== expectedUser || password !== expectedPassword) {
      return NextResponse.json({ message: "Credenciales inválidas" }, { status: 401 });
    }

    return NextResponse.json({
      clues: "ESTATAL",
      unidad: "Coordinación Estatal",
      region: "ESTATAL",
      municipio: "ESTATAL",
      nivel: 3,
      displayName: "Usuario Estatal",
      rol: "estatal",
    });
  } catch (error: any) {
    console.error("Error en autenticación estatal", error);
    return NextResponse.json({ message: "Error de autenticación" }, { status: 500 });
  }
}
