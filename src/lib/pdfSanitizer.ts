/**
 * Utilería de sanitización de texto para documentos PDF con codificación WinAnsi (pdf-lib).
 * Convierte caracteres matemáticos, símbolos y diacríticos no compatibles a sus equivalentes ASCII/WinAnsi.
 */

export function sanitizePdfText(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value);

  // 1. Reemplazos directos de caracteres matemáticos y símbolos especiales frecuentes
  text = text
    .replace(/≥/g, ">=")
    .replace(/≤/g, "<=")
    .replace(/≠/g, "!=")
    .replace(/±/g, "+/-")
    .replace(/×/g, "x")
    .replace(/÷/g, "/")
    .replace(/[—–]/g, "-")
    .replace(/•/g, "*")
    .replace(/²/g, "2")
    .replace(/³/g, "3")
    .replace(/°/g, "o")
    .replace(/…/g, "...")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[«»]/g, '"')
    .replace(/€/g, "EUR")
    .replace(/µ/g, "u");

  // 2. Transliteración de cualquier caracter Unicode fuera del rango WinAnsi (0x00 - 0xFF)
  return text.replace(/[^\x00-\xFF]/g, (char) => {
    // Intentar descomponer acentos y diacríticos (ej. letras griegas o caracteres extendidos)
    const normalized = char.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (/^[\x00-\xFF]+$/.test(normalized)) {
      return normalized;
    }
    return "";
  });
}
