"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { evaluarFactoresRiesgo, DatosFactoresPaciente } from "@/lib/riesgoFactores";
import { evaluarTamizajes, DatosTamizajes } from "@/lib/riesgoTamizajes";

type Patient = {
  id: number;
  folio: string | null;
  nombre_completo: string | null;
  clues_id: string;
  unidad: string | null;
  municipio: string | null;
  region: string | null;
  fecha_ingreso_cpn: string | null;
  fum: string | null;
  fpp: string | null;
  semanas_gestacion: number | null;
  sdg_ingreso: number | null;
  riesgo_obstetrico_ingreso: number | null;
  telefono: string | null;
  direccion: string | null;
  factor_riesgo_antecedentes: number | null;
  // Campos para evaluación de riesgo
  gestas?: number | null;
  partos?: number | null;
  cesareas?: number | null;
  abortos?: number | null;
  ant_preeclampsia?: boolean | number;
  ant_hemorragia?: boolean | number;
  ant_sepsis?: boolean | number;
  ant_bajo_peso_macrosomia?: boolean | number;
  ant_muerte_perinatal?: boolean | number;
  factor_diabetes?: boolean | number;
  factor_hipertension?: boolean | number;
  factor_obesidad?: boolean | number;
  factor_cardiopatia?: boolean | number;
  factor_hepatopatia?: boolean | number;
  factor_enf_autoinmune?: boolean | number;
  factor_nefropatia?: boolean | number;
  factor_coagulopatias?: boolean | number;
  factor_neuropatia?: boolean | number;
  factor_enf_psiquiatrica?: boolean | number;
  factor_alcoholismo?: boolean | number;
  factor_tabaquismo?: boolean | number;
  factor_drogas_ilicitas?: boolean | number;
  factores_riesgo_epid?: 'ninguno' | 'es_contacto' | 'es_portadora';
  // Campos de tamizajes
  prueba_vih?: string | null;
  prueba_vdrl?: string | null;
  prueba_hepatitis_c?: string | null;
  diabetes_glicemia?: string | null;
  violencia?: string | null;
  factor_riesgo_tamizajes?: number | null;
};

