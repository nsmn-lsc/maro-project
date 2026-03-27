"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { REGION_CONFIGS } from "@/lib/regiones";

type SessionInfo = {
  nivel?: number;
  region?: string;
  displayName?: string;
  rol?: string;
};

type Paciente = {
  id: number;
  folio: string;
  nombre_completo: string;
  clues_id: string;
  unidad?: string | null;
  municipio: string;
  fecha_ingreso_cpn: string | null;
  sdg_ingreso: number | null;
  semanas_gestacion: number | null;
  factor_riesgo_antecedentes: number | null;
  factor_riesgo_tamizajes: number | null;
  edad?: number | null;
  imc_inicial?: number | null;
  factor_cardiopatia?: number | null;
  factor_hepatopatia?: number | null;
  factor_coagulopatias?: number | null;
  factor_nefropatia?: number | null;
  ultima_consulta_id?: number | null;
  puntaje_ultima_consulta: number | null;
  puntaje_total_actual: number | null;
};

type Metricas = {
  total: number;
  alto_riesgo: number;
  semana_actual: number;
};

type AlertaFlotante = {
  cantidad: number;
};

function riesgoColor(puntaje: number | null): string {
  if (puntaje === null) return "text-slate-400";
  if (puntaje >= 25) return "text-red-400 font-bold";
  if (puntaje > 15) return "text-amber-400 font-semibold";
  return "text-emerald-400";
}

function riesgoBadge(puntaje: number | null) {
  if (puntaje === null) return null;
  if (puntaje >= 25)
    return (
      <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-red-900/80 border border-red-400/40 text-red-200">
        ALTO
      </span>
    );
  if (puntaje > 15)
    return (
      <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-amber-900/80 border border-amber-400/35 text-amber-200">
        MEDIO
      </span>
    );
  return (
    <span className="ml-1 px-1.5 py-0.5 rounded text-xs bg-emerald-900/80 border border-emerald-300/35 text-emerald-200">
      BAJO
    </span>
  );
}

function esAlertaPorCriterioClinico(paciente: Paciente): boolean {
  const puntajeGeneral = Number(paciente.puntaje_total_actual) || 0;
  const edad = Number(paciente.edad);
  const imc = Number(paciente.imc_inicial);
  const porEdad = Number.isFinite(edad) && edad >= 10 && edad <= 14;
  const porImc = Number.isFinite(imc) && imc >= 31;
  const porPadecimientoMayor = [
    paciente.factor_cardiopatia,
    paciente.factor_hepatopatia,
    paciente.factor_coagulopatias,
    paciente.factor_nefropatia,
  ].some((value) => Number(value) === 1);
  return (porEdad || porImc || porPadecimientoMayor) && puntajeGeneral <= 25;
}

function motivoClinico(paciente: Paciente): string {
  const motivos: string[] = [];
  const edad = Number(paciente.edad);
  const imc = Number(paciente.imc_inicial);
  if (Number.isFinite(edad) && edad >= 10 && edad <= 14) motivos.push("Edad 10-14");
  if (Number.isFinite(imc) && imc >= 31) motivos.push(`IMC >=31 (${imc.toFixed(1)})`);
  if (Number(paciente.factor_cardiopatia) === 1) motivos.push("Cardiopatia");
  if (Number(paciente.factor_hepatopatia) === 1) motivos.push("Hepatopatia");
  if (Number(paciente.factor_coagulopatias) === 1) motivos.push("Coagulopatia");
  if (Number(paciente.factor_nefropatia) === 1) motivos.push("Nefropatia");
  return motivos.join(", ");
}

