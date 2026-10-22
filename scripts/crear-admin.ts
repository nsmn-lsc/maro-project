import { config } from "dotenv";
import path from "path";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { getPool } from "../src/lib/db";

const BCRYPT_ROUNDS = 12;

function generateSecurePassword(length = 16): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*";
  const bytes = randomBytes(length);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join("");
}

async function main() {
  config({ path: path.resolve(__dirname, "../.env.local") });

  const args = process.argv.slice(2);
  let username = "";
  let password = "";
  let nombre = "";
  let mustChangePassword = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--username" || args[i] === "-u") {
      username = args[++i];
    } else if (args[i] === "--password" || args[i] === "-p") {
      password = args[++i];
    } else if (args[i] === "--nombre" || args[i] === "-n") {
      nombre = args[++i];
    } else if (args[i] === "--must-change-password") {
      mustChangePassword = true;
    }
  }

  if (!username) {
    username = "ADMIN_SECUNDARIO";
  }

  if (!password) {
    password = generateSecurePassword(16);
  }

  if (!nombre) {
    nombre = `Administrador (${username})`;
  }

  const pool = getPool();

  // Verificar si ya existe
  const [existing] = await pool.query<any[]>(
    "SELECT id, username, nivel FROM usuarios WHERE username = ? LIMIT 1",
    [username]
  );

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  if (existing && existing.length > 0) {
    await pool.query(
      `UPDATE usuarios 
       SET password_hash = ?, nombre = ?, nivel = 'ADMIN', activo = 1, must_change_password = ?, updated_at = NOW()
       WHERE username = ?`,
      [hash, nombre, mustChangePassword ? 1 : 0, username]
    );
    console.log("\n========================================");
    console.log("   CUENTA DE ADMINISTRADOR ACTUALIZADA  ");
    console.log("========================================");
  } else {
    await pool.query(
      `INSERT INTO usuarios (username, password_hash, nombre, nivel, activo, must_change_password)
       VALUES (?, ?, ?, 'ADMIN', 1, ?)`,
      [username, hash, nombre, mustChangePassword ? 1 : 0]
    );
    console.log("\n========================================");
    console.log("    NUEVA CUENTA DE ADMINISTRADOR CREADA ");
    console.log("========================================");
  }

  console.log(`Usuario:               ${username}`);
  console.log(`Nombre:                ${nombre}`);
  console.log(`Rol / Nivel:           ADMIN (Nivel 3 / Acceso Total)`);
  console.log(`Contraseña:            ${password}`);
  console.log(`Debe cambiar password: ${mustChangePassword ? "SÍ" : "NO"}`);
  console.log("========================================\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("Error al crear la cuenta de administrador:", err);
  process.exit(1);
});
