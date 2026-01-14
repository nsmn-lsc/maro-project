import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

const excelPath = path.resolve(__dirname, "../CLUES ACTUAL para app.xlsx");
const outputPath = path.resolve(__dirname, "../src/lib/unidades.ts");

const workbook = XLSX.readFile(excelPath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

const rows = XLSX.utils.sheet_to_json<any>(sheet);

const unidades = rows.map(r => ({
  region: String(r.region || "").trim(),
  municipio: String(r.municipio || "").trim(),
  unidad: String(r.unidad || "").trim(),
  clues: String(r.clues || "").trim(),
}));

const content = `export interface Unidad {
  region: string;
  municipio: string;
  unidad: string;
  clues: string;
}

export const UNIDADES: Unidad[] = ${JSON.stringify(unidades, null, 2)};
`;

fs.writeFileSync(outputPath, content, "utf-8");

console.log("✅ unidades.ts generado correctamente");
