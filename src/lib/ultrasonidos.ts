/**
 * Módulo de Utilidades y Validación para Ultrasonidos Obstétricos
 * Archivo: src/lib/ultrasonidos.ts
 */

export const OPCIONES_ULTRASONIDO = [
  "USG 1er trimestre",
  "USG 2o trimestre",
  "USG 3er trimestre",
  "USG cromosomopatías",
  "USG estructural",
  "USG Doppler Arterias Uterinas",
] as const;

export type TipoUltrasonido = (typeof OPCIONES_ULTRASONIDO)[number];

export interface ItemUltrasonidoInput {
  tipo: string;
  fecha_toma_usg: string;
  descripcion?: string | null;
}

export interface ItemUltrasonidoValidado {
  tipo: TipoUltrasonido;
  fecha_toma_usg: string;
  descripcion: string;
}

/**
 * Recorta espacios y trunca la descripción a máximo 100 caracteres.
 */
export function sanitizarDescripcionUSG(descripcion?: string | null): string {
  if (!descripcion) return "";
  return descripcion.trim().slice(0, 100);
}

/**
 * Valida si un tipo de ultrasonido es válido según el catálogo oficial.
 */
export function esTipoUltrasonidoValido(tipo: string): tipo is TipoUltrasonido {
  return OPCIONES_ULTRASONIDO.includes(tipo as TipoUltrasonido);
}

/**
 * Valida si la fecha proporcionada tiene un formato de fecha válido (YYYY-MM-DD).
 */
export function esFechaValida(fecha: string): boolean {
  if (!fecha || typeof fecha !== "string") return false;
  const regexFecha = /^\d{4}-\d{2}-\d{2}$/;
  if (!regexFecha.test(fecha)) return false;
  const dateObj = new Date(fecha);
  return !isNaN(dateObj.getTime());
}

/**
 * Valida y sanitiza una lista de estudios de ultrasonido para la paciente.
 */
export function validarListaUltrasonidos(
  lista: ItemUltrasonidoInput[]
): { validos: ItemUltrasonidoValidado[]; errores: string[] } {
  const validos: ItemUltrasonidoValidado[] = [];
  const errores: string[] = [];

  for (const item of lista) {
    if (!item.tipo || typeof item.tipo !== "string") {
      errores.push("El tipo de ultrasonido es requerido");
      continue;
    }

    if (!esTipoUltrasonidoValido(item.tipo)) {
      errores.push(`Tipo de ultrasonido no válido: "${item.tipo}"`);
      continue;
    }

    if (!item.fecha_toma_usg || !esFechaValida(item.fecha_toma_usg)) {
      errores.push(`Fecha de toma de USG no válida para "${item.tipo}"`);
      continue;
    }

    const descSanitizada = sanitizarDescripcionUSG(item.descripcion);
    validos.push({
      tipo: item.tipo,
      fecha_toma_usg: item.fecha_toma_usg,
      descripcion: descSanitizada,
    });
  }

  return { validos, errores };
}

/**
 * Prepara los registros para inserción en la tabla `pacientes_ultrasonidos`.
 */
export function prepararRegistrosUSG(
  lista: ItemUltrasonidoInput[],
  pacienteId: number,
  consultaId?: number | null,
  createdBy?: number | null
) {
  const { validos } = validarListaUltrasonidos(lista);
  return validos.map((usg) => ({
    paciente_id: pacienteId,
    consulta_id: consultaId || null,
    tipo: usg.tipo,
    fecha_toma_usg: usg.fecha_toma_usg,
    descripcion: usg.descripcion || null,
    created_by: createdBy || null,
  }));
}
