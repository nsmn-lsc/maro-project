import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import ExcelJS from 'exceljs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function run() {
  try {
    const pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'maro_hub',
    });

    const sqlPath = path.join(process.cwd(), "querys", "query_all.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");

    console.log("Ejecutando SQL...");
    const [rows] = await pool.execute(sql);
    console.log(`Filas recuperadas: ${rows.length}`);

    const cleanedRows = rows.map(row => {
      const newRow = {};
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === "string") {
          newRow[key] = value.replace(/[\r\n]+/g, ' ').replace(/"/g, '').trim();
        } else {
          newRow[key] = value;
        }
      }
      return newRow;
    });

    console.log("Generando Excel...");
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Reporte Pacientes");
    worksheet.addRow([`NOTA: Este archivo contiene el total de registros de la base de datos (${cleanedRows.length} casos). No se aplican filtros.`]);
    worksheet.mergeCells('A1:J1');
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFD97706' }, size: 12 };
    
    worksheet.addRow([]);

    if (cleanedRows.length > 0) {
      const headerKeys = Object.keys(cleanedRows[0]);
      const headerRow = worksheet.addRow(headerKeys);
      for (let i = 1; i <= headerKeys.length; i++) {
        worksheet.getColumn(i).width = 20;
      }
      const valuesArray = cleanedRows.map(row => Object.values(row));
      worksheet.addRows(valuesArray);
    }

    console.log("Escribiendo buffer...");
    const buffer = await workbook.xlsx.writeBuffer();
    console.log(`Buffer size: ${buffer.length}`);

  } catch (err) {
    console.error("ERROR EN SCRIPT:", err);
  }
  process.exit();
}
run();
