export const NIVELES_ATENCION = ["primer_nivel", "segundo_nivel", "tercer_nivel"] as const;
export type NivelAtencion = (typeof NIVELES_ATENCION)[number];

export const ESTATUS_ACCION = ["pendiente", "completada", "incompleta", "no_realizada"] as const;
export type EstatusAccion = (typeof ESTATUS_ACCION)[number];

export interface AccionColegiadaInput {
  id?: number;
  nivel_atencion?: string;
  orden?: number;
  fecha_accion?: string | null;
  descripcion?: string;
  fecha_respuesta?: string | null;
  respuesta_accion?: string | null;
  estatus?: string;
  cumplido?: boolean | number;
  fecha_cumplimiento?: string | null;
}

export interface AccionColegiadaNormalizada {
  id?: number;
  nivel_atencion: NivelAtencion;
  orden: number;
  fecha_accion: string | null;
  descripcion: string;
  fecha_respuesta: string | null;
  respuesta_accion: string | null;
  estatus: EstatusAccion;
  cumplido: 0 | 1;
  fecha_cumplimiento: string | null;
}

export interface NivelObservaciones {
  nivel_atencion: NivelAtencion;
  obs_zonales: string | null;
  obs_regionales: string | null;
  obs_estatal_salud_mujeres: string | null;
  obs_atencion_medica: string | null;
}

export function isNivelAtencionValido(value: unknown): value is NivelAtencion {
  return typeof value === "string" && NIVELES_ATENCION.includes(value as NivelAtencion);
}

export function isEstatusAccionValido(value: unknown): value is EstatusAccion {
  return typeof value === "string" && ESTATUS_ACCION.includes(value as EstatusAccion);
}

/**
 * Normaliza y valida el arreglo de acciones enviadas para un plan colegiado.
 * - Máx 5 acciones por nivel.
 * - Descripción obligatoria (máx 500 car).
 * - Respuesta opcional (máx 500 car).
 * - Estatus por defecto: 'pendiente'.
 * - Sincroniza cumplido (1 si 'completada', 0 en caso contrario).
 */
export function normalizarAccionesColegiadas(input: unknown[]): AccionColegiadaNormalizada[] {
  if (!Array.isArray(input)) return [];

  const acciones = input.map((raw, index) => {
    const accion = (raw || {}) as AccionColegiadaInput;
    const nivel = String(accion.nivel_atencion || "").trim();
    const descripcion = String(accion.descripcion || "").trim();
    const respuesta = accion.respuesta_accion ? String(accion.respuesta_accion).trim() : "";

    if (!isNivelAtencionValido(nivel)) {
      throw new Error(`Nivel de atención inválido en la acción ${index + 1}`);
    }

    if (!descripcion) {
      throw new Error(`La descripción es requerida en la acción ${index + 1}`);
    }

    if (descripcion.length > 500) {
      throw new Error(`La descripción de la acción ${index + 1} excede 500 caracteres (longitud: ${descripcion.length})`);
    }

    if (respuesta.length > 500) {
      throw new Error(`La respuesta de la acción ${index + 1} excede 500 caracteres (longitud: ${respuesta.length})`);
    }

    const rawEstatus = String(accion.estatus || "").trim().toLowerCase();
    const estatus: EstatusAccion = isEstatusAccionValido(rawEstatus)
      ? rawEstatus
      : (accion.cumplido ? "completada" : "pendiente");

    const cumplido: 0 | 1 = estatus === "completada" ? 1 : 0;

    const fechaAccion = accion.fecha_accion ? String(accion.fecha_accion).trim().slice(0, 10) : null;
    const fechaRespuesta = accion.fecha_respuesta ? String(accion.fecha_respuesta).trim().slice(0, 10) : null;

    let fechaCumplimiento = accion.fecha_cumplimiento ? String(accion.fecha_cumplimiento) : null;
    if (cumplido === 1 && !fechaCumplimiento) {
      fechaCumplimiento = fechaRespuesta || fechaAccion || new Date().toISOString().slice(0, 19).replace("T", " ");
    } else if (cumplido === 0) {
      fechaCumplimiento = null;
    }

    return {
      id: accion.id,
      nivel_atencion: nivel,
      orden: Number(accion.orden) || 0,
      fecha_accion: fechaAccion,
      descripcion,
      fecha_respuesta: fechaRespuesta,
      respuesta_accion: respuesta || null,
      estatus,
      cumplido,
      fecha_cumplimiento: fechaCumplimiento,
    };
  });

  // Validar máximo 5 por nivel
  const grouped = new Map<NivelAtencion, number>();
  for (const accion of acciones) {
    grouped.set(accion.nivel_atencion, (grouped.get(accion.nivel_atencion) || 0) + 1);
  }

  for (const nivel of NIVELES_ATENCION) {
    if ((grouped.get(nivel) || 0) > 5) {
      throw new Error(`Solo se permiten máximo 5 acciones en ${nivel.replace("_", " ")}`);
    }
  }

  // Asignar orden correlativo limpio por nivel
  const counters = new Map<NivelAtencion, number>();
  return acciones.map((accion) => {
    const nextOrder = (counters.get(accion.nivel_atencion) || 0) + 1;
    counters.set(accion.nivel_atencion, nextOrder);
    return {
      ...accion,
      orden: nextOrder,
    };
  });
}

