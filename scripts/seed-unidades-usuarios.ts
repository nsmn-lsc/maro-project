import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { config } from "dotenv";
import { getPool } from "../src/lib/db";

interface UnidadRow {
  clues: string;
  unidad: string;
  region: string;
  municipio: string;
  nivel: number;
}

function hashPassword(base: string) {
  return createHash("sha256").update(base).digest("hex");
}

function chunk<T>(arr: T[], size: number): T[][] {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    res.push(arr.slice(i, i + size));
  }
  return res;
}

async function ensureTables() {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cat_unidades (
      clues VARCHAR(20) PRIMARY KEY,
      unidad VARCHAR(255) NOT NULL,
      region VARCHAR(100) NOT NULL,
      municipio VARCHAR(150) NOT NULL,
      nivel TINYINT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash CHAR(64) NOT NULL,
      nombre VARCHAR(255),
      nivel ENUM('CLUES','REGION','ESTADO','ADMIN') NOT NULL,
      clues_id VARCHAR(20),
      region VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (clues_id) REFERENCES cat_unidades(clues) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Indexes (ignore if already exist)
  try {
    await pool.query(`CREATE INDEX idx_usuarios_nivel_region ON usuarios (nivel, region);`);
  } catch (err: any) {
    if (err?.errno !== 1061) throw err; // 1061: duplicate key name
  }
  try {
    await pool.query(`CREATE INDEX idx_usuarios_nivel_clues ON usuarios (nivel, clues_id);`);
  } catch (err: any) {
    if (err?.errno !== 1061) throw err;
  }
}

function parseCsv(csvPath: string): UnidadRow[] {
  const raw = fs.readFileSync(csvPath, "utf8").trim();
  const lines = raw.split(/\r?\n/);
  const rows: UnidadRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length !== 5) {
      throw new Error(`Línea ${i + 1} inválida, columnas=${cols.length}`);
    }
    const [clues, unidad, region, municipio, nivel] = cols.map((c) => c.trim());
    rows.push({ clues, unidad, region, municipio, nivel: Number(nivel) });
  }

  return rows;
}

async function loadUnidades(rows: UnidadRow[]) {
  const pool = getPool();
  for (const batch of chunk(rows, 200)) {
    const values = batch.map((r) => [r.clues, r.unidad, r.region, r.municipio, r.nivel]);
    await pool.query(
      `REPLACE INTO cat_unidades (clues, unidad, region, municipio, nivel) VALUES ?`,
      [values]
    );
  }
}

async function seedUsuarios(rows: UnidadRow[]) {
  const pool = getPool();
  // CLUES users
  const cluesValues = rows.map((r) => [
    r.clues,
    hashPassword(`Maro-${r.clues}-2026`),
    r.unidad,
    "CLUES",
    r.clues,
    r.region,
  ]);
  for (const batch of chunk(cluesValues, 200)) {
    await pool.query(
      `INSERT IGNORE INTO usuarios (username, password_hash, nombre, nivel, clues_id, region) VALUES ?`,
      [batch]
    );
  }

  // Region users
  const regiones = Array.from(new Set(rows.map((r) => r.region)));
  const regionValues = regiones.map((region) => [
    `REGION-${region}`,
    hashPassword(`Maro-${region}-2026`),
    `Usuario región ${region}`,
    "REGION",
    region,
  ]);
  await pool.query(
    `INSERT IGNORE INTO usuarios (username, password_hash, nombre, nivel, region) VALUES ?`,
    [regionValues]
  );

  // Estado
  await pool.query(
    `INSERT IGNORE INTO usuarios (username, password_hash, nombre, nivel) VALUES ?`,
    [[
      ["ESTADO", hashPassword("Maro-Estado-2026"), "Usuario estatal", "ESTADO"],
    ]]
  );

  // Admin
  await pool.query(
    `INSERT IGNORE INTO usuarios (username, password_hash, nombre, nivel) VALUES ?`,
    [[
      ["ADMIN", hashPassword("Maro-Admin-2026"), "Administrador", "ADMIN"],
    ]]
  );
}

async function main() {
  config({ path: path.resolve(__dirname, "../.env.local") });

  const csvPath = path.resolve(__dirname, "../unidades_regiones.csv");
  const unidades = parseCsv(csvPath);

  await ensureTables();
  await loadUnidades(unidades);
  await seedUsuarios(unidades);

  console.log(`Importadas ${unidades.length} unidades`);
  console.log(`Usuarios generados:`);
  console.log(`- CLUES: ${unidades.length}`);
  console.log(`- REGIONES: ${new Set(unidades.map((u) => u.region)).size}`);
  console.log(`- ESTADO: 1`);
  console.log(`- ADMIN: 1`);
  console.log("Passwords base:");
  console.log("- CLUES: Maro-<CLUES>-2026");
  console.log("- REGION: Maro-<REGION>-2026");
  console.log("- ESTADO: Maro-Estado-2026");
  console.log("- ADMIN: Maro-Admin-2026");
}

main().catch((err) => {
  console.error("Error en seed:", err);
  process.exit(1);
});
