import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { query } from "@/lib/db";
import { requireApiAuth } from "@/lib/apiAuth";
import ExcelJS from "exceljs";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Validar sesión autenticada
    const authResult = await requireApiAuth(request, 1);
    if (!authResult.ok) return authResult.response;
    const { auth } = authResult;

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format"); // "json" o "excel" (por defecto excel)

    // Restringir el alcance de los datos según el nivel del usuario
    const whereConditions: string[] = [];
    const queryParams: Array<string | number> = [];

    if (auth.nivel === 1) {
      if (!auth.cluesId) {
        return NextResponse.json(
          { error: "Usuario CLUES sin unidad asignada" },
          { status: 403 }
        );
      }
      whereConditions.push("UPPER(u.clues) = ?");
      queryParams.push(auth.cluesId);
    } else if (auth.nivel === 2) {
      if (!auth.region) {
        return NextResponse.json(
          { error: "Usuario regional sin región asignada" },
          { status: 403 }
        );
      }
      whereConditions.push("UPPER(u.region) = ?");
      queryParams.push(auth.region);
    }

    // 1. Leer el archivo SQL
    const sqlPath = path.join(process.cwd(), "querys", "query_all.sql");
    const baseSql = fs.readFileSync(sqlPath, "utf-8").trim().replace(/;+\s*$/, "");

    const finalSql =
      whereConditions.length > 0
        ? `${baseSql}\nWHERE ${whereConditions.join(" AND ")};`
        : `${baseSql};`;

    // 2. Ejecutar la consulta con alcance aplicado
    const rows = await query<any[]>(finalSql, queryParams);

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

    // Agregar el encabezado general indicando el alcance del reporte
    const alcanceTexto =
      auth.nivel === 1
        ? `la unidad ${auth.cluesId}`
        : auth.nivel === 2
        ? `la región ${auth.region}`
        : "la base de datos estatal";

    worksheet.addRow([
      `NOTA: Este archivo contiene el total de registros de ${alcanceTexto} (${cleanedRows.length} filas).`,
    ]);
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