/**
 * Normaliza las 4 observaciones para un nivel de atención
 */
export function normalizarObservacionNivel(
  nivel: NivelAtencion,
  data?: Partial<NivelObservaciones> | null
): NivelObservaciones {
  return {
    nivel_atencion: nivel,
    obs_zonales: data?.obs_zonales ? String(data.obs_zonales).trim() : null,
    obs_regionales: data?.obs_regionales ? String(data.obs_regionales).trim() : null,
    obs_estatal_salud_mujeres: data?.obs_estatal_salud_mujeres ? String(data.obs_estatal_salud_mujeres).trim() : null,
    obs_atencion_medica: data?.obs_atencion_medica ? String(data.obs_atencion_medica).trim() : null,
  };
}

/**
 * Aplica la regla estricta de RBAC (Role-Based Access Control) para observaciones por nivel:
 * - Usuario Regional (nivel = 2):
 *     Solo puede modificar: `obs_zonales` y `obs_regionales`.
 *     Preserva intactos de la BD: `obs_estatal_salud_mujeres` y `obs_atencion_medica`.
 * - Usuario Estatal / Admin (nivel >= 3):
 *     Solo puede modificar: `obs_estatal_salud_mujeres` y `obs_atencion_medica`.
 *     Preserva intactos de la BD: `obs_zonales` y `obs_regionales`.
 */
export function fusionarObservacionesConRBAC(params: {
  nivelUsuario: number;
  nivelAtencion: NivelAtencion;
  incoming?: Partial<NivelObservaciones> | null;
  existing?: NivelObservaciones | null;
}): NivelObservaciones {
  const { nivelUsuario, nivelAtencion, incoming, existing } = params;

  if (nivelUsuario >= 3) {
    // Perfil Estatal o Administrador: edita campos estatales, preserva zonales/regionales
    return {
      nivel_atencion: nivelAtencion,
      obs_zonales: existing?.obs_zonales ?? null,
      obs_regionales: existing?.obs_regionales ?? null,
      obs_estatal_salud_mujeres: incoming?.obs_estatal_salud_mujeres !== undefined
        ? (incoming.obs_estatal_salud_mujeres ? String(incoming.obs_estatal_salud_mujeres).trim() : null)
        : (existing?.obs_estatal_salud_mujeres ?? null),
      obs_atencion_medica: incoming?.obs_atencion_medica !== undefined
        ? (incoming.obs_atencion_medica ? String(incoming.obs_atencion_medica).trim() : null)
        : (existing?.obs_atencion_medica ?? null),
    };
  }

  // Perfil Regional (nivel 2): edita zonales/regionales, preserva estatales
  return {
    nivel_atencion: nivelAtencion,
    obs_zonales: incoming?.obs_zonales !== undefined
      ? (incoming.obs_zonales ? String(incoming.obs_zonales).trim() : null)
      : (existing?.obs_zonales ?? null),
    obs_regionales: incoming?.obs_regionales !== undefined
      ? (incoming.obs_regionales ? String(incoming.obs_regionales).trim() : null)
      : (existing?.obs_regionales ?? null),
    obs_estatal_salud_mujeres: existing?.obs_estatal_salud_mujeres ?? null,
    obs_atencion_medica: existing?.obs_atencion_medica ?? null,
  };
}
