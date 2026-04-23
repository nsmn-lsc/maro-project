"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SessionInfo = {
  nivel?: number;
  unidad?: string;
  displayName?: string;
};

type RegistroRiesgo = {
  paciente_id: number;
  folio: string | null;
  nombre_completo: string | null;
  region: string | null;
  municipio: string | null;
  unidad: string | null;
  clues_id: string | null;
  consulta_id: number;
  fecha_consulta: string | null;
  puntaje_total_consulta: number;
  puntaje_real_sin_forzar: number;
  puntaje_consulta_parametros: number;
  riesgo_25_plus: number;
  alerta_por_criterio_clinico: number;
  motivo_alerta: string | null;
  colegiado: number;
  consulta_creada: string;
  edad: number | null;
};

type AlertaFlotante = {
  cantidad: number;
};

export default function ModuloEstatalRiesgoPage() {
  type EstadoCorte = "todos" | "no_colegiados" | "colegiados";
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [registros, setRegistros] = useState<RegistroRiesgo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState("Usuario Estatal");
  const [alertaFlotante, setAlertaFlotante] = useState<AlertaFlotante | null>(null);
  const [regionFilter, setRegionFilter] = useState("");
  const [unidadFilter, setUnidadFilter] = useState("");
  const [folioFilter, setFolioFilter] = useState("");
  const [estadoCorte, setEstadoCorte] = useState<EstadoCorte>("no_colegiados");
  const [page, setPage] = useState(1);
  const perPage = 20;
  const knownConsultaIdsRef = useRef<Set<number>>(new Set());
  const loadedOnceRef = useRef(false);

  const loadRegistros = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/estatal/riesgo?limit=500", { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo cargar el módulo estatal");
      const data = (await res.json()) as RegistroRiesgo[];
      setRegistros(data);

      const currentIds = new Set(
        data
          .map((item) => Number(item.consulta_id))
          .filter((id) => Number.isFinite(id) && id > 0)
      );

      if (loadedOnceRef.current) {
        let nuevos = 0;
        for (const id of currentIds) {
          if (!knownConsultaIdsRef.current.has(id)) nuevos += 1;
        }

        if (nuevos > 0) {
          setAlertaFlotante((prev) => ({
            cantidad: (prev?.cantidad ?? 0) + nuevos,
          }));
        }
      }

      knownConsultaIdsRef.current = currentIds;
      loadedOnceRef.current = true;
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Error desconocido");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("maro:user");
    if (!stored) {
      router.replace("/inicial");
      return;
    }

    try {
      const session = JSON.parse(stored) as SessionInfo;
      if ((session.nivel ?? 0) < 3) {
        router.replace((session.nivel ?? 0) >= 2 ? "/region" : "/dashboard");
        return;
      }
      setSessionName(session.displayName || session.unidad || "Usuario Estatal");
      setAuthChecked(true);
    } catch {
      router.replace("/inicial");
    }
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;

    let cancelled = false;

    const run = async () => {
      try {
        await loadRegistros(false);
      } catch {
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [authChecked, loadRegistros]);

  useEffect(() => {
    if (!authChecked) return;

    const handleWindowFocus = () => {
      loadRegistros(true);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        loadRegistros(true);
      }
    };

    const handleStorageSync = (event: StorageEvent) => {
      if (event.key === "maro:colegiado-updated" || event.key === "maro:estatal-riesgo-updated") {
        loadRegistros(true);
      }
    };

    const handleCustomSync = () => {
      loadRegistros(true);
    };

    const intervalId = window.setInterval(() => {
      loadRegistros(true);
    }, 15000);

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("storage", handleStorageSync);
    window.addEventListener("maro:colegiado-updated", handleCustomSync as EventListener);
    window.addEventListener("maro:estatal-riesgo-updated", handleCustomSync as EventListener);

    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("storage", handleStorageSync);
      window.removeEventListener("maro:colegiado-updated", handleCustomSync as EventListener);
      window.removeEventListener("maro:estatal-riesgo-updated", handleCustomSync as EventListener);
      window.clearInterval(intervalId);
    };
  }, [authChecked, loadRegistros]);

  const totalRegistros = registros.length;
  const registrosFiltrados = useMemo(() => {
    return registros.filter((row) => {
      const matchRegion =
        regionFilter === "" ||
        String(row.region || "").toLowerCase().includes(regionFilter.toLowerCase());
      const matchUnidad =
        unidadFilter === "" ||
        String(row.unidad || "").toLowerCase().includes(unidadFilter.toLowerCase());
      const matchFolio =
        folioFilter === "" ||
        String(row.folio || "").toLowerCase().includes(folioFilter.toLowerCase());
      return matchRegion && matchUnidad && matchFolio;
    });
  }, [folioFilter, regionFilter, registros, unidadFilter]);

  const promedioPuntaje = useMemo(() => {
    if (registros.length === 0) return 0;
    const sum = registros.reduce((acc, r) => acc + (Number(r.puntaje_total_consulta) || 0), 0);
    return Math.round((sum / registros.length) * 10) / 10;
  }, [registros]);

  const conteoNoColegiados = useMemo(
    () => registrosFiltrados.filter((r) => Number(r.colegiado) !== 1).length,
    [registrosFiltrados]
  );
  const conteoColegiados = useMemo(
    () => registrosFiltrados.filter((r) => Number(r.colegiado) === 1).length,
    [registrosFiltrados]
  );

  const registrosSegmentados = useMemo(() => {
    if (estadoCorte === "no_colegiados") {
      return registrosFiltrados.filter((r) => Number(r.colegiado) !== 1);
    }
    if (estadoCorte === "colegiados") {
      return registrosFiltrados.filter((r) => Number(r.colegiado) === 1);
    }
    return registrosFiltrados;
  }, [estadoCorte, registrosFiltrados]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(registrosSegmentados.length / perPage)),
    [registrosSegmentados.length]
  );

  const registrosPaginados = useMemo(() => {
    const start = (page - 1) * perPage;
    return registrosSegmentados.slice(start, start + perPage);
  }, [page, registrosSegmentados]);

  useEffect(() => {
    setPage(1);
  }, [regionFilter, unidadFilter, folioFilter, estadoCorte]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const regionesDisponibles = useMemo(() => {
    return Array.from(
      new Set(
        registros
          .map((r) => String(r.region || "").trim())
          .filter((r) => r.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b, "es"));
  }, [registros]);

  const unidadesDisponibles = useMemo(() => {
    const base = registros.filter((r) => {
      if (!regionFilter) return true;
      return String(r.region || "").toLowerCase() === regionFilter.toLowerCase();
    });

    return Array.from(
      new Set(
        base
          .map((r) => String(r.unidad || "").trim())
          .filter((u) => u.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b, "es"));
  }, [regionFilter, registros]);

  const limpiarFiltros = () => {
    setRegionFilter("");
    setUnidadFilter("");
    setFolioFilter("");
  };

  const cerrarSesion = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Ignorar errores de red; se fuerza salida local de todos modos.
    } finally {
      localStorage.removeItem("maro:user");
      router.replace("/inicial");
    }
  };

  const formatDate = (value: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const estatalBackgroundStyle = {
    backgroundImage: "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(15,118,110,0.6)), url(/maro_back_estatal.png)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat" as const,
  };

  if (!authChecked) {
    return (
      <main className="min-h-screen relative text-slate-100" style={estatalBackgroundStyle}>
        <div className="absolute inset-0 bg-black/45" aria-hidden />
        <div className="relative min-h-screen flex items-center justify-center">
          Validando acceso estatal...
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen relative text-slate-100"
      style={estatalBackgroundStyle}
    >
      {alertaFlotante && (
        <div className="fixed top-4 right-4 z-50 max-w-sm rounded-xl border border-red-400/50 bg-red-900/90 px-4 py-3 shadow-2xl shadow-red-900/60 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <div className="text-xl leading-none">🚨</div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.16em] text-red-200/90">Notificación estatal</p>
              <p className="text-sm text-red-100 mt-1">
                {alertaFlotante.cantidad === 1
                  ? "Se detectó 1 nuevo paciente en alto riesgo activo."
                  : `Se detectaron ${alertaFlotante.cantidad} pacientes nuevos en alto riesgo activo.`}
              </p>
            </div>
            <button
              onClick={() => setAlertaFlotante(null)}
              className="text-red-200/70 hover:text-red-100 text-sm"
              aria-label="Cerrar notificación"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="absolute inset-0 bg-black/45" aria-hidden />

      <div className="relative max-w-7xl mx-auto space-y-6 p-6 lg:p-10">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-300/80">Nivel estatal</p>
            <h1 className="text-3xl font-bold">Pacientes en alto riesgo activo</h1>
            <p className="text-slate-300/80">Vista consolidada de todas las unidades · Sesión: {sessionName}</p>
          </div>
          <button
            type="button"
            onClick={cerrarSesion}
            className="text-sm px-3 py-1.5 rounded-full border border-slate-500 text-slate-200 hover:border-slate-300 hover:text-white"
          >
            Cerrar sesión
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Card title="Registros activos" value={String(totalRegistros)} />
          <Card title="Puntaje promedio" value={`${promedioPuntaje} pts`} />
          <Card title="Cobertura" value="Todas las unidades" />
        </section>

        <section className="bg-slate-900/60 border border-slate-700 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Concentrado estatal de riesgo alto</h2>
            <div className="flex items-center gap-2">
              <Link href="/estatal/reportes" className="text-sm px-3 py-1.5 rounded-full border border-cyan-500/50 text-cyan-200 hover:border-cyan-300">
                Ver reportes
              </Link>
              <Link href="/colegiados" className="text-sm px-3 py-1.5 rounded-full border border-emerald-500/50 text-emerald-200 hover:border-emerald-300">
                Ver colegiados
              </Link>
            </div>
          </div>

          <div className="mb-4 space-y-3 rounded-xl border border-slate-700 bg-slate-950/50 p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <select
                value={regionFilter}
                onChange={(e) => {
                  setRegionFilter(e.target.value);
                  setUnidadFilter("");
                }}
                className="rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400"
              >
                <option value="">Todas las regiones</option>
                {regionesDisponibles.map((region) => (
                  <option key={region} value={region}>
                    {region}
                  </option>
                ))}
              </select>
              <select
                value={unidadFilter}
                onChange={(e) => setUnidadFilter(e.target.value)}
                className="rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400"
              >
                <option value="">Todas las unidades</option>
                {unidadesDisponibles.map((unidad) => (
                  <option key={unidad} value={unidad}>
                    {unidad}
                  </option>
                ))}
              </select>
              <input
                type="search"
                placeholder="Filtrar por folio..."
                value={folioFilter}
                onChange={(e) => setFolioFilter(e.target.value)}
                className="rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400"
              />
            </div>
            {(regionFilter || unidadFilter || folioFilter) && (
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-slate-400">
                  Mostrando {registrosSegmentados.length} de {registros.length} registros
                </p>
                <button
                  type="button"
                  onClick={limpiarFiltros}
                  className="text-xs px-3 py-1.5 rounded-full border border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white"
                >
                  Limpiar filtros
                </button>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEstadoCorte("todos")}
                className={`text-xs px-3 py-1.5 rounded-full border ${
                  estadoCorte === "todos"
                    ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                    : "border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white"
                }`}
              >
                Todos ({registrosFiltrados.length})
              </button>
              <button
                type="button"
                onClick={() => setEstadoCorte("no_colegiados")}
                className={`text-xs px-3 py-1.5 rounded-full border ${
                  estadoCorte === "no_colegiados"
                    ? "border-amber-400 bg-amber-500/20 text-amber-200"
                    : "border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white"
                }`}
              >
                No colegiados ({conteoNoColegiados})
              </button>
              <button
                type="button"
                onClick={() => setEstadoCorte("colegiados")}
                className={`text-xs px-3 py-1.5 rounded-full border ${
                  estadoCorte === "colegiados"
                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-200"
                    : "border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white"
                }`}
              >
                Colegiados ({conteoColegiados})
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-slate-300">Cargando registros...</p>
          ) : error ? (
            <p className="text-red-300">{error}</p>
          ) : registros.length === 0 ? (
            <p className="text-slate-300">No hay pacientes en alto riesgo activo.</p>
          ) : registrosSegmentados.length === 0 ? (
            <p className="text-slate-300">No hay coincidencias para los filtros aplicados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-slate-300">
                    <th className="py-2 pr-4">Folio</th>
                    <th className="py-2 pr-4">Paciente</th>
                    <th className="py-2 pr-4">Región</th>
                    <th className="py-2 pr-4">Unidad</th>
                    <th className="py-2 pr-4">Fecha consulta</th>
                    <th className="py-2 pr-4">Riesgo / Motivo</th>
                    <th className="py-2 pr-4">Colegiado</th>
                    <th className="py-2 pr-0 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {registrosPaginados.map((row) => (
                    <tr
                      key={`${row.consulta_id}-${row.paciente_id}`}
                      className={
                        Number(row.edad) >= 10 && Number(row.edad) <= 14
                          ? "hover:bg-rose-900/20 bg-rose-950/25 border-l-2 border-rose-500"
                          : "hover:bg-slate-800/40"
                      }
                    >
                      <td className="py-2 pr-4">{row.folio || "—"}</td>
                      <td className="py-2 pr-4">
                        <div>{row.nombre_completo || "Sin nombre"}</div>
                        {Number(row.edad) >= 10 && Number(row.edad) <= 14 && (
                          <span className="inline-flex items-center gap-1 mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-rose-500/25 text-rose-300 border border-rose-500/40">
                            ⚠ Alerta Edad · {row.edad} años
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4">{row.region || "—"}</td>
                      <td className="py-2 pr-4">
                        <div>{row.unidad || "—"}</div>
                        <div className="text-xs text-slate-400">{row.clues_id || ""}</div>
                      </td>
                      <td className="py-2 pr-4">{formatDate(row.fecha_consulta)}</td>
                      <td className="py-2 pr-4">
                        {Number(row.alerta_por_criterio_clinico) === 1 ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold bg-amber-500/20 text-amber-200 border border-amber-500/40">
                              Criterio clinico
                            </span>
                            <div className="text-[11px] text-amber-100/80">
                              {row.motivo_alerta || "Edad/Padecimiento"}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold bg-red-500/20 text-red-200 border border-red-500/40">
                            {row.puntaje_total_consulta} pts
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        {Number(row.colegiado) === 1 ? (
                          <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-500/40">
                            Sí
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold bg-slate-700/40 text-slate-200 border border-slate-600">
                            No
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-0 text-right">
                        <Link
                          href={`/estatal/pacientes/${row.paciente_id}`}
                          className="text-xs px-2 py-1 rounded-full border border-cyan-500/40 text-cyan-200 hover:border-cyan-300"
                        >
                          Ver paciente
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {registrosSegmentados.length > perPage && (
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-800 pt-3">
                  <p className="text-xs text-slate-400">
                    Página {page} de {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      disabled={page === 1}
                      className="text-xs px-3 py-1.5 rounded-full border border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white disabled:opacity-40"
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={page === totalPages}
                      className="text-xs px-3 py-1.5 rounded-full border border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white disabled:opacity-40"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4">
      <p className="text-sm text-slate-300">{title}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}
