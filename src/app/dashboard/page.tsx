"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

type Patient = {
  id: number;
  folio: string | null;
  nombre_completo: string | null;
  clues_id: string;
  municipio: string | null;
  fecha_ingreso_cpn: string | null;
  sdg_ingreso: number | null;
  factor_riesgo_antecedentes: number | null;
  factor_riesgo_tamizajes: number | null;
  puntaje_ultima_consulta: number | null;
  puntaje_total_actual: number | null;
};

type SessionInfo = {
  clues: string;
  unidad: string;
  region: string;
  municipio: string;
  nivel: number;
  displayName?: string;
};

export default function Dashboard() {
  const [user, setUser] = useState<SessionInfo | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [patientsError, setPatientsError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({ total: 0, alto_riesgo: 0, semana_actual: 0 });
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("maro:user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const params = new URLSearchParams({ limit: "8" });
        if (user?.clues) params.set("clues_id", user.clues);
        if (user?.region) params.set("region", user.region);

        const res = await fetch(`/api/pacientes?${params.toString()}`);
        if (!res.ok) throw new Error("Error al obtener pacientes");
        const data = await res.json();
        if (!cancelled) {
          setPatients(data);
          setPatientsError(null);
        }
      } catch (err: any) {
        if (!cancelled) setPatientsError(err.message || "Error desconocido");
      } finally {
        if (!cancelled) setLoadingPatients(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const loadMetrics = async () => {
      setLoadingMetrics(true);
      try {
        const params = new URLSearchParams({ summary: "metrics" });
        if (user?.clues) params.set("clues_id", user.clues);
        if (user?.region) params.set("region", user.region);

        const fetchMetrics = async (qs: string) => {
          const res = await fetch(`/api/pacientes?${qs}`);
          if (!res.ok) throw new Error("No se pudieron cargar métricas");
          return res.json();
        };

        const data = await fetchMetrics(params.toString());

        if (!cancelled) {
          setMetrics({
            total: Number(data.total) || 0,
            alto_riesgo: Number(data.alto_riesgo) || 0,
            semana_actual: Number(data.semana_actual) || 0,
          });
          setMetricsError(null);
        }
      } catch (err: any) {
        if (!cancelled) setMetricsError(err.message || "Error desconocido");
      } finally {
        if (!cancelled) setLoadingMetrics(false);
      }
    };

    loadMetrics();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const formatDate = (value: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const handleGenerateExcel = () => {
    if (patients.length === 0) {
      alert("No hay pacientes para generar el reporte");
      return;
    }

    // Preparar datos para Excel
    const data = patients.map((p) => ({
      "Folio": p.folio || "—",
      "Paciente": p.nombre_completo || "Sin nombre",
      "Ingreso": formatDate(p.fecha_ingreso_cpn),
      "SDG": p.sdg_ingreso ?? "—",
      "Puntaje Antecedentes": p.factor_riesgo_antecedentes ?? "—",
      "Puntaje Tamizajes": p.factor_riesgo_tamizajes ?? "—",
      "Puntaje Última Consulta": p.puntaje_ultima_consulta ?? "—",
      "Puntaje Total Actual": p.puntaje_total_actual ?? "—",
    }));

    // Crear workbook y worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pacientes");

    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 12 }, // Folio
      { wch: 25 }, // Paciente
      { wch: 12 }, // Ingreso
      { wch: 6 },  // SDG
      { wch: 22 }, // Puntaje Antecedentes
      { wch: 18 }, // Puntaje Tamizajes
      { wch: 24 }, // Puntaje Última Consulta
      { wch: 20 }, // Puntaje Total Actual
    ];
    ws["!cols"] = colWidths;

    // Generar fecha para el nombre del archivo
    const now = new Date();
    const date = `${now.getDate().toString().padStart(2, "0")}-${(now.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${now.getFullYear()}`;
    const filename = `Concentrado_Pacientes_${date}.xlsx`;

    // Descargar
    XLSX.writeFile(wb, filename);
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
        <header className="flex flex-col gap-2">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-200/80">Acceso verificado</p>
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl font-bold lg:text-4xl">Panel principal</h1>
            <span className="text-sm text-emerald-100/80 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full">
              Inicio → Dashboard
            </span>
          </div>
          <p className="text-slate-200/80 max-w-2xl">
            Bienvenido. Desde este panel puedes ver un resumen de los pacientes registrados en tu unidad y acceder a las funciones principales del sistema.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Resumen rápido</h2>
                <p className="text-sm text-slate-200/70">Métricas de pacientes en tu unidad</p>
              </div>
              <span className="text-sm text-emerald-100 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                {user?.clues ? `CLUES ${user.clues}` : "Sesión"}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Pacientes en tu unidad",
                  value: metrics.total,
                  accent: "bg-emerald-500/20 text-emerald-100",
                },
                {
                  title: "Alto riesgo (≥25)",
                  value: "--",
                  accent: "bg-amber-500/20 text-amber-100",
                  note: "Sumatoria en construcción",
                },
                {
                  title: "Ingresos últimos 7 días",
                  value: metrics.semana_actual,
                  accent: "bg-cyan-500/20 text-cyan-100",
                },
              ].map((card) => (
                <div
                  key={card.title}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-5 shadow-inner text-center"
                >
                  <p className="text-sm text-slate-200/70 text-center">{card.title}</p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span className={`inline-flex h-12 min-w-[3.5rem] items-center justify-center rounded-lg text-2xl font-semibold ${card.accent}`}>
                      {loadingMetrics ? "…" : card.value}
                    </span>
                  </div>
                  {card.note && <p className="mt-2 text-xs text-slate-200/70">{card.note}</p>}
                  {metricsError && <p className="mt-2 text-xs text-red-200">{metricsError}</p>}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-200 text-xl font-bold">
                M
              </div>
              <div>
                <p className="text-sm text-emerald-100/80">MARO</p>
                <p className="text-lg font-semibold">Acceso activo</p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-slate-100/80">
              <p className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /> Sesión válida
              </p>
              {user ? (
                <>
                  <p className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400/70" /> CLUES: {user.clues}
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400/70" /> Unidad: {user.unidad}
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400/70" /> Región: {user.region}
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400/70" /> Municipio: {user.municipio}
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-400/70" /> Nivel: {user.nivel}
                  </p>
                </>
              ) : (
                <p className="text-slate-200/70">No hay sesión cargada. Inicia desde /inicial.</p>
              )}
            </div>
          </div>
        </section>

        <section className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Pacientes registrados</h2>
              <p className="text-sm text-slate-200/70">Últimos 8 registros capturados</p>
            </div>
            <div className="flex gap-2">
              {(user?.nivel ?? 0) >= 3 && (
                <Link
                  href="/estatal"
                  className="text-sm text-red-100 bg-red-500/15 border border-red-500/30 px-3 py-1.5 rounded-full hover:border-red-300/70 hover:text-white"
                >
                  Módulo estatal (≥25)
                </Link>
              )}
              <Link
                href="/pacientes/nuevo"
                className="text-sm text-emerald-100 bg-emerald-500/15 border border-emerald-500/30 px-3 py-1.5 rounded-full hover:border-emerald-300/70 hover:text-white"
              >
                + Nuevo paciente
              </Link>
              <Link
                href="/puerperio/nuevo"
                className="text-sm text-purple-100 bg-purple-500/15 border border-purple-500/30 px-3 py-1.5 rounded-full hover:border-purple-300/70 hover:text-white"
              >
                + Nuevo Puerperio
              </Link>
            </div>
          </div>

          {loadingPatients ? (
            <p className="text-sm text-slate-200/80">Cargando pacientes…</p>
          ) : patientsError ? (
            <p className="text-sm text-red-100">{patientsError}</p>
          ) : patients.length === 0 ? (
            <p className="text-sm text-slate-200/80">Aún no hay pacientes registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left">
                <thead className="text-slate-100/80">
                  <tr className="border-b border-white/10">
                    <th className="py-2 pr-4">Folio</th>
                    <th className="py-2 pr-4">Paciente</th>
                    <th className="py-2 pr-4">Ingreso</th>
                    <th className="py-2 pr-4">SDG</th>
                    <th className="py-2 pr-4">Antecedentes</th>
                    <th className="py-2 pr-4">Tamizajes</th>
                    <th className="py-2 pr-4">Última consulta</th>
                    <th className="py-2 pr-4">Total actual</th>
                    <th className="py-2 pr-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {patients.map((p) => (
                    <tr key={p.id} className="hover:bg-white/5">
                      <td className="py-2 pr-4 text-white">{p.folio || "—"}</td>
                      <td className="py-2 pr-4 text-white">{p.nombre_completo || "Sin nombre"}</td>
                      <td className="py-2 pr-4 text-slate-100/80">{formatDate(p.fecha_ingreso_cpn)}</td>
                      <td className="py-2 pr-4 text-slate-100/80">{p.sdg_ingreso ?? "—"}</td>
                      <td className="py-2 pr-4">
                        {(() => {
                          const score = p.factor_riesgo_antecedentes ?? 0;
                          return score > 0 ? (
                            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                              score <= 3 ? 'bg-green-500/20 text-green-100' :
                              score <= 9 ? 'bg-amber-500/20 text-amber-100' :
                              score <= 25 ? 'bg-orange-500/20 text-orange-100' :
                              'bg-red-500/20 text-red-100'
                            }`}>
                              {score} pts
                            </span>
                          ) : (
                            <span className="text-slate-100/60">—</span>
                          );
                        })()}
                      </td>
                      <td className="py-2 pr-4">
                        {(p.factor_riesgo_tamizajes ?? 0) === 0 ? (
                          <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-green-500/20 text-green-100">
                            0 pts
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-amber-500/20 text-amber-100">
                            {p.factor_riesgo_tamizajes} pts
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {(p.puntaje_ultima_consulta ?? 0) === 0 ? (
                          <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-slate-500/20 text-slate-100">
                            0 pts
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-1 rounded text-xs font-semibold bg-cyan-500/20 text-cyan-100">
                            {p.puntaje_ultima_consulta} pts
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {(() => {
                          const score = p.puntaje_total_actual ?? 0;
                          return (
                            <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                              score >= 25
                                ? 'bg-red-500/20 text-red-100'
                                : score >= 10
                                  ? 'bg-orange-500/20 text-orange-100'
                                  : score >= 4
                                    ? 'bg-amber-500/20 text-amber-100'
                                    : 'bg-green-500/20 text-green-100'
                            }`}>
                              {score} pts
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-2 pr-0 text-right">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/pacientes/${p.id}`}
                            className="text-xs text-cyan-100 bg-cyan-500/15 border border-cyan-500/30 px-2 py-1 rounded-full hover:border-cyan-300/70 hover:text-white"
                          >
                            Seguimiento
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="bg-amber-500/10 backdrop-blur-sm border border-amber-400/30 rounded-2xl shadow-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-amber-100">Reportes y Concentrados</h2>
              <p className="text-sm text-amber-200/70">Generación de reportes consolidados de datos</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleGenerateExcel}
                className="text-sm text-amber-100 bg-amber-500/15 border border-amber-500/30 px-3 py-1.5 rounded-full hover:border-amber-300/70 hover:bg-amber-500/25 transition-colors flex items-center gap-2"
                title="Descargar concentrado de pacientes en Excel"
              >
                📊 Generar Concentrado basico
              </button>
            </div>
          </div>
          <p className="text-sm text-amber-200/80 bg-amber-500/20 border border-amber-400/30 rounded-lg px-4 py-3">
            Descarga los datos de pacientes en formato Excel. El archivo incluye folio, nombre, ingreso, semanas de gestación, puntaje de antecedentes, tamizajes, puntaje de última consulta y total actual. Aun en construcción, esta función te permitirá obtener un reporte basico inicial de los pacientes registrados en tu unidad para análisis y seguimiento.
          </p>
        </section>
      </div>
    </main>
  );
}
