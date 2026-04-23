import { SignJWT, jwtVerify } from "jose";

export const AUTH_COOKIE_NAME = "maro_session";
export const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12; // 12 horas

export type AppRol = "clues" | "regional" | "estatal";

export type SessionTokenClaims = {
  userId: number;
  nivel: number;
  rol: AppRol;
  mustChangePassword: boolean;
};

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_JWT_SECRET || process.env.NEXTAUTH_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_JWT_SECRET (o NEXTAUTH_SECRET) es obligatorio en producción");
    }

    return new TextEncoder().encode("dev-only-insecure-secret");
  }

  return new TextEncoder().encode(secret);
}

export async function createAuthToken(claims: SessionTokenClaims): Promise<string> {
  return await new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${AUTH_COOKIE_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyAuthToken(token: string): Promise<SessionTokenClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());

    const userId = Number(payload.userId);
    const nivel = Number(payload.nivel);
    const rol = String(payload.rol) as AppRol;
    const mustChangePassword = Boolean(payload.mustChangePassword);

    if (!Number.isFinite(userId) || !Number.isFinite(nivel)) return null;
    if (!["clues", "regional", "estatal"].includes(rol)) return null;

    return {
      userId,
      nivel,
      rol,
      mustChangePassword,
    };
  } catch {
    return null;
  }
}

export function mapNivelToRolAndLevel(nivel: "CLUES" | "REGION" | "ESTADO" | "ADMIN") {
  if (nivel === "CLUES") return { rol: "clues" as const, nivelNum: 1 };
  if (nivel === "REGION") return { rol: "regional" as const, nivelNum: 2 };
  return { rol: "estatal" as const, nivelNum: 3 };
}
