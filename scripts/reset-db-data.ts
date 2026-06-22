import { config } from "dotenv";
import { getPool } from "../src/lib/db";

// Cargar variables de entorno
config({ path: ".env.local" });
config(); // fallback

const TABLES_TO_TRUNCATE = [
  "acciones_preventivas",
  "alertas_telegram",
  "bitacora",
  "casos",
  "cat_pacientes",
  "colegiados_acciones",
  "colegiados_planes",
  "consultas_prenatales",
  "detecciones",
  "diagnosticos",
  "estudios",
  "evaluaciones_clinicas",
  "puerperio",
  "recomendaciones",
  "sesiones"
];

async function resetDatabase() {
  console.log("⚠️ INICIANDO LIMPIEZA DE DATOS OPERACIONALES ⚠️");
  const pool = await getPool();
  const connection = await pool.getConnection();

  try {
    // Deshabilitar la verificación de claves foráneas temporalmente
    await connection.query("SET FOREIGN_KEY_CHECKS = 0;");
    console.log("✅ Verificación de claves foráneas deshabilitada.");

    for (const table of TABLES_TO_TRUNCATE) {
      console.log(`Borrando datos de la tabla: ${table}...`);
      await connection.query(`TRUNCATE TABLE \`${table}\`;`);
    }

    console.log("✅ Todas las tablas operacionales han sido limpiadas.");
  } catch (error) {
    console.error("❌ Error al limpiar la base de datos:", error);
  } finally {
    // Restaurar la verificación de claves foráneas
    await connection.query("SET FOREIGN_KEY_CHECKS = 1;");
    console.log("✅ Verificación de claves foráneas restaurada.");
    connection.release();
    process.exit(0);
  }
}

resetDatabase();
