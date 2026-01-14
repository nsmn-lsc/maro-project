"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { UNIDADES } from "@/lib/data/unidades";
import { sesionesAPI, manejarErrorAPI } from "@/lib/api-client";

type Unidad = {
  region: string;
  municipio: string;
  unidad: string;
  clues?: string;
};

function uniqSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "es", { sensitivity: "base" })
  );
}

export default function SolicitudPage() {
  const router = useRouter();

  // ⏱️ Timer
  const [seconds, setSeconds] = useState(0);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
    const t = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, []);

  // 📍 Selecciones
  const [region, setRegion] = useState("");
  const [municipio, setMunicipio] = useState("");
  const [unidad, setUnidad] = useState("");
  const [clues, setClues] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Guardar datos de sesión
  const guardarSesion = async () => {
    if (!region || !municipio || !unidad) return;

    setGuardando(true);
    try {
      const data = await sesionesAPI.crear({ region, municipio, unidad, clues });
      
      // Guardar ID de sesión en localStorage para usar en siguiente página
      localStorage.setItem('sesionActual', JSON.stringify({
        sesionId: data.sesionId,
        region,
        municipio,
        unidad,
        clues,
      }));
      
      router.push("/evaluacion-clinica");
    } catch (error) {
      const mensaje = manejarErrorAPI(error);
      alert('Error al guardar los datos: ' + mensaje + '\n\nVerifica que MySQL esté configurado correctamente.');
      console.error('Error completo:', error);
    } finally {
      setGuardando(false);
    }
  };

  // 🔹 Normalizamos data (defensivo)
  const unidades: Unidad[] = useMemo(
    () =>
      (UNIDADES as Unidad[]).map((u) => ({
        region: String(u.region ?? ""),
        municipio: String(u.municipio ?? ""),
        unidad: String(u.unidad ?? ""),
        clues: u.clues ? String(u.clues) : undefined,
      })),
    []
  );

  const regiones = useMemo(
    () => uniqSorted(unidades.map((u) => u.region)),
    [unidades]
  );

  const municipios = useMemo(
    () =>
      uniqSorted(
        unidades.filter((u) => u.region === region).map((u) => u.municipio)
      ),
    [region, unidades]
  );

  const unidadesFiltradas = useMemo(
    () =>
      unidades.filter(
        (u) => u.region === region && u.municipio === municipio
      ),
    [region, municipio, unidades]
  );

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* COLUMNA IZQUIERDA — IMAGEN */}
      <section
        className="relative hidden lg:block bg-cover bg-center"
        style={{ backgroundImage: "url(/maro-hero.png)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-8 left-8 right-8 bg-white/95 backdrop-blur-sm p-6 rounded-2xl shadow-2xl max-w-md">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-2xl">M</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-emerald-700">MARO</h2>
              <p className="text-xs text-emerald-600 font-medium">Sistema de Salud Materno</p>
            </div>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            Modelo de Atención y Respuesta Obstétrica. Sistema de detección y
            colegiación oportuna de casos obstétricos de alto y muy alto riesgo.
          </p>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 flex items-center gap-2">
              <span className={`w-2 h-2 bg-emerald-500 rounded-full ${mounted ? 'animate-pulse' : ''}`}></span>
              Sistema activo 24/7
            </p>
          </div>
        </div>
      </section>

      {/* COLUMNA DERECHA — FORM */}
      <section className="flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-10">
        <div className="w-full max-w-md space-y-8">
          {/* Header mejorado */}
          <header className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600/20 rounded-2xl mb-4 lg:hidden">
              <span className="text-emerald-400 font-bold text-3xl">M</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Acceso al Sistema</h1>
            <p className="text-slate-400 text-sm">
              Ingrese su información institucional para continuar
            </p>
            {mounted && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                  </svg>
                  <span>Captura: {seconds}s</span>
                </div>
              </div>
            )}
          </header>

          {/* Form mejorado */}
          <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-slate-700/50 space-y-6">
            {/* Región */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Región <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <select
                  className="w-full p-3.5 bg-slate-900/80 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition appearance-none pr-10"
                  value={region}
                  onChange={(e) => {
                    setRegion(e.target.value);
                    setMunicipio("");
                    setUnidad("");
                  }}
                >
                  <option value="" className="bg-slate-900">Seleccione su región</option>
                  {regiones.map((r) => (
                    <option key={r} value={r} className="bg-slate-900">
                      {r}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Municipio */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Municipio <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <select
                  className="w-full p-3.5 bg-slate-900/80 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition appearance-none pr-10 disabled:opacity-40 disabled:cursor-not-allowed"
                  value={municipio}
                  onChange={(e) => {
                    setMunicipio(e.target.value);
                    setUnidad("");
                  }}
                  disabled={!region}
                >
                  <option value="" className="bg-slate-900">
                    {region ? "Seleccione su municipio" : "Primero seleccione una región"}
                  </option>
                  {municipios.map((m) => (
                    <option key={m} value={m} className="bg-slate-900">
                      {m}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Unidad */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Unidad de Salud <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <select
                  className="w-full p-3.5 bg-slate-900/80 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition appearance-none pr-10 disabled:opacity-40 disabled:cursor-not-allowed"
                  value={unidad}
                  onChange={(e) => {
                    setUnidad(e.target.value);
                    // Buscar CLUES de la unidad seleccionada
                    const unidadSeleccionada = unidadesFiltradas.find(u => u.unidad === e.target.value);
                    setClues(unidadSeleccionada?.clues || "");
                  }}
                  disabled={!municipio}
                >
                  <option value="" className="bg-slate-900">
                    {municipio ? "Seleccione su unidad" : "Primero seleccione un municipio"}
                  </option>
                  {unidadesFiltradas.map((u) => (
                    <option
                      key={`${u.unidad}-${u.clues ?? ""}`}
                      value={u.unidad}
                      className="bg-slate-900"
                    >
                      {u.unidad}
                      {u.clues ? ` — ${u.clues}` : ""}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Botón mejorado */}
            <button
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 transition-all text-white py-4 rounded-xl font-semibold shadow-lg shadow-emerald-500/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 group mt-8"
              disabled={!region || !municipio || !unidad || guardando}
              onClick={guardarSesion}
            >
              {guardando ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <span>Continuar a evaluación clínica</span>
                  <svg 
                    className="w-5 h-5 transition-transform group-hover:translate-x-1" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>

            {/* Info adicional */}
            <p className="text-xs text-slate-500 text-center pt-2">
              Al continuar, acepta el uso de este sistema bajo normativa de salud vigente
            </p>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-slate-500 space-y-1">
            <p>Sistema MARO</p>
            <p>© 2026 Todos los derechos reservados</p>
          </div>
        </div>
      </section>
    </main>
  );
}
