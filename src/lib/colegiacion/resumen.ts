// src/lib/colegiacion/resumen.ts

export function construirResumenColegiacion(params: {
  edad: string;
  semanas: string;
  presion: string;
  diagnostico: string;
  explicacion: string;
  fundamentos: { tipo: string; titulo: string; anio: number }[];
  version: string;
}) {
  const {
    edad,
    semanas,
    presion,
    diagnostico,
    explicacion,
    fundamentos,
    version,
  } = params;

  let resumen = `RESUMEN PARA COLEGIACIÓN\n\n`;
  resumen += `Datos mínimos:\n`;
  resumen += `• Edad: ${edad}\n`;
  resumen += `• Edad gestacional: ${semanas} semanas\n`;
  resumen += `• Presión arterial: ${presion}\n`;
  resumen += `• Diagnóstico principal: ${diagnostico}\n\n`;

  resumen += `Criterio activado:\n`;
  resumen += `${explicacion}\n\n`;

  if (fundamentos.length > 0) {
    resumen += `Fundamento normativo:\n`;
    fundamentos.forEach((f) => {
      resumen += `• [${f.tipo}] ${f.titulo} (${f.anio})\n`;
    });
    resumen += `\n`;
  }

  resumen += `Versión de criterios: ${version}\n`;

  return resumen;
}
