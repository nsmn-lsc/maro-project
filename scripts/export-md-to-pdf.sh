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

TMP_HTML="$(mktemp ./.md-export-XXXXXX.html)"
TMP_HEAD="$(mktemp ./.md-head-XXXXXX.html)"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FA_BRANDS_WOFF2="$SCRIPT_DIR/assets/fontawesome/fa-brands-400.woff2"

# Limpieza segura: mantenemos el HTML temporal hasta el final para evitar
# condiciones de carrera con Chromium en modo headless.
cleanup() {
  rm -f "$TMP_HTML" "$TMP_HEAD"
}
trap cleanup EXIT

# Carga Font Awesome (local preferido) para renderizar iconos en exportación PDF.
if [[ -f "$FA_BRANDS_WOFF2" ]]; then
  FA_BRANDS_WOFF2_ABS="$(realpath "$FA_BRANDS_WOFF2")"
  cat > "$TMP_HEAD" <<EOF
<style>
  @font-face {
    font-family: "FA6Brands";
    src: url("file://$FA_BRANDS_WOFF2_ABS") format("woff2");
    font-weight: 400;
    font-style: normal;
  }

  .fa-brands,
  .fab {
    font-family: "FA6Brands";
    font-weight: 400;
    font-style: normal;
    display: inline-block;
    line-height: 1;
    text-rendering: auto;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .fa-brands.fa-linux::before,
  .fab.fa-linux::before {
    content: "\f17c";
  }

  .fa-brands.fa-fedora::before,
  .fab.fa-fedora::before {
    content: "\f798";
  }

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
else
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
fi

pandoc "$INPUT_MD" \
  -f gfm+raw_html \
  -t html5 \
  -s \
  --metadata title="$(basename "$INPUT_MD")" \
  -H "$TMP_HEAD" \
  -o "$TMP_HTML"

TMP_HTML_ABS="$(realpath "$TMP_HTML")"

"$BROWSER" \
  --headless \
  --disable-gpu \
  --no-pdf-header-footer \
  --print-to-pdf="$OUTPUT_PDF" \
  "file://$TMP_HTML_ABS" >/dev/null 2>&1

if [[ -f "$OUTPUT_PDF" ]]; then
  echo "OK: PDF generado en $OUTPUT_PDF"
else
  echo "ERROR: No se pudo generar el PDF." >&2
  exit 1
fi
