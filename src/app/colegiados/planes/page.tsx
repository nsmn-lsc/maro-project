"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SessionInfo = {
  nivel?: number;
};

type RegistroColegiado = {
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
  riesgo_25_plus: number;
  fecha_colegiado: string | null;
  plan_id?: number | null;
  plan_estatus?: "borrador" | "completo";
  acciones_total?: number;
  acciones_cumplidas?: number;
  plan_actualizado_en?: string | null;
};

function formatDate(value: string | null, includeTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();

  if (!includeTime) return `${dd}-${mm}-${yyyy}`;

  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
}

export default function ColegiadosPlanesPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registros, setRegistros] = useState<RegistroColegiado[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/estatal/colegiados", { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo cargar el módulo de colegiados");
      const data = (await res.json()) as RegistroColegiado[];
      setRegistros(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Error desconocido");
    } finally {
      setLoading(false);
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
      setAuthChecked(true);
    } catch {
      router.replace("/inicial");
    }
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;
    loadData();
  }, [authChecked, loadData]);

  const registrosConAcciones = useMemo(
    () => registros.filter((row) => (Number(row.acciones_total) || 0) > 0),
    [registros]
  );

  const bgStyle = {
    backgroundImage: "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(15,118,110,0.6)), url(/maro_back_estatal.png)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat" as const,
  };

  if (!authChecked) {
    return (
      <main className="min-h-screen relative text-slate-100" style={bgStyle}>
        <div className="absolute inset-0 bg-black/45" aria-hidden />
        <div className="relative min-h-screen flex items-center justify-center">Validando acceso estatal...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative text-slate-100" style={bgStyle}>
      <div className="absolute inset-0 bg-black/45" aria-hidden />

      <div className="relative max-w-7xl mx-auto space-y-6 p-6 lg:p-10">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-300/80">Nivel estatal</p>
            <h1 className="text-3xl font-bold">Casos con Acciones Establecidas</h1>
            <p className="text-slate-300/80">Seguimiento de planes colegiados ya definidos</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/colegiados" className="text-sm px-3 py-1.5 rounded-full border border-slate-600 hover:border-slate-400">
              Pendientes
            </Link>
            <Link href="/estatal" className="text-sm px-3 py-1.5 rounded-full border border-slate-600 hover:border-slate-400">
              Volver a estatal
            </Link>
          </div>
        </header>

        <section className="bg-slate-900/60 border border-slate-700 rounded-2xl p-4">
          {loading ? (
            <p className="text-slate-300">Cargando casos con acciones...</p>
          ) : error ? (
            <p className="text-red-300">{error}</p>
          ) : registrosConAcciones.length === 0 ? (
            <p className="text-slate-300">Aún no hay casos con acciones definidas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-left text-slate-300">
                    <th className="py-2 pr-4">Folio</th>
                    <th className="py-2 pr-4">Paciente</th>
                    <th className="py-2 pr-4">Región</th>
                    <th className="py-2 pr-4">Unidad</th>
                    <th className="py-2 pr-4">Plan</th>
                    <th className="py-2 pr-4">Avance</th>
                    <th className="py-2 pr-4">Actualización</th>
                    <th className="py-2 pr-0 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {registrosConAcciones.map((row) => (
                    <tr key={row.consulta_id} className="hover:bg-slate-800/40">
                      <td className="py-2 pr-4">{row.folio || "—"}</td>
                      <td className="py-2 pr-4">{row.nombre_completo || "Sin nombre"}</td>
                      <td className="py-2 pr-4">{row.region || "—"}</td>
                      <td className="py-2 pr-4">
                        <div>{row.unidad || "—"}</div>
                        <div className="text-xs text-slate-400">{row.clues_id || ""}</div>
                      </td>
                      <td className="py-2 pr-4">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold border ${row.plan_estatus === "completo" ? "bg-emerald-500/15 text-emerald-200 border-emerald-500/30" : "bg-amber-500/15 text-amber-200 border-amber-500/30"}`}>
                          {row.plan_estatus === "completo" ? "Completo" : "Borrador"}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-slate-200">
                        {Number(row.acciones_cumplidas) || 0} / {Number(row.acciones_total) || 0}
                      </td>
                      <td className="py-2 pr-4">{formatDate(row.plan_actualizado_en || null, true)}</td>
                      <td className="py-2 pr-0 text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/colegiados/${row.consulta_id}`} className="text-xs px-2 py-1 rounded-full border border-cyan-500/40 text-cyan-200 hover:border-cyan-300">
                            Ver plan
                          </Link>
                          <Link href={`/colegiados/${row.consulta_id}/formato`} className="text-xs px-2 py-1 rounded-full border border-emerald-500/40 text-emerald-200 hover:border-emerald-300">
                            Formato PDF
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
      </div>
    </main>
  );
}