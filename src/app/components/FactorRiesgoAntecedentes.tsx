/**
 * Componente para mostrar el Factor de Riesgo por Antecedentes
 * Se usa en consultas, seguimiento y evaluaciones clínicas
 */

'use client';

interface Props {
  pacienteId: number;
  factorRiesgo: number;
  semanasGestacion?: number;
}

export default function FactorRiesgoAntecedentes({
  pacienteId,
  factorRiesgo,
  semanasGestacion = 0,
}: Props) {
  // Determinar nivel de riesgo
  let nivel = 'BAJO';
  let bgColor = 'bg-gradient-to-br from-green-50 to-emerald-50';
  let borderColor = 'border-green-400';
  let textColor = 'text-green-900';
  let badgeColor = 'bg-green-100 text-green-800 border-green-300';
  let icono = '✅';

  if (factorRiesgo >= 4 && factorRiesgo <= 9) {
    nivel = 'ALTO';
    bgColor = 'bg-gradient-to-br from-amber-50 to-yellow-50';
    borderColor = 'border-amber-400';
    textColor = 'text-amber-900';
    badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
    icono = '⚠️';
  } else if (factorRiesgo >= 10 && factorRiesgo <= 25) {
    nivel = 'MUY ALTO';
    bgColor = 'bg-gradient-to-br from-orange-50 to-red-50';
    borderColor = 'border-orange-400';
    textColor = 'text-orange-900';
    badgeColor = 'bg-orange-100 text-orange-800 border-orange-300';
    icono = '🔴';
  } else if (factorRiesgo > 25) {
    nivel = 'CRÍTICO';
    bgColor = 'bg-gradient-to-br from-red-50 to-rose-50';
    borderColor = 'border-red-500';
    textColor = 'text-red-900';
    badgeColor = 'bg-red-100 text-red-800 border-red-300';
    icono = '🚨';
  }

  // Determinar recomendación según nivel y semanas gestación
  let recomendacion = 'Control normal en centro de salud';
  let citaDias = '6 semanas';
  let accionEspecial = '';

  if (factorRiesgo >= 4 && factorRiesgo <= 9) {
    recomendacion =
      'Sacar consulta con segundo nivel de atención, a Ginecología y especialidades acorde a comorbilidades';
    citaDias =
      semanasGestacion >= 30 && semanasGestacion <= 31 ? '3 semanas' : '6 semanas máximo';
    accionEspecial = '📋 Referir a especialista';
  } else if (factorRiesgo >= 10 && factorRiesgo <= 25) {
    recomendacion =
      'Sacar consulta con segundo o tercer nivel de atención, a Ginecología y especialidades acorde a comorbilidades';
    citaDias = '2 semanas máximo';
    accionEspecial = '📋 Referir a segundo/tercer nivel';
  } else if (factorRiesgo > 25) {
    recomendacion = 'COLEGIAR CASO - Colegiación inmediata y atención especializada urgente';
    citaDias = 'INMEDIATO';
    accionEspecial = '🚨 COLEGIACIÓN URGENTE';
  }

  return (
    <div className={`rounded-lg border-2 ${borderColor} ${bgColor} p-6 shadow-md`}>
      {/* ENCABEZADO CON PUNTOS Y NIVEL */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className={`text-sm font-semibold opacity-80 ${textColor}`}>
            {icono} FACTOR DE RIESGO - ANTECEDENTES
          </h3>
          <div className="mt-3 flex items-baseline gap-3">
            <span className={`text-4xl font-bold ${textColor}`}>{factorRiesgo}</span>
            <span className={`text-sm opacity-70 ${textColor}`}>puntos</span>
          </div>
        </div>
        <div className="text-right">
          <span
            className={`inline-block px-4 py-2 rounded-full text-sm font-bold border ${badgeColor}`}
          >
            {nivel}
          </span>
          <p className={`text-xs mt-3 opacity-70 ${textColor}`}>
            {factorRiesgo <= 3 && 'Riesgo bajo'}
            {factorRiesgo >= 4 && factorRiesgo <= 9 && 'Vigilancia especial'}
            {factorRiesgo >= 10 && factorRiesgo <= 25 && 'Evaluación especializada'}
            {factorRiesgo > 25 && 'Caso crítico'}
          </p>
        </div>
      </div>

      {/* SEPARADOR */}
      <div className={`my-4 border-t-2 ${borderColor} opacity-30`}></div>

      {/* RECOMENDACIÓN Y CITA */}
      <div>
        <div className={`text-xs font-semibold mb-2 opacity-80 ${textColor}`}>
          📌 RECOMENDACIÓN DE CITA:
        </div>
        <p className={`text-sm mb-3 ${textColor}`}>{recomendacion}</p>

        <div className={`inline-block ${badgeColor} px-3 py-2 rounded-lg text-sm font-semibold`}>
          Próxima cita en: <strong>{citaDias}</strong>
        </div>

        {accionEspecial && (
          <div
            className={`mt-3 p-3 rounded-lg ${
              factorRiesgo > 25 ? 'bg-red-200/30' : 'bg-white/40'
            } text-sm font-semibold ${textColor}`}
          >
            {accionEspecial}
          </div>
        )}
      </div>

      {/* METADATA */}
      <div className={`text-xs mt-4 pt-4 border-t ${borderColor} opacity-50 ${textColor}`}>
        <span>ID Paciente: {pacienteId}</span>
        {semanasGestacion > 0 && <span> | SDG: {semanasGestacion}</span>}
      </div>
    </div>
  );
}