export default function PacienteDetalle() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandidoRiesgo, setExpandidoRiesgo] = useState(false);
  const [expandidoTamizajes, setExpandidoTamizajes] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/pacientes?id=${id}`);
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || "No se pudo cargar el paciente");
        const data = await res.json();
        if (!cancelled) {
          setPatient(data);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || "Error desconocido");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (id) load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const formatDate = (value: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const infoRow = (label: string, value: string | number | null) => (
    <div className="flex flex-col rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <span className="text-xs uppercase tracking-wide text-slate-300/70">{label}</span>
      <span className="text-sm text-white">{value ?? "—"}</span>
    </div>
  );

  // Calcular factor de riesgo basado en los datos del paciente
  const resultadoRiesgo = useMemo(() => {
    if (!patient) return null;

    const datosFactores: DatosFactoresPaciente = {
      gestas: patient.gestas || 0,
      partos: patient.partos || 0,
      cesareas: patient.cesareas || 0,
      abortos: patient.abortos || 0,
      ant_preeclampsia: !!patient.ant_preeclampsia,
      ant_hemorragia: !!patient.ant_hemorragia,
      ant_sepsis: !!patient.ant_sepsis,
      ant_bajo_peso_macrosomia: !!patient.ant_bajo_peso_macrosomia,
      ant_muerte_perinatal: !!patient.ant_muerte_perinatal,
      factor_diabetes: !!patient.factor_diabetes,
      factor_hipertension: !!patient.factor_hipertension,
      factor_obesidad: !!patient.factor_obesidad,
      factor_cardiopatia: !!patient.factor_cardiopatia,
      factor_hepatopatia: !!patient.factor_hepatopatia,
      factor_enf_autoinmune: !!patient.factor_enf_autoinmune,
      factor_nefropatia: !!patient.factor_nefropatia,
      factor_coagulopatias: !!patient.factor_coagulopatias,
      factor_neuropatia: !!patient.factor_neuropatia,
      factor_enf_psiquiatrica: !!patient.factor_enf_psiquiatrica,
      factor_alcoholismo: !!patient.factor_alcoholismo,
      factor_tabaquismo: !!patient.factor_tabaquismo,
      factor_drogas_ilicitas: !!patient.factor_drogas_ilicitas,
      factores_riesgo_epid: patient.factores_riesgo_epid || 'ninguno',
    };

    return evaluarFactoresRiesgo(datosFactores);
  }, [patient]);

  // Calcular factor de riesgo basado en tamizajes
  const resultadoTamizajes = useMemo(() => {
    if (!patient) return null;

    const datosTamizajes: DatosTamizajes = {
      prueba_vih: patient.prueba_vih,
      prueba_vdrl: patient.prueba_vdrl,
      prueba_hepatitis_c: patient.prueba_hepatitis_c,
      diabetes_glicemia: patient.diabetes_glicemia,
      violencia: patient.violencia,
    };

    return evaluarTamizajes(datosTamizajes);
  }, [patient]);

  // Colores según nivel de riesgo
  const colorMap = {
    BAJO: {
      bg: 'bg-green-500/20',
      border: 'border-green-400/50',
      text: 'text-white',
      badge: 'bg-green-500',
      icon: '✅',
    },
    ALTO: {
      bg: 'bg-amber-500/20',
      border: 'border-amber-400/50',
      text: 'text-white',
      badge: 'bg-amber-500',
      icon: '⚠️',
    },
    MUY_ALTO: {
      bg: 'bg-orange-500/20',
      border: 'border-orange-400/50',
      text: 'text-white',
      badge: 'bg-orange-600',
      icon: '🔴',
    },
    CRITICO: {
      bg: 'bg-red-500/20',
      border: 'border-red-500/50',
      text: 'text-white',
      badge: 'bg-red-700',
      icon: '🚨',
    },
    SIN_HALLAZGOS: {
      bg: 'bg-green-500/20',
      border: 'border-green-400/50',
      text: 'text-white',
      badge: 'bg-green-500',
      icon: '✅',
    },
    ALERTA: {
      bg: 'bg-amber-500/20',
      border: 'border-amber-400/50',
      text: 'text-white',
      badge: 'bg-amber-500',
      icon: '⚠️',
    },
  };

  return (
    <main
      className="min-h-screen relative text-white"
      style={{
        backgroundImage: "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(15,118,110,0.6)), url(/maro-hero.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/40 mix-blend-multiply" aria-hidden />

      <div className="relative mx-auto max-w-6xl px-6 py-10 lg:py-14 space-y-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-emerald-200/80">Paciente{patient?.folio ? `: ${patient.folio}` : ""}</p>
            <h1 className="text-3xl font-bold lg:text-4xl">Detalle de paciente</h1>
            <p className="text-slate-200/80 max-w-2xl">Datos generales y accesos rápidos a seguimiento, acciones preventivas y detecciones.</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard"
              className="rounded-full border border-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/10"
            >
              ← Dashboard
            </Link>
            <Link
              href={`/pacientes/${id}/editar`}
              className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 text-sm text-emerald-100 hover:border-emerald-300/70"
            >
              Editar
            </Link>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-200/80">Cargando…</p>
        ) : error ? (
          <p className="text-sm text-red-200">{error}</p>
        ) : !patient ? (
          <p className="text-sm text-slate-200/80">Paciente no encontrado.</p>
        ) : (
          <div className="space-y-6">
            {/* DATOS GENERALES */}
            <section className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Datos generales</h2>
                {patient.folio && (
                  <span className="text-xs text-emerald-100 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                    {patient.folio}
                  </span>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {infoRow("Nombre", patient.nombre_completo)}
                {infoRow("Folio", patient.folio)}
                {infoRow("CLUES", patient.clues_id)}
                {infoRow("Unidad", patient.unidad)}
                {infoRow("Región", patient.region)}
                {infoRow("Municipio", patient.municipio)}
                {infoRow("Ingreso CPN", formatDate(patient.fecha_ingreso_cpn))}
                {infoRow("FUM", formatDate(patient.fum))}
                {infoRow("FPP", formatDate(patient.fpp))}
                {infoRow("Semanas gestación", patient.semanas_gestacion)}
                {infoRow("SDG ingreso", patient.sdg_ingreso)}
                {infoRow("Riesgo obstétrico", patient.riesgo_obstetrico_ingreso)}
                {infoRow("Teléfono", patient.telefono)}
                {infoRow("Dirección", patient.direccion)}
              </div>
            </section>

            {/* ENLACES RÁPIDOS */}
            <section className="space-y-3">
              <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "Consultas/Seguimiento",
                  desc: "Captura consultas prenatales y signos vitales",
                  href: `/pacientes/${patient.id}/consultas`,
                  accent: "border-cyan-500/40 bg-cyan-500/10 text-cyan-50",
                },
                {
                  title: "Acciones preventivas",
                  desc: "Intervenciones y educación para la paciente",
                  href: `/pacientes/${patient.id}/acciones`,
                  accent: "border-amber-500/40 bg-amber-500/10 text-amber-50",
                },
                {
                  title: "Detecciones Tercer Trimestre",
                  desc: "Tamizajes y hallazgos relevantes en el tercer trimestre",
                  href: `/pacientes/${patient.id}/detecciones`,
                  accent: "border-emerald-500/40 bg-emerald-500/10 text-emerald-50",
                },
              ].map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`flex flex-col gap-2 rounded-2xl border px-4 py-5 shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl ${item.accent}`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-semibold">{item.title}</p>
                    <span className="text-xs text-white/80">Ingresar →</span>
                  </div>
                  <p className="text-sm text-white/90">{item.desc}</p>
                </Link>
              ))}
              </div>
            </section>

            {/* SECCIÓN FACTOR DE RIESGO ANTECEDENTES */}
            {resultadoRiesgo && (
              <section className={`rounded-2xl border-2 backdrop-blur-sm shadow-2xl ${colorMap[resultadoRiesgo.nivel].bg} ${colorMap[resultadoRiesgo.nivel].border}`}>
                {/* HEADER COLAPSABLE */}
                <button
                  onClick={() => setExpandidoRiesgo(!expandidoRiesgo)}
                  className="w-full p-4 flex items-center justify-between gap-3 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{colorMap[resultadoRiesgo.nivel].icon}</span>
                    <div className="text-left">
                      <h2 className="text-lg font-bold text-white">Factor de Riesgo Antecedentes</h2>
                      <p className="text-[10px] text-white/80">Evaluación de antecedentes obstétricos</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-3xl font-bold text-white">{resultadoRiesgo.puntajeTotal}</div>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-lg ${colorMap[resultadoRiesgo.nivel].badge}`}>
                        {resultadoRiesgo.nivel}
                      </span>
                    </div>
                    <span className="text-white text-lg">{expandidoRiesgo ? '▼' : '▶'}</span>
                  </div>
                </button>

                {/* CONTENIDO EXPANDIBLE */}
                {expandidoRiesgo && (
                  <div className="px-4 pb-4 space-y-3 border-t border-white/20 pt-3 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-xs text-center text-white/90 bg-white/10 rounded-lg px-3 py-2">
                      {resultadoRiesgo.descripcion}
                    </p>

                    {resultadoRiesgo.factores.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-semibold text-white/80">
                          FACTORES IDENTIFICADOS ({resultadoRiesgo.factores.length}):
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {resultadoRiesgo.factores.map((factor, idx) => (
                            <div
                              key={idx}
                              className="rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 px-2.5 py-1.5"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex-1">
                                  <div className="font-semibold text-xs text-white">{factor.campo}</div>
                                  <div className="text-[10px] text-white/70 mt-0.5">{factor.razon}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-lg text-white">+{factor.puntos}</div>
                                  <div className="text-[8px] text-white/60">pts</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recomendación clínica */}
                    <div className="rounded-lg bg-white/15 backdrop-blur-sm border border-white/30 px-3 py-2">
                      <div className="text-[10px] font-semibold text-white mb-1.5">📋 RECOMENDACIÓN CLÍNICA:</div>
                      <div className="text-[10px] text-white/90">
                        {resultadoRiesgo.nivel === 'BAJO' && (
                          "Continuar con control prenatal de rutina."
                        )}
                        {resultadoRiesgo.nivel === 'ALTO' && (
                          <>Sacar consulta con segundo nivel de atención, a GYO y especialidades acorde a comorbilidades.
                            {patient.semanas_gestacion && patient.semanas_gestacion >= 30 && patient.semanas_gestacion <= 31 ? (
                              <span className="font-bold"> Cita en máximo 3 semanas.</span>
                            ) : (
                              <span className="font-bold"> Cita en 6 semanas máximo.</span>
                            )}
                          </>
                        )}
                        {resultadoRiesgo.nivel === 'MUY_ALTO' && (
                          <>Sacar consulta con segundo o tercer nivel de atención, a GYO y especialidades acorde a comorbilidades.
                            <span className="font-bold"> Cita en 2 semanas máximo.</span>
                          </>
                        )}
                        {resultadoRiesgo.nivel === 'CRITICO' && (
                          "⚠️ COLEGIAR CASO - Requiere colegiación inmediata del caso y atención especializada urgente."
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* SECCIÓN TAMIZAJES INICIALES */}
            {resultadoTamizajes && (resultadoTamizajes.tamizajes.length > 0 || resultadoTamizajes.nivel === 'SIN_HALLAZGOS') && (
              <section className={`rounded-2xl border-2 backdrop-blur-sm shadow-2xl ${colorMap[resultadoTamizajes.nivel].bg} ${colorMap[resultadoTamizajes.nivel].border}`}>
                {/* HEADER COLAPSABLE */}
                <button
                  onClick={() => setExpandidoTamizajes(!expandidoTamizajes)}
                  className="w-full p-4 flex items-center justify-between gap-3 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{colorMap[resultadoTamizajes.nivel].icon}</span>
                    <div className="text-left">
                      <h2 className="text-lg font-bold text-white">Factor de Riesgo Tamizajes</h2>
                      <p className="text-[10px] text-white/80">Evaluación de tamizajes iniciales</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-3xl font-bold text-white">{resultadoTamizajes.puntajeTotal}</div>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white shadow-lg ${colorMap[resultadoTamizajes.nivel].badge}`}>
                        {resultadoTamizajes.nivel === 'SIN_HALLAZGOS' ? 'SIN HALLAZGOS' : 'ALERTA'}
                      </span>
                    </div>
                    <span className="text-white text-lg">{expandidoTamizajes ? '▼' : '▶'}</span>
                  </div>
                </button>

                {/* CONTENIDO EXPANDIBLE */}
                {expandidoTamizajes && (
                  <div className="px-4 pb-4 space-y-3 border-t border-white/20 pt-3 animate-in slide-in-from-top-2 duration-200">
                    <p className="text-xs text-center text-white/90 bg-white/10 rounded-lg px-3 py-2">
                      {resultadoTamizajes.descripcion}
                    </p>

                    {resultadoTamizajes.tamizajes.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-semibold text-white/80">
                          HALLAZGOS EN TAMIZAJES ({resultadoTamizajes.tamizajes.length}):
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {resultadoTamizajes.tamizajes.map((tamizaje, idx) => (
                            <div
                              key={idx}
                              className="rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 px-2.5 py-1.5"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div className="flex-1">
                                  <div className="font-semibold text-xs text-white">{tamizaje.campo}</div>
                                  <div className="text-[10px] text-white/70 mt-0.5">{tamizaje.razon}</div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-lg text-white">+{tamizaje.puntos}</div>
                                  <div className="text-[8px] text-white/60">pts</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recomendación clínica para tamizajes */}
                    <div className="rounded-lg bg-white/15 backdrop-blur-sm border border-white/30 px-3 py-2">
                      <div className="text-[10px] font-semibold text-white mb-1.5">📋 RECOMENDACIÓN CLÍNICA:</div>
                      <div className="text-[10px] text-white/90">
                        {resultadoTamizajes.nivel === 'SIN_HALLAZGOS' && (
                          "Seguimiento de rutina. Resultados de tamizajes sin hallazgos positivos."
                        )}
                        {resultadoTamizajes.nivel === 'ALERTA' && (
                          "Iniciar protocolo de seguimiento específico según hallazgo. Referir a especialidad si es necesario."
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
