import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Cargar .env.local o .env
if (fs.existsSync(path.join(rootDir, '.env.local'))) {
  dotenv.config({ path: path.join(rootDir, '.env.local') });
} else if (fs.existsSync(path.join(rootDir, '.env'))) {
  dotenv.config({ path: path.join(rootDir, '.env') });
}

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'maro_hub',
    multipleStatements: true,
  });

  console.log(`Conectado a MySQL en ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);

  // Verificar y aplicar cada columna individualmente de forma segura
  const columnsToAdd = [
    {
      name: 'ant_embarazo_ectopico',
      sql: `ALTER TABLE cat_pacientes ADD COLUMN ant_embarazo_ectopico TINYINT(1) DEFAULT '0' COMMENT 'Antecedente de embarazo ectópico (6 puntos)' AFTER ant_muerte_perinatal;`
    },
    {
      name: 'factor_endocrinopatia',
      sql: `ALTER TABLE cat_pacientes ADD COLUMN factor_endocrinopatia TINYINT(1) DEFAULT '0' COMMENT 'Endocrinopatía (12 puntos)' AFTER factor_drogas_ilicitas;`
    },
    {
      name: 'factor_neumopatia',
      sql: `ALTER TABLE cat_pacientes ADD COLUMN factor_neumopatia TINYINT(1) DEFAULT '0' COMMENT 'Neumopatía (12 puntos)' AFTER factor_endocrinopatia;`
    },
    {
      name: 'factor_its',
      sql: `ALTER TABLE cat_pacientes ADD COLUMN factor_its TINYINT(1) DEFAULT '0' COMMENT 'Infecciones de Transmisión Sexual - ITS (4 puntos)' AFTER factor_neumopatia;`
    },
    {
      name: 'factor_cirugias_pelvico_uterinas',
      sql: `ALTER TABLE cat_pacientes ADD COLUMN factor_cirugias_pelvico_uterinas TINYINT(1) DEFAULT '0' COMMENT 'Cirugías Pélvico Uterinas (4 puntos)' AFTER factor_its;`
    },
    {
      name: 'factor_discapacidad',
      sql: `ALTER TABLE cat_pacientes ADD COLUMN factor_discapacidad TINYINT(1) DEFAULT '0' COMMENT 'Discapacidad (12 puntos)' AFTER factor_cirugias_pelvico_uterinas;`
    },
    {
      name: 'otros_antecedentes',
      sql: `ALTER TABLE cat_pacientes ADD COLUMN otros_antecedentes VARCHAR(50) DEFAULT NULL COMMENT 'Otros antecedentes (máximo 50 caracteres)' AFTER factor_discapacidad;`
    }
  ];

  for (const col of columnsToAdd) {
    const [rows] = await connection.query(
      `SELECT 1 FROM information_schema.COLUMNS 
       WHERE TABLE_SCHEMA = ? 
         AND TABLE_NAME = 'cat_pacientes' 
         AND COLUMN_NAME = ?`,
      [process.env.DB_NAME || 'maro_hub', col.name]
    );

    if (Array.isArray(rows) && rows.length === 0) {
      console.log(`-> Agregando columna ${col.name}...`);
      await connection.query(col.sql);
      console.log(`   Columna ${col.name} agregada con éxito.`);
    } else {
      console.log(`-> Columna ${col.name} ya existe. Omitiendo.`);
    }
  }

  // Modificar comentario de factor_drogas_ilicitas
  console.log(`-> Actualizando comentario de factor_drogas_ilicitas a 6 puntos...`);
  await connection.query(
    `ALTER TABLE cat_pacientes MODIFY COLUMN factor_drogas_ilicitas TINYINT(1) DEFAULT '0' COMMENT 'Otras drogas (6 puntos)'`
  );
  console.log(`   Comentario actualizado con éxito.`);

  // Verificar columnas en cat_pacientes
  const [cols] = await connection.query(
    `SELECT COLUMN_NAME, COLUMN_TYPE, COLUMN_DEFAULT, COLUMN_COMMENT 
     FROM information_schema.COLUMNS 
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'cat_pacientes' 
       AND COLUMN_NAME IN ('ant_embarazo_ectopico', 'factor_endocrinopatia', 'factor_neumopatia', 'factor_its', 'factor_cirugias_pelvico_uterinas', 'factor_discapacidad', 'otros_antecedentes', 'factor_drogas_ilicitas')`,
    [process.env.DB_NAME || 'maro_hub']
  );

  console.log('\n--- Estado final de las columnas en cat_pacientes ---');
  console.table(cols);

  await connection.end();
  console.log('\nMigración completada exitosamente.');
}

run().catch((err) => {
  console.error('Error durante la migración:', err);
  process.exit(1);
});
