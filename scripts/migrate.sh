#!/usr/bin/env bash
set -euo pipefail

# 1. Localizar archivo de entorno (.env.local o .env)
ENV_FILE=""
if [ -f ".env.local" ]; then
  ENV_FILE=".env.local"
elif [ -f ".env" ]; then
  ENV_FILE=".env"
else
  echo "[!] Error: No se encontró .env.local ni .env en el directorio actual."
  exit 1
fi

# 2. Cargar variables limpiando espacios y retornos de carro
export $(grep -E '^[A-Za-z0-9_]+[[:space:]]*=' "$ENV_FILE" | sed -E 's/[[:space:]]*=[[:space:]]*/=/' | xargs)

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-devuser}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_NAME="${DB_NAME:-maro_hub}"

# Usar ejecutable 'mariadb' si está instalado para evitar avisos de deprecación de 'mysql'
CLI_BIN="mysql"
if command -v mariadb >/dev/null 2>&1; then
  CLI_BIN="mariadb"
fi

MYSQL_CMD="${CLI_BIN} -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME}"

# 3. Validar argumento
if [ $# -eq 0 ]; then
  echo "Uso: $0 <archivo_migracion.sql | all | status | mark-applied <archivo.sql>>"
  exit 1
fi

ACTION="$1"

# 4. Asegurar que la tabla _schema_migrations exista
${MYSQL_CMD} -e "
CREATE TABLE IF NOT EXISTS _schema_migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL UNIQUE COMMENT 'Nombre del archivo .sql ejecutado',
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Fecha y hora de ejecución'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
"

# Opción: Ver estado de migraciones
if [ "$ACTION" = "status" ]; then
  echo "=== Migraciones registradas en ${DB_NAME} (${DB_HOST}) ==="
  ${MYSQL_CMD} -e "SELECT id, migration_name, executed_at FROM _schema_migrations ORDER BY id ASC;"
  exit 0
fi

# Opción: Marcar archivo como aplicado sin ejecutar el SQL (útil para esquemas históricos ya existentes)
if [ "$ACTION" = "mark-applied" ]; then
  if [ $# -lt 2 ]; then
    echo "[!] Error: Debe especificar el nombre del archivo SQL a registrar."
    exit 1
  fi
  TARGET_FILE=$(basename "$2")
  ${MYSQL_CMD} -e "INSERT IGNORE INTO _schema_migrations (migration_name) VALUES ('${TARGET_FILE}');"
  echo "[✓] Archivo registrado como aplicado en _schema_migrations: ${TARGET_FILE}"
  exit 0
fi

# Función para aplicar un archivo individual
apply_migration() {
  local FILE_PATH="$1"
  local FILE_NAME
  FILE_NAME=$(basename "$FILE_PATH")

  # Verificar si ya se aplicó
  local ALREADY_RUN
  ALREADY_RUN=$(${MYSQL_CMD} -N -e "SELECT COUNT(*) FROM _schema_migrations WHERE migration_name = '${FILE_NAME}';")

  if [ "$ALREADY_RUN" -gt 0 ]; then
    echo "[-] Omitiendo ${FILE_NAME} (ya fue aplicada)."
    return 0
  fi

  echo "[+] Aplicando migración: ${FILE_NAME}..."
  ${MYSQL_CMD} < "$FILE_PATH"

  ${MYSQL_CMD} -e "INSERT INTO _schema_migrations (migration_name) VALUES ('${FILE_NAME}');"
  echo "[✓] Registrada con éxito: ${FILE_NAME}"
}

# Opción: Correr todas las pendientes en orden alfabético
if [ "$ACTION" = "all" ]; then
  for sql_file in $(ls -1 database/migrations/*.sql | grep -v "_rollback.sql" | sort); do
    apply_migration "$sql_file"
  done
  echo "[✓] Proceso de migraciones finalizado."
  exit 0
fi

# Opción: Archivo específico
if [ -f "$ACTION" ]; then
  apply_migration "$ACTION"
elif [ -f "database/migrations/$ACTION" ]; then
  apply_migration "database/migrations/$ACTION"
else
  echo "[!] Error: No se encontró el archivo $ACTION"
  exit 1
fi