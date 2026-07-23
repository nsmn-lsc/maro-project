"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SessionInfo = {
  nivel?: number;
  region?: string;
  displayName?: string;
};

type CasoColegiadoRegion = {
  consulta_id: number;
  paciente_id: number;
  folio: string | null;
  nombre_completo: string | null;
  region: string | null;
  municipio: string | null;
  unidad: string | null;
  clues_id: string | null;
  fecha_consulta: string | null;
  puntaje_total_consulta: number | null;
  riesgo_25_plus: 0 | 1;
  fecha_colegiado: string | null;
  plan_id: number | null;
  plan_estatus: "borrador" | "completo";
  acciones_total: number;
  acciones_cumplidas: number;
  plan_actualizado_en: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function riesgoBadge(puntaje: number | null) {
  if (puntaje === null) return null;
  if (puntaje >= 25)
    return (
      <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-red-500/20 text-red-200 border border-red-500/40">
        ALTO
      </span>
    );
  if (puntaje > 15)
    return (
      <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-500/20 text-amber-200 border border-amber-500/40">
        MEDIO
      </span>
    );
  return (
    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-500/40">
      BAJO
    </span>
  );
}

export default function RegionColegiadosPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [casos, setCasos] = useState<CasoColegiadoRegion[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [municipioFilter, setMunicipioFilter] = useState("");

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
      if ((s.nivel ?? 0) >= 3) {
        router.replace("/colegiados");
        return;
      }
      setAuthChecked(true);
    } catch {
      router.replace("/inicial");
    }
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/region/colegiados", { cache: "no-store" });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.message || "Error al cargar casos colegiados");
        }
        const data = await res.json();
        if (!cancelled) setCasos(Array.isArray(data) ? data : []);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Error desconocido");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [authChecked]);

  const municipios = useMemo(() => {
    const set = new Set<string>();
    casos.forEach((c) => { if (c.municipio) set.add(c.municipio); });
    return Array.from(set).sort();
  }, [casos]);

  const filtered = useMemo(() => {
    let list = casos;
    if (busqueda.trim()) {
      const q = busqueda.trim().toLowerCase();
      list = list.filter(
        (c) =>
          (c.nombre_completo || "").toLowerCase().includes(q) ||
          (c.folio || "").toLowerCase().includes(q) ||
          (c.clues_id || "").toLowerCase().includes(q)
      );
    }
    if (municipioFilter) {
      list = list.filter((c) => c.municipio === municipioFilter);
    }
    return list;
  }, [casos, busqueda, municipioFilter]);

  const totalColegiados = casos.length;
  const conPlanCompleto = casos.filter((c) => c.plan_estatus === "completo").length;
  const accionesPendientes = casos.reduce(
    (acc, c) => acc + (c.acciones_total - c.acciones_cumplidas),
    0
  );

  if (!authChecked) {
    return (
      <main className="min-h-dvh relative text-white bg-emerald-950">
        <Image src="/region.png" alt="" fill priority sizes="100vw" className="object-cover object-center" />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/80 via-emerald-900/60 to-teal-900/50" aria-hidden />
        <div className="relative min-h-screen flex items-center justify-center">Validando acceso regional...</div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh relative text-white bg-emerald-950">
      <Image src="/region.png" alt="" fill priority sizes="100vw" className="object-cover object-center" />
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/80 via-emerald-900/60 to-teal-900/50" aria-hidden />

      <div className="relative max-w-7xl mx-auto p-6 lg:p-10 space-y-6">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm uppercase tracking-[0.22em] text-emerald-200/80">Nivel regional</p>
            <h1 className="text-3xl font-bold">Casos Colegiados · Región</h1>
            <p className="text-sm text-emerald-50/70">Pacientes colegiados de tu región con plan de acciones</p>
          </div>
          <Link
            href="/region"
            className="rounded-full border border-white/20 px-3 py-1.5 text-sm text-white hover:bg-white/10 transition"
          >
            Volver a región
          </Link>
        </header>

        {/* Métricas */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-emerald-200/15 bg-emerald-950/35 p-4 backdrop-blur-sm">
            <p className="text-xs text-emerald-100/60 uppercase">Total colegiados</p>
            <p className="mt-1 text-2xl font-bold text-white">{totalColegiados}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200/15 bg-emerald-950/35 p-4 backdrop-blur-sm">
            <p className="text-xs text-emerald-100/60 uppercase">Con plan completo</p>
            <p className="mt-1 text-2xl font-bold text-emerald-300">{conPlanCompleto}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200/15 bg-emerald-950/35 p-4 backdrop-blur-sm">
            <p className="text-xs text-emerald-100/60 uppercase">Acciones pendientes</p>
            <p className="mt-1 text-2xl font-bold text-amber-300">{accionesPendientes}</p>
          </div>
        </section>

        {/* Filtros */}
        <section className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-emerald-100/60 uppercase mb-1 block">Buscar</label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre, folio o CLUES..."
              className="w-full rounded-xl border border-emerald-300/20 bg-emerald-950/60 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 transition"
            />
          </div>
          <div className="min-w-[160px]">
            <label className="text-xs text-emerald-100/60 uppercase mb-1 block">Municipio</label>
            <select
              value={municipioFilter}
              onChange={(e) => setMunicipioFilter(e.target.value)}
              className="w-full rounded-xl border border-emerald-300/20 bg-emerald-950/60 px-3 py-2 text-sm text-white outline-none focus:border-emerald-400 transition"
            >
              <option value="">Todos</option>
              {municipios.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          {(busqueda || municipioFilter) && (
            <button
              type="button"
              onClick={() => { setBusqueda(""); setMunicipioFilter(""); }}
              className="rounded-full border border-white/20 px-3 py-2 text-xs text-white hover:bg-white/10 transition"
            >
              Limpiar filtros
            </button>
          )}
        </section>

        {/* Contenido */}
        {loading ? (
          <section className="rounded-2xl border border-emerald-200/15 bg-emerald-950/35 p-6 backdrop-blur-sm">
            Cargando casos colegiados...
          </section>
        ) : error ? (
          <section className="rounded-2xl border border-red-500/40 bg-red-900/20 p-6 text-red-200">{error}</section>
        ) : filtered.length === 0 ? (
          <section className="rounded-2xl border border-emerald-200/15 bg-emerald-950/35 p-6 backdrop-blur-sm text-emerald-100/70">
            {casos.length === 0
              ? "No hay pacientes colegiados en tu región."
              : "Ningún caso coincide con los filtros aplicados."}
          </section>
        ) : (
          <section className="rounded-2xl border border-emerald-200/15 bg-emerald-950/35 backdrop-blur-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-emerald-300/25 text-left text-emerald-100/80 text-xs uppercase">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Folio</th>
                    <th className="px-4 py-3">Paciente</th>
                    <th className="px-4 py-3">Unidad</th>
                    <th className="px-4 py-3">Municipio</th>
                    <th className="px-4 py-3">Puntaje</th>
                    <th className="px-4 py-3">Fecha colegiado</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Acciones</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-300/10">
                  {filtered.map((c, idx) => {
                    const puntaje = Number(c.puntaje_total_consulta) || 0;
                    const accionesFraccion = `${c.acciones_cumplidas}/${c.acciones_total}`;
                    const progresoPct = c.acciones_total > 0 ? Math.round((c.acciones_cumplidas / c.acciones_total) * 100) : 0;
                    return (
                      <tr
                        key={c.consulta_id}
                        className="hover:bg-emerald-900/30 cursor-pointer transition"
                        onClick={() => router.push(`/region/colegiados/${c.consulta_id}`)}
                      >
                        <td className="px-4 py-3 text-emerald-100/50">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs">{c.folio || "—"}</td>
                        <td className="px-4 py-3 font-medium">{c.nombre_completo || "—"}</td>
                        <td className="px-4 py-3 text-emerald-100/80 text-xs">{c.unidad || "—"}</td>
                        <td className="px-4 py-3 text-emerald-100/80 text-xs">{c.municipio || "—"}</td>
                        <td className="px-4 py-3">
                          <span className="font-semibold mr-1">{puntaje}</span>
                          {riesgoBadge(puntaje)}
                        </td>
                        <td className="px-4 py-3 text-xs">{formatDate(c.fecha_colegiado)}</td>
                        <td className="px-4 py-3">
                          {c.plan_estatus === "completo" ? (
                            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-500/40">
                              Completo
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-amber-500/20 text-amber-200 border border-amber-500/40">
                              Borrador
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-emerald-100/70">{accionesFraccion}</span>
                            {c.acciones_total > 0 && (
                              <div className="w-16 h-1.5 rounded-full bg-emerald-950/60 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-emerald-400 transition-all"
                                  style={{ width: `${progresoPct}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/region/colegiados/${c.consulta_id}`}
                            className="rounded-full border border-emerald-400/40 px-3 py-1 text-xs text-emerald-200 hover:border-emerald-300 transition"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Ver plan
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
