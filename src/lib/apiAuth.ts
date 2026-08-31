import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { AUTH_COOKIE_NAME, type AppRol, verifyAuthToken } from "@/lib/authToken";

type NivelKey = "CLUES" | "REGION" | "ESTADO" | "ADMIN";

type UsuarioAuthRow = {
  id: number;
  nivel: NivelKey;
  clues_id: string | null;
  region: string | null;
  activo: number | boolean;
  clues_region: string | null;
};

// Caché en memoria para usuarios activos (TTL: 2 minutos)
const USER_CACHE_TTL_MS = 120_000;
const userAuthCache = new Map<number, { data: UsuarioAuthRow; expiresAt: number }>();

// Caché en memoria para regiones de unidades (TTL: 30 minutos)
const UNIDADES_CACHE_TTL_MS = 1_800_000;
const unidadRegionCache = new Map<string, { region: string | null; expiresAt: number }>();

async function getCachedUser(userId: number): Promise<UsuarioAuthRow | null> {
  const now = Date.now();
  const cached = userAuthCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  try {
    const rows = await query<UsuarioAuthRow[]>(
      `SELECT u.id, u.nivel, u.clues_id, u.region, u.activo, cu.region AS clues_region
       FROM usuarios u
       LEFT JOIN cat_unidades cu ON cu.clues = u.clues_id
       WHERE u.id = ?
       LIMIT 1`,
      [userId]
    );

    const user = rows?.[0] || null;
    if (user) {
      userAuthCache.set(userId, { data: user, expiresAt: now + USER_CACHE_TTL_MS });
    } else {
      userAuthCache.delete(userId);
    }
    return user;
  } catch (error) {
    // Fallback: si falla la BD pero tenemos dato previo en cache, lo usamos temporalmente
    if (cached) return cached.data;
    throw error;
  }
}

async function getCachedUnidadRegion(clues: string): Promise<string | null> {
  const normalized = clues.trim().toUpperCase();
  const now = Date.now();
  const cached = unidadRegionCache.get(normalized);
  if (cached && cached.expiresAt > now) {
    return cached.region;
  }

  try {
    const rows = await query<Array<{ region: string | null }>>(
      `SELECT region FROM cat_unidades WHERE clues = ? LIMIT 1`,
      [normalized]
    );
    const region = rows?.[0]?.region ? String(rows[0].region).trim().toUpperCase() : null;
    unidadRegionCache.set(normalized, { region, expiresAt: now + UNIDADES_CACHE_TTL_MS });
    return region;
  } catch (error) {
    if (cached) return cached.region;
    throw error;
  }
}

export type ApiAuthContext = {
  userId: number;
  nivel: number;
  rol: AppRol;
  nivelKey: NivelKey;
  cluesId: string | null;
  region: string | null;
};

function extractCookieValue(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("cookie") || "";
  if (!cookieHeader) return null;

  const entries = cookieHeader.split(";");
  for (const entry of entries) {
    const [rawKey, ...rawValue] = entry.trim().split("=");
    if (rawKey === name) {
      return decodeURIComponent(rawValue.join("="));
    }
  }
  return null;
}

function mapNivelToNumber(nivel: NivelKey): number {
  if (nivel === "CLUES") return 1;
  if (nivel === "REGION") return 2;
  return 3;
}

export async function requireApiAuth(
  request: Request,
  minLevel = 1
): Promise<{ ok: true; auth: ApiAuthContext } | { ok: false; response: NextResponse }> {
  const token = extractCookieValue(request, AUTH_COOKIE_NAME);
  if (!token) {
    return { ok: false, response: NextResponse.json({ message: "No autenticado" }, { status: 401 }) };
  }

  const claims = await verifyAuthToken(token);
  if (!claims) {
    return { ok: false, response: NextResponse.json({ message: "Sesión inválida" }, { status: 401 }) };
  }

  let user: UsuarioAuthRow | null = null;
  try {
    user = await getCachedUser(claims.userId);
  } catch (err) {
    console.error("Error validando usuario en requireApiAuth", err);
    return { ok: false, response: NextResponse.json({ message: "Error interno de autenticación" }, { status: 500 }) };
  }

  if (!user || !user.activo) {
    return { ok: false, response: NextResponse.json({ message: "Sesión no autorizada" }, { status: 401 }) };
  }

  const nivel = mapNivelToNumber(user.nivel);
  if (nivel < minLevel) {
    return { ok: false, response: NextResponse.json({ message: "Sin permisos" }, { status: 403 }) };
  }

  const auth: ApiAuthContext = {
    userId: Number(user.id),
    nivel,
    rol: claims.rol,
    nivelKey: user.nivel,
    cluesId: user.clues_id ? String(user.clues_id).trim().toUpperCase() : null,
    region: (user.region || user.clues_region || null) ? String(user.region || user.clues_region).trim().toUpperCase() : null,
  };

  return { ok: true, auth };
}

export async function assertCluesScope(cluesId: string, auth: ApiAuthContext): Promise<boolean> {
  const normalized = String(cluesId || "").trim().toUpperCase();
  if (!normalized) return false;

  if (auth.nivel >= 3) return true;

  if (auth.nivel === 1) {
    return auth.cluesId === normalized;
  }

  try {
    const rowRegion = await getCachedUnidadRegion(normalized);
    return !!auth.region && !!rowRegion && auth.region === rowRegion;
  } catch {
    return false;
  }
}

export async function assertPacienteScope(pacienteId: number, auth: ApiAuthContext): Promise<boolean> {
  if (auth.nivel >= 3) return true;

  const rows = await query<Array<{ clues_id: string | null; region: string | null }>>(
    `SELECT clues_id, region FROM cat_pacientes WHERE id = ? LIMIT 1`,
    [pacienteId]
  );

  if (!rows || rows.length === 0) return false;

  const row = rows[0];
  const clues = row.clues_id ? String(row.clues_id).trim().toUpperCase() : null;
  const region = row.region ? String(row.region).trim().toUpperCase() : null;

  if (auth.nivel === 1) {
    return !!auth.cluesId && auth.cluesId === clues;
  }

  return !!auth.region && auth.region === region;
}