export default function RegionPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [folioFilter, setFolioFilter] = useState("");
  const [municipioFilter, setMunicipioFilter] = useState("");
  const [alertaFlotante, setAlertaFlotante] = useState<AlertaFlotante | null>(null);
  const knownHighRiskRef = useRef<Set<string>>(new Set());
  const loadedOnceRef = useRef(false);

  // ── Auth guard ──────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("maro:user");
    if (!stored) {
      router.replace("/inicial");
      return;
    }
    try {
      const s = JSON.parse(stored) as SessionInfo;
      if ((s.nivel ?? 0) < 2) {
        router.replace("/dashboard");
        return;
      }
      setSession(s);
      setAuthChecked(true);
    } catch {
      router.replace("/inicial");
    }
  }, [router]);

  const loadRegionData = useCallback(
    async (silent = false) => {
      if (!authChecked || !session?.region) return;
      const region = session.region;

      if (!silent) setLoading(true);
      setError("");

      try {
        const [listData, metData] = await Promise.all([
          fetch(`/api/pacientes?region=${encodeURIComponent(region)}&limit=50`, {
            cache: "no-store",
          }).then((r) => r.json()),
          fetch(`/api/pacientes?summary=metrics&region=${encodeURIComponent(region)}`, {
            cache: "no-store",
          }).then((r) => r.json()),
        ]);

        const nextPacientes = Array.isArray(listData) ? (listData as Paciente[]) : [];
        setPacientes(nextPacientes);
        setMetricas({
          total: metData.total ?? 0,
          alto_riesgo: metData.alto_riesgo ?? 0,
          semana_actual: metData.semana_actual ?? 0,
        });

        const nextHighRisk = new Set(
          nextPacientes
            .filter((p) => (p.puntaje_total_actual ?? 0) >= 25 || esAlertaPorCriterioClinico(p))
            .map((p) => `${p.id}-${p.ultima_consulta_id ?? "na"}`)
        );

        if (loadedOnceRef.current) {
          let nuevos = 0;
          for (const key of nextHighRisk) {
            if (!knownHighRiskRef.current.has(key)) nuevos += 1;
          }
          if (nuevos > 0) {
            setAlertaFlotante((prev) => ({
              cantidad: (prev?.cantidad ?? 0) + nuevos,
            }));
          }
        }

        knownHighRiskRef.current = nextHighRisk;
        loadedOnceRef.current = true;
      } catch {
        setError("Error al cargar datos. Verifica tu conexión.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [authChecked, session]
  );

  // ── Carga inicial y sincronización en vivo ─────────────────────
  useEffect(() => {
    if (!authChecked || !session?.region) return;

    loadRegionData(false);

    const onFocus = () => {
      loadRegionData(true);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        loadRegionData(true);
      }
    };

    const intervalId = window.setInterval(() => {
      loadRegionData(true);
    }, 15000);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.clearInterval(intervalId);
    };
  }, [authChecked, loadRegionData, session]);

  const regionDisplay =
    REGION_CONFIGS.find((r) => r.id === session?.region)?.displayName ??
    session?.region ??
    "Región";

  const municipiosDisponibles = useMemo(() => {
    return Array.from(
      new Set(
        pacientes
          .map((p) => String(p.municipio || "").trim())
          .filter((municipio) => municipio.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b, "es"));
  }, [pacientes]);

  const foliosDisponibles = useMemo(() => {
    const base = pacientes.filter((p) => {
      const matchBusqueda =
        busqueda === "" ||
        p.nombre_completo?.toLowerCase().includes(busqueda.toLowerCase());
      const matchMunicipio =
        municipioFilter === "" ||
        p.municipio?.toLowerCase() === municipioFilter.toLowerCase();
      return matchBusqueda && matchMunicipio;
    });

    return Array.from(
      new Set(
        base
          .map((p) => String(p.folio || "").trim())
          .filter((folio) => folio.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b, "es"));
  }, [busqueda, municipioFilter, pacientes]);

  // Aplicar filtros
  const pacientesFiltrados = pacientes.filter((p) => {
    const matchBusqueda =
      busqueda === "" ||
      p.nombre_completo?.toLowerCase().includes(busqueda.toLowerCase());
    const matchFolio =
      folioFilter === "" || p.folio?.toLowerCase().includes(folioFilter.toLowerCase());
    const matchMunicipio =
      municipioFilter === "" ||
      p.municipio?.toLowerCase().includes(municipioFilter.toLowerCase());
    return matchBusqueda && matchFolio && matchMunicipio;
  });

  // Separar por riesgo
  const altoRiesgo = pacientesFiltrados
    .filter((p) => (p.puntaje_total_actual ?? 0) >= 25 || esAlertaPorCriterioClinico(p))
    .sort((a, b) => (b.puntaje_total_actual ?? 0) - (a.puntaje_total_actual ?? 0));
  const bajoMedioRiesgo = pacientesFiltrados
    .filter((p) => (p.puntaje_total_actual ?? 0) < 25 && !esAlertaPorCriterioClinico(p))
    .sort((a, b) => (b.puntaje_total_actual ?? 0) - (a.puntaje_total_actual ?? 0));

  const limpiarFiltros = () => {
    setBusqueda("");
    setFolioFilter("");
    setMunicipioFilter("");
  };

  if (!authChecked) {
    return (
      <main className="min-h-dvh relative text-white bg-emerald-950">
        <Image
          src="/region.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <div
          className="absolute inset-0 bg-gradient-to-br from-emerald-950/80 via-emerald-900/60 to-teal-900/50"
          aria-hidden
        />
        <div className="relative min-h-screen flex items-center justify-center">
          Validando acceso...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh relative text-white bg-emerald-950">
      <Image
        src="/region.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
      />
      <div
        className="absolute inset-0 bg-gradient-to-br from-emerald-950/80 via-emerald-900/60 to-teal-900/50"
        aria-hidden
      />
      <div className="relative">
      {alertaFlotante && (
        <div className="fixed top-4 right-4 z-50 max-w-sm rounded-xl border border-red-400/50 bg-red-900/90 px-4 py-3 shadow-2xl shadow-red-900/60 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <div className="text-xl leading-none">🚨</div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.16em] text-red-200/90">
                Notificación regional
              </p>
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

      {/* Header */}
      <header className="border-b border-emerald-200/20 bg-emerald-950/35 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-white">{regionDisplay}</h1>
            <p className="text-xs text-emerald-100/80">Módulo Regional MARO</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/60 hidden sm:block">
              {session?.displayName}
            </span>
            <button
              onClick={() => {
                localStorage.removeItem("maro:user");
                router.push("/inicial");
              }}
              className="text-xs text-white/50 hover:text-white border border-white/20 rounded-lg px-3 py-1.5 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Métricas */}
        {metricas && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-emerald-500/12 rounded-2xl p-4 border border-emerald-300/25 text-center">
              <div className="text-3xl font-bold text-white">
                {metricas.total}
              </div>
              <div className="text-xs text-emerald-100/80 mt-1">
                Pacientes en región
              </div>
            </div>
            <div className="bg-amber-500/12 rounded-2xl p-4 border border-amber-300/30 text-center">
              <div className="text-3xl font-bold text-red-400">
                {metricas.alto_riesgo}
              </div>
              <div className="text-xs text-amber-100/90 mt-1">
                Alto riesgo activo
              </div>
            </div>
            <div className="bg-teal-500/14 rounded-2xl p-4 border border-teal-300/25 text-center">
              <div className="text-3xl font-bold text-emerald-400">
                {metricas.semana_actual}
              </div>
              <div className="text-xs text-teal-100/90 mt-1">
                Ingresos esta semana
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-emerald-950/30 rounded-2xl border border-emerald-200/20 p-4 space-y-3 backdrop-blur-sm">
          <h3 className="text-sm font-semibold text-white">Filtros</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="search"
              placeholder="Buscar por nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="bg-emerald-900/35 border border-emerald-200/20 rounded-lg px-3 py-2 text-sm text-white placeholder:text-emerald-100/50 focus:outline-none focus:border-emerald-300"
            />
            <select
              value={folioFilter}
              onChange={(e) => setFolioFilter(e.target.value)}
              className="bg-emerald-900/50 border border-emerald-200/25 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-300"
            >
              <option value="">Todos los folios</option>
              {foliosDisponibles.map((folio) => (
                <option key={folio} value={folio}>
                  {folio}
                </option>
              ))}
            </select>
            <select
              value={municipioFilter}
              onChange={(e) => {
                setMunicipioFilter(e.target.value);
                setFolioFilter("");
              }}
              className="bg-emerald-900/50 border border-emerald-200/25 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-300"
            >
              <option value="">Todos los municipios</option>
              {municipiosDisponibles.map((municipio) => (
                <option key={municipio} value={municipio}>
                  {municipio}
                </option>
              ))}
            </select>
          </div>
          {(busqueda || folioFilter || municipioFilter) && (
            <button
              onClick={limpiarFiltros}
              className="text-xs text-white/60 hover:text-white border border-white/20 hover:border-white rounded-lg px-3 py-1.5 transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Estado de carga / error */}
        {loading && (
          <div className="text-center py-12 text-white/50">
            Cargando pacientes...
          </div>
        )}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Tabla ALTO RIESGO ACTIVO */}
        {!loading && !error && altoRiesgo.length > 0 && (
          <div className="bg-red-950/70 rounded-2xl border border-red-400/35 overflow-hidden backdrop-blur-sm">
            <div className="px-4 py-3 border-b border-red-400/35 bg-red-900/70">
              <h2 className="text-sm font-semibold text-red-300">
                🚨 ALTO RIESGO ACTIVO: {altoRiesgo.length}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-red-400/30 bg-red-900/65">
                    <th className="text-left px-4 py-3 text-red-300/80 font-medium">
                      Folio
                    </th>
                    <th className="text-left px-4 py-3 text-red-300/80 font-medium">
                      Paciente
                    </th>
                    <th className="text-left px-4 py-3 text-red-300/80 font-medium hidden lg:table-cell">
                      Unidad
                    </th>
                    <th className="text-left px-4 py-3 text-red-300/80 font-medium hidden md:table-cell">
                      Municipio
                    </th>
                    <th className="text-left px-4 py-3 text-red-300/80 font-medium hidden lg:table-cell">
                      Ingreso CPN
                    </th>
                    <th className="text-right px-4 py-3 text-red-300/80 font-medium hidden sm:table-cell">
                      SDG
                    </th>
                    <th className="text-right px-4 py-3 text-red-300/80 font-medium">
                      Puntaje
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-400/20">
                  {altoRiesgo.map((p) => (
                    <tr key={p.id} className="hover:bg-red-900/55 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-red-300/70">
                        {p.folio}
                      </td>
                      <td className="px-4 py-3 text-red-100 font-medium">
                        {p.nombre_completo || "—"}
                      </td>
                      <td className="px-4 py-3 text-red-300/70 hidden lg:table-cell text-xs">
                        {p.unidad || "—"}
                      </td>
                      <td className="px-4 py-3 text-red-300/70 hidden md:table-cell">
                        {p.municipio || "—"}
                      </td>
                      <td className="px-4 py-3 text-red-300/70 hidden lg:table-cell text-xs">
                        {p.fecha_ingreso_cpn
                          ? new Date(
                              p.fecha_ingreso_cpn
                            ).toLocaleDateString("es-MX")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-red-300/70 hidden sm:table-cell">
                        {p.semanas_gestacion ?? p.sdg_ingreso ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-red-400 font-bold">
                        {esAlertaPorCriterioClinico(p) ? (
                          <div className="inline-flex flex-col items-end gap-1">
                            <span className="px-2 py-0.5 rounded text-xs bg-amber-900/80 border border-amber-400/40 text-amber-200">
                              Criterio clinico
                            </span>
                            <span className="text-[10px] text-amber-200/90">{motivoClinico(p) || "Edad/Padecimiento"}</span>
                          </div>
                        ) : (
                          <>{p.puntaje_total_actual ?? "—"}</>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/region/pacientes/${p.id}`}
                          className="text-xs text-red-300 hover:text-red-100 border border-red-500/30 hover:border-red-400 rounded-lg px-2 py-1 transition-colors"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tabla BAJO/MEDIO RIESGO (<25) */}
        {!loading && !error && bajoMedioRiesgo.length > 0 && (
          <div className="bg-emerald-950/70 rounded-2xl border border-emerald-300/35 overflow-hidden backdrop-blur-sm">
            <div className="px-4 py-3 border-b border-emerald-300/35 bg-emerald-900/65">
              <h2 className="text-sm font-semibold text-emerald-300">
                ✓ Bajo/Medio Riesgo (puntaje &lt;25): {bajoMedioRiesgo.length}
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-emerald-300/30 bg-emerald-900/60">
                    <th className="text-left px-4 py-3 text-emerald-300/80 font-medium">
                      Folio
                    </th>
                    <th className="text-left px-4 py-3 text-emerald-300/80 font-medium">
                      Paciente
                    </th>
                    <th className="text-left px-4 py-3 text-emerald-300/80 font-medium hidden lg:table-cell">
                      Unidad
                    </th>
                    <th className="text-left px-4 py-3 text-emerald-300/80 font-medium hidden md:table-cell">
                      Municipio
                    </th>
                    <th className="text-left px-4 py-3 text-emerald-300/80 font-medium hidden lg:table-cell">
                      Ingreso CPN
                    </th>
                    <th className="text-right px-4 py-3 text-emerald-300/80 font-medium hidden sm:table-cell">
                      SDG
                    </th>
                    <th className="text-right px-4 py-3 text-emerald-300/80 font-medium">
                      Puntaje
                    </th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-300/20">
                  {bajoMedioRiesgo.map((p) => (
                    <tr key={p.id} className="hover:bg-emerald-900/50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-emerald-300/70">
                        {p.folio}
                      </td>
                      <td className="px-4 py-3 text-emerald-100 font-medium">
                        {p.nombre_completo || "—"}
                      </td>
                      <td className="px-4 py-3 text-emerald-300/70 hidden lg:table-cell text-xs">
                        {p.unidad || "—"}
                      </td>
                      <td className="px-4 py-3 text-emerald-300/70 hidden md:table-cell">
                        {p.municipio || "—"}
                      </td>
                      <td className="px-4 py-3 text-emerald-300/70 hidden lg:table-cell text-xs">
                        {p.fecha_ingreso_cpn
                          ? new Date(
                              p.fecha_ingreso_cpn
                            ).toLocaleDateString("es-MX")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-300/70 hidden sm:table-cell">
                        {p.semanas_gestacion ?? p.sdg_ingreso ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={riesgoColor(p.puntaje_total_actual)}>
                          {p.puntaje_total_actual ?? "—"}
                        </span>
                        {riesgoBadge(p.puntaje_total_actual)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/region/pacientes/${p.id}`}
                          className="text-xs text-emerald-300 hover:text-emerald-100 border border-emerald-500/30 hover:border-emerald-400 rounded-lg px-2 py-1 transition-colors"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Sin registros */}
        {!loading && !error && pacientesFiltrados.length === 0 && (
          <div className="bg-emerald-950/30 rounded-2xl border border-emerald-200/20 py-16 text-center text-emerald-100/80 text-sm">
            {busqueda || folioFilter || municipioFilter
              ? "Sin resultados para los filtros aplicados"
              : "No hay pacientes registradas en esta región"}
          </div>
        )}
      </main>
      </div>
    </main>
  );
}
