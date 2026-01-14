"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Rol =
  | "OPERATIVO"
  | "REGIONAL"
  | "COORDINACION"
  | "EXPERTO";

export default function AccesoInicial() {
  const router = useRouter();

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<Rol | "">("");
  const [region, setRegion] = useState("");
  const [unidad, setUnidad] = useState("");

  const [contextoConfirmado, setContextoConfirmado] = useState(false);

  function handleContinuar() {
    // Validación mínima (mock, sellada)
    if (!usuario || !password || !rol) {
      alert("Faltan datos obligatorios");
      return;
    }

    if (rol === "OPERATIVO" && (!region || !unidad)) {
      alert("Operativo requiere región y unidad");
      return;
    }

    if (rol === "REGIONAL" && !region) {
      alert("Regional requiere región");
      return;
    }

    // Aquí después se conectará auth real
    setContextoConfirmado(true);
  }

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Columna izquierda — imagen de fondo */}
      <section
        className="relative hidden lg:block bg-cover bg-center"
        style={{ backgroundImage: "url(/maro-hero.png)" }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-transparent" />
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
            Acceso institucional para módulos operativos, regionales, de coordinación y expertos clínicos.
          </p>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Sistema activo 24/7
            </p>
          </div>
        </div>
      </section>

      {/* Columna derecha — formulario */}
      <section className="flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-10">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <header className="text-center space-y-3">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600/20 rounded-2xl mb-4 lg:hidden">
              <span className="text-emerald-400 font-bold text-3xl">M</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Acceso Inicial</h1>
            <p className="text-slate-400 text-sm">Ingresa tus credenciales institucionales</p>
          </header>

          {/* Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-slate-700/50 space-y-5">
            {/* Usuario */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Usuario</label>
              <input
                className="w-full p-3.5 bg-slate-900/80 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Nombre o matrícula"
              />
            </div>

            {/* Contraseña */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Contraseña</label>
              <input
                className="w-full p-3.5 bg-slate-900/80 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {/* Rol */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Rol</label>
              <div className="relative">
                <select
                  className="w-full p-3.5 bg-slate-900/80 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition appearance-none pr-10"
                  value={rol}
                  onChange={(e) => {
                    setRol(e.target.value as Rol);
                    setRegion("");
                    setUnidad("");
                    setContextoConfirmado(false);
                  }}
                >
                  <option value="" className="bg-slate-900">Selecciona</option>
                  <option value="OPERATIVO" className="bg-slate-900">Operativo (1er contacto)</option>
                  <option value="REGIONAL" className="bg-slate-900">Regional</option>
                  <option value="COORDINACION" className="bg-slate-900">Coordinación estatal</option>
                  <option value="EXPERTO" className="bg-slate-900">Experto clínico</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Región */}
            {(rol === "OPERATIVO" || rol === "REGIONAL") && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Región</label>
                <input
                  className="w-full p-3.5 bg-slate-900/80 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="Ej. Huasteca"
                />
              </div>
            )}

            {/* Unidad */}
            {rol === "OPERATIVO" && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">Unidad</label>
                <input
                  className="w-full p-3.5 bg-slate-900/80 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  value={unidad}
                  onChange={(e) => setUnidad(e.target.value)}
                  placeholder="UMF / Hospital"
                />
              </div>
            )}

            {!contextoConfirmado && (
              <>
                <div className="mt-2 text-sm text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                  Esta pantalla define identidad y rol. La normatividad clínica y operativa se ejecuta en los módulos MARO.
                </div>
                <button
                  className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 transition-all text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-emerald-500/30"
                  onClick={handleContinuar}
                >
                  Continuar
                </button>
              </>
            )}

            {contextoConfirmado && (
              <div className="grid grid-cols-1 gap-3 pt-1">
                {rol === "OPERATIVO" && (
                  <>
                    <button
                      className="w-full bg-slate-700 hover:bg-slate-600 transition text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                      onClick={() => router.push("/nuevo-caso")}
                    >
                      ➕ Cargar nuevo caso MARO
                    </button>
                    <button
                      className="w-full bg-slate-700 hover:bg-slate-600 transition text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                      onClick={() => router.push("/buzon-operativo")}
                    >
                      📋 Consultar mis casos
                    </button>
                  </>
                )}

                {rol === "REGIONAL" && (
                  <>
                    <button
                      className="w-full bg-slate-700 hover:bg-slate-600 transition text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                      onClick={() => router.push("/region")}
                    >
                      ⏳ Casos pendientes de mi región
                    </button>
                    <button
                      className="w-full bg-slate-700 hover:bg-slate-600 transition text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                      onClick={() => router.push("/region?view=historico")}
                    >
                      📚 Histórico regional
                    </button>
                  </>
                )}

                {rol === "COORDINACION" && (
                  <>
                    <button
                      className="w-full bg-slate-700 hover:bg-slate-600 transition text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                      onClick={() => router.push("/coordinacion")}
                    >
                      🧠 Normar conducta / colegiación
                    </button>
                    <button
                      className="w-full bg-slate-700 hover:bg-slate-600 transition text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                      onClick={() => router.push("/dashboard-estatal")}
                    >
                      📊 Dashboard estatal
                    </button>
                  </>
                )}

                {rol === "EXPERTO" && (
                  <>
                    <button
                      className="w-full bg-slate-700 hover:bg-slate-600 transition text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                      onClick={() => router.push("/expertos")}
                    >
                      🩺 Mis casos para sesión clínica
                    </button>
                    <button
                      className="w-full bg-slate-700 hover:bg-slate-600 transition text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
                      onClick={() => router.push("/expertos?view=historico")}
                    >
                      📜 Histórico de colegiaciones
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="text-center text-xs text-slate-500 space-y-1">
            <p>Sistema MARO</p>
            <p>© 2026 Todos los derechos reservados</p>
          </div>
        </div>
      </section>
    </main>
  );
}
