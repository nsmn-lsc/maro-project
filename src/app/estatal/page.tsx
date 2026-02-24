"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  puntaje_consulta_parametros: number;
  riesgo_25_plus: number;
  consulta_creada: string;
};

export default function ModuloEstatalRiesgoPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [registros, setRegistros] = useState<RegistroRiesgo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState("Usuario Estatal");

  useEffect(() => {
    const stored = localStorage.getItem("maro:user");
    if (!stored) {
      router.replace("/inicial");
      return;
    }

    try {
      const session = JSON.parse(stored) as SessionInfo;
      if ((session.nivel ?? 0) < 3) {
        router.replace("/dashboard");
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

    const loadRegistros = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/estatal/riesgo?limit=500");
        if (!res.ok) throw new Error("No se pudo cargar el módulo estatal");
        const data = (await res.json()) as RegistroRiesgo[];
        if (!cancelled) {
          setRegistros(data);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Error desconocido");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadRegistros();
    return () => {
      cancelled = true;
    };
  }, [authChecked]);

  const totalRegistros = registros.length;
  const promedioPuntaje = useMemo(() => {
    if (registros.length === 0) return 0;
    const sum = registros.reduce((acc, r) => acc + (Number(r.puntaje_total_consulta) || 0), 0);
    return Math.round((sum / registros.length) * 10) / 10;
  }, [registros]);

  const formatDate = (value: string | null) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        Validando acceso estatal...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-6 lg:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-300/80">Nivel estatal</p>
          <h1 className="text-3xl font-bold">Pacientes con puntaje total ≥ 25</h1>
          <p className="text-slate-300/80">Vista consolidada de todas las unidades · Sesión: {sessionName}</p>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Card title="Registros activos" value={String(totalRegistros)} />
          <Card title="Puntaje promedio" value={`${promedioPuntaje} pts`} />
          <Card title="Cobertura" value="Todas las unidades" />
        </section>

        <section className="bg-slate-900/60 border border-slate-700 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Concentrado estatal de riesgo alto</h2>
            <Link href="/dashboard" className="text-sm px-3 py-1.5 rounded-full border border-slate-600 hover:border-slate-400">
              Ir a dashboard
            </Link>
          </div>

          {loading ? (
            <p className="text-slate-300">Cargando registros...</p>
          ) : error ? (
            <p className="text-red-300">{error}</p>
          ) : registros.length === 0 ? (
            <p className="text-slate-300">No hay pacientes con puntaje total ≥ 25.</p>
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
                    <th className="py-2 pr-4">Puntaje total</th>
                    <th className="py-2 pr-0 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {registros.map((row) => (
                    <tr key={`${row.consulta_id}-${row.paciente_id}`} className="hover:bg-slate-800/40">
                      <td className="py-2 pr-4">{row.folio || "—"}</td>
                      <td className="py-2 pr-4">{row.nombre_completo || "Sin nombre"}</td>
                      <td className="py-2 pr-4">{row.region || "—"}</td>
                      <td className="py-2 pr-4">
                        <div>{row.unidad || "—"}</div>
                        <div className="text-xs text-slate-400">{row.clues_id || ""}</div>
                      </td>
                      <td className="py-2 pr-4">{formatDate(row.fecha_consulta)}</td>
                      <td className="py-2 pr-4">
                        <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold bg-red-500/20 text-red-200 border border-red-500/40">
                          {row.puntaje_total_consulta} pts
                        </span>
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
