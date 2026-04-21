import fs from "fs";
import path from "path";
import { randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { config } from "dotenv";
import { getPool } from "../src/lib/db";

const BCRYPT_ROUNDS = 12;

interface UnidadRow {
  clues: string;
  unidad: string;
  region: string;
  municipio: string;
  nivel: number;
}

/** Genera una contraseña bootstrap aleatoria de 20 caracteres */
function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*";
  const bytes = randomBytes(20);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const res: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    res.push(arr.slice(i, i + size));
  }
  return res;
}

async function ensureTables() {
  // Las tablas cat_unidades y usuarios ya se crean con npm run db:setup (database/schema.sql)
  // Este bloque queda como fallback de seguridad al ejecutar el seed de forma independiente
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
      password_hash VARCHAR(255) NOT NULL,
      nombre VARCHAR(255),
      nivel ENUM('CLUES','REGION','ESTADO','ADMIN') NOT NULL,
      clues_id VARCHAR(20) NULL,
      region VARCHAR(100) NULL,
      activo BOOLEAN NOT NULL DEFAULT TRUE,
      must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
      last_login_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_usuarios_clues FOREIGN KEY (clues_id) REFERENCES cat_unidades(clues) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  try {
    await pool.query(`CREATE INDEX idx_usuarios_nivel_region ON usuarios (nivel, region);`);
  } catch (err: any) {
    if (err?.errno !== 1061) throw err;
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

async function seedUsuarios(rows: UnidadRow[]): Promise<void> {
  const pool = getPool();
  const credenciales: string[] = [
    "# Credenciales bootstrap — ELIMINAR despues de entregar al administrador",
    "# username,nivel,clues_id,region,password_temporal",
  ];

  // CLUES users — uno por unidad
  for (const batch of chunk(rows, 10)) {
    const values: any[][] = [];
    for (const r of batch) {
      const pwd = generatePassword();
      const hash = await hashPassword(pwd);
      credenciales.push(`${r.clues},CLUES,${r.clues},${r.region},${pwd}`);
      values.push([r.clues, hash, r.unidad, "CLUES", r.clues, r.region, true, true]);
    }
    await pool.query(
      `INSERT IGNORE INTO usuarios
         (username, password_hash, nombre, nivel, clues_id, region, activo, must_change_password)
       VALUES ?`,
      [values]
    );
  }

  // Region users
  const regiones = Array.from(new Set(rows.map((r) => r.region)));
  for (const region of regiones) {
    const pwd = generatePassword();
    const hash = await hashPassword(pwd);
    credenciales.push(`REGION-${region},REGION,,${region},${pwd}`);
    await pool.query(
      `INSERT IGNORE INTO usuarios
         (username, password_hash, nombre, nivel, region, activo, must_change_password)
       VALUES (?, ?, ?, 'REGION', ?, true, true)`,
      [`REGION-${region}`, hash, `Usuario región ${region}`, region]
    );
  }

  // Estado
  const pwdEstado = generatePassword();
  const hashEstado = await hashPassword(pwdEstado);
  credenciales.push(`ESTADO,ESTADO,,,${pwdEstado}`);
  await pool.query(
    `INSERT IGNORE INTO usuarios
       (username, password_hash, nombre, nivel, activo, must_change_password)
     VALUES (?, ?, 'Usuario estatal', 'ESTADO', true, true)`,
    ["ESTADO", hashEstado]
  );

  // Admin
  const pwdAdmin = generatePassword();
  const hashAdmin = await hashPassword(pwdAdmin);
  credenciales.push(`ADMIN,ADMIN,,,${pwdAdmin}`);
  await pool.query(
    `INSERT IGNORE INTO usuarios
       (username, password_hash, nombre, nivel, activo, must_change_password)
     VALUES (?, ?, 'Administrador', 'ADMIN', true, true)`,
    ["ADMIN", hashAdmin]
  );

  // Escribir archivo de credenciales temporales (no versionado)
  const outPath = path.resolve(__dirname, "../credenciales-bootstrap.csv");
  fs.writeFileSync(outPath, credenciales.join("\n") + "\n", "utf8");
  console.log(`\nCredenciales bootstrap escritas en: ${outPath}`);
  console.log("ADVERTENCIA: entregar ese archivo por canal seguro y eliminarlo despues.");
}

async function main() {
  config({ path: path.resolve(__dirname, "../.env.local") });

  const csvPath = path.resolve(__dirname, "../unidades_regiones.csv");
  const unidades = parseCsv(csvPath);

  await ensureTables();
  await loadUnidades(unidades);
  await seedUsuarios(unidades);

  console.log(`\nImportadas ${unidades.length} unidades`);
  console.log(`Usuarios generados:`);
  console.log(`- CLUES: ${unidades.length}`);
  console.log(`- REGIONES: ${new Set(unidades.map((u) => u.region)).size}`);
  console.log(`- ESTADO: 1`);
  console.log(`- ADMIN: 1`);
  console.log("\nTodos los usuarios quedan con must_change_password = true");
  console.log("Todos los hashes usan bcrypt (cost 12)");
}

main().catch((err) => {
  console.error("Error en seed:", err);
  process.exit(1);
});
