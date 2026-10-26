export type ValorProteinuriaEstandar =
  | "Negativa"
  | "(+) 30 mg/dL"
  | "(++) 100 mg/dL"
  | "(+++) >300 mg/dL";

export const OPCIONES_PROTEINURIA: {
  value: "" | ValorProteinuriaEstandar;
  label: string;
}[] = [
  { value: "", label: "Sin evaluar" },
  { value: "Negativa", label: "Negativa" },
  { value: "(+) 30 mg/dL", label: "(+) 30 mg/dL" },
  { value: "(++) 100 mg/dL", label: "(++) 100 mg/dL" },
  { value: "(+++) >300 mg/dL", label: "(+++) >300 mg/dL" },
];

/**
 * Estandariza cualquier valor previo o libre de proteinuria al catálogo oficial:
 * - null (vacío / sin evaluar)
 * - "Negativa"
 * - "(+) 30 mg/dL"
 * - "(++) 100 mg/dL"
 * - "(+++) >300 mg/dL"
 */
export function normalizarProteinuria(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();

  if (
    lower === "sin evaluar" ||
    lower === "n/a" ||
    lower === "na" ||
    lower === "s/d" ||
    lower === "-" ||
    lower === "—"
  ) {
    return null;
  }

  // Negativos
  if (
    lower === "neg" ||
    lower === "neg." ||
    lower === "negativa" ||
    lower === "negativo" ||
    lower === "no" ||
    lower === "ausente" ||
    lower === "normal" ||
    lower === "0" ||
    lower === "0 mg/dl"
  ) {
    return "Negativa";
  }

  // (+++) >300 mg/dL
  if (
    trimmed === "+++" ||
    trimmed === "(+++)" ||
    trimmed === "(+++) >300 mg/dL" ||
    trimmed === "(+++) >300mg" ||
    lower.includes("+++") ||
    lower.includes("3+") ||
    lower.includes("4+") ||
    lower.includes(">300") ||
    lower.includes("> 300") ||
    lower === "300" ||
    lower === "300 mg/dl"
  ) {
    return "(+++) >300 mg/dL";
  }

  // (++) 100 mg/dL
  if (
    trimmed === "++" ||
    trimmed === "(++)" ||
    trimmed === "(++) 100 mg/dL" ||
    lower.includes("++") ||
    lower.includes("2+") ||
    lower === "100" ||
    lower.includes("100 mg") ||
    lower.includes("100mg")
  ) {
    return "(++) 100 mg/dL";
  }

  // (+) 30 mg/dL
  if (
    trimmed === "+" ||
    trimmed === "(+)" ||
    trimmed === "(+) 30 mg/dL" ||
    lower.includes("(+)") ||
    lower.includes("1+") ||
    lower === "tr" ||
    lower === "traza" ||
    lower === "trazas" ||
    lower === "positiva" ||
    lower === "positivo" ||
    lower === "si" ||
    lower === "sí" ||
    lower === "30" ||
    lower.includes("30 mg") ||
    lower.includes("30mg") ||
    trimmed.includes("+")
  ) {
    return "(+) 30 mg/dL";
  }

  // Si es un número puro (ej. mg/dL capturado como número)
  const num = Number(trimmed.replace(/[^\d.]/g, ""));
  if (Number.isFinite(num) && /\d/.test(trimmed)) {
    if (num <= 0) return "Negativa";
    if (num >= 300) return "(+++) >300 mg/dL";
    if (num >= 100) return "(++) 100 mg/dL";
    return "(+) 30 mg/dL";
  }

  return trimmed.slice(0, 50);
}

export function esProteinuriaPositiva(raw: unknown): boolean {
  const norm = normalizarProteinuria(raw);
  return norm !== null && norm !== "Negativa";
}
