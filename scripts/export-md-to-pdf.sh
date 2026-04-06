#!/usr/bin/env bash
set -euo pipefail

# Exporta Markdown a PDF respetando HTML embebido.
# Uso:
#   scripts/export-md-to-pdf.sh [archivo.md] [salida.pdf]
# Ejemplo:
#   scripts/export-md-to-pdf.sh "Documento_Continuidad_Dirección_Médica.md"

INPUT_MD="${1:-Documento_Continuidad_Dirección_Médica.md}"

if [[ ! -f "$INPUT_MD" ]]; then
  echo "ERROR: No existe el archivo de entrada: $INPUT_MD" >&2
  exit 1
fi

# Salida por defecto: mismo nombre, extensión .pdf
if [[ $# -ge 2 ]]; then
  OUTPUT_PDF="$2"
else
  OUTPUT_PDF="${INPUT_MD%.*}.pdf"
fi

# Dependencias requeridas
if ! command -v pandoc >/dev/null 2>&1; then
  echo "ERROR: pandoc no está instalado." >&2
  echo "Instálalo y vuelve a intentar." >&2
  exit 1
fi

BROWSER=""
if command -v chromium >/dev/null 2>&1; then
  BROWSER="chromium"
elif command -v chromium-browser >/dev/null 2>&1; then
  BROWSER="chromium-browser"
elif command -v google-chrome >/dev/null 2>&1; then
  BROWSER="google-chrome"
else
  echo "ERROR: No se encontró chromium/chromium-browser/google-chrome." >&2
  exit 1
fi

TMP_HTML="$(mktemp /tmp/md-export-XXXXXX.html)"
TMP_HEAD="$(mktemp /tmp/md-head-XXXXXX.html)"
trap 'rm -f "$TMP_HTML" "$TMP_HEAD"' EXIT

# Carga Font Awesome para que se rendericen iconos como los de la firma.
cat > "$TMP_HEAD" <<'EOF'
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.45;
    margin: 24px;
  }
  .signature-mark {
    margin-top: 10px;
    font-size: 0.95rem;
    opacity: 0.9;
  }
</style>
EOF

pandoc "$INPUT_MD" \
  -f gfm+raw_html \
  -t html5 \
  -s \
  --metadata title="$(basename "$INPUT_MD")" \
  -H "$TMP_HEAD" \
  -o "$TMP_HTML"

"$BROWSER" \
  --headless \
  --disable-gpu \
  --print-to-pdf="$OUTPUT_PDF" \
  "$TMP_HTML" >/dev/null 2>&1

if [[ -f "$OUTPUT_PDF" ]]; then
  echo "OK: PDF generado en $OUTPUT_PDF"
else
  echo "ERROR: No se pudo generar el PDF." >&2
  exit 1
fi
