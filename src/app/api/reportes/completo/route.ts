import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { query } from "@/lib/db";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format"); // "json" o "excel" (por defecto excel)

    // 1. Leer el archivo SQL
    const sqlPath = path.join(process.cwd(), "querys", "query_all.sql");
    const sql = fs.readFileSync(sqlPath, "utf-8");

    // 2. Ejecutar la consulta
    const rows = await query<any[]>(sql);

    // 3. Limpiar los datos (similar a lo que hacía Polars: quitar saltos de línea y comillas extra)
    const cleanedRows = rows.map(row => {
      const newRow: any = {};
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === "string") {
          // Reemplazar saltos de línea por espacio y quitar comillas
          newRow[key] = value.replace(/[\r\n]+/g, ' ').replace(/"/g, '').trim();
        } else {
          newRow[key] = value;
        }
      }
      return newRow;
    });

    // Si solicitaron formato JSON (para Dashboards/BI)
    if (format === "json") {
      return NextResponse.json(cleanedRows);
    }

    // 4. Generar archivo Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Reporte Pacientes");

    // Agregar el encabezado general indicando que es el total
    worksheet.addRow([`NOTA: Este archivo contiene el total de registros de la base de datos (${cleanedRows.length} casos). No se aplican filtros.`]);
    worksheet.mergeCells('A1:J1');
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFD97706' }, size: 12 };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'left' };
    worksheet.getRow(1).height = 25;
    
    // Fila 2 en blanco para espaciar
    worksheet.addRow([]);

    if (cleanedRows.length > 0) {
      // Extraer las llaves para los encabezados de tabla
      const headerKeys = Object.keys(cleanedRows[0]);
      
      // Agregar la fila de encabezados en la fila 3
      const headerRow = worksheet.addRow(headerKeys);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F766E' } // Teal-600
      };

      // Establecer el ancho de las columnas
      for (let i = 1; i <= headerKeys.length; i++) {
        worksheet.getColumn(i).width = 20;
      }

      // Agregar las filas de datos
      const valuesArray = cleanedRows.map(row => Object.values(row));
      worksheet.addRows(valuesArray);
    }

    // Convertir el workbook a un buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // 5. Retornar el archivo como descarga
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="reporte_pacientes_final_${new Date().toISOString().slice(0,10)}.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });

  } catch (error: any) {
    console.error("Error generando reporte completo:", error);
    return NextResponse.json(
      { error: "Error al generar el reporte completo", detalle: error.message },
      { status: 500 }
    );
  }
}
