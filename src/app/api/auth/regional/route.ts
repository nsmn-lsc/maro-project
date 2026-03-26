import { NextResponse } from "next/server";
import { REGION_CONFIGS, configDeUsuario } from "@/lib/regiones";

type LoginBody = {
  usuario?: string;
  password?: string;
};

// Contraseña compartida para todos los usuarios regionales (provisional)
const DEFAULT_REGIONAL_PASSWORD = "Maro.Regional#2026!";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LoginBody;
    const usuario = (body.usuario || "").trim().toLowerCase();
    const password = body.password || "";

    if (!usuario || !password) {
      return NextResponse.json(
        { message: "Usuario y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    // Verificar si el usuario corresponde a alguna región
    const regionCfg = configDeUsuario(usuario);
    console.log(`[AUTH REGIONAL] Usuario: "${usuario}", Encontrado:`, !!regionCfg);
    if (!regionCfg) {
      return NextResponse.json({ message: "Credenciales inválidas" }, { status: 401 });
    }

    const expectedPassword = process.env.REGIONAL_PASSWORD || DEFAULT_REGIONAL_PASSWORD;
    console.log(`[AUTH REGIONAL] Contraseña recibida: "${password}"`);
    console.log(`[AUTH REGIONAL] Contraseña esperada: "${expectedPassword}"`);
    console.log(`[AUTH REGIONAL] Coincide: ${password === expectedPassword}`);
    if (password !== expectedPassword) {
      return NextResponse.json({ message: "Credenciales inválidas" }, { status: 401 });
    }

    return NextResponse.json({
      clues: `REGIONAL_${regionCfg.id}`,
      unidad: regionCfg.displayName,
      region: regionCfg.id,
      municipio: "REGIONAL",
      nivel: 2,
      displayName: regionCfg.displayName,
      rol: "regional",
    });
  } catch (error: unknown) {
    console.error("Error en autenticación regional", error);
    return NextResponse.json({ message: "Error de autenticación" }, { status: 500 });
  }
}
