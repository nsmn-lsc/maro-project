"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type UnitRecord = {
  CLUES: string;
  UNIDAD: string;
  REGION: string;
  MUNICIPIO: string;
  NIVEL: number;
};

export default function AccesoInicial() {
  const router = useRouter();

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleContinuar() {
    if (!usuario || !password) {
      setError("Completa usuario y contraseña");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const usuarioNormalizado = usuario.trim();
      const usuarioLower = usuarioNormalizado.toLowerCase();
      const esIntentoEstatal = usuarioLower.includes("estatal");
      const esIntentoRegional = usuarioLower.includes("regional");

      // ── Nivel 3: Estatal ─────────────────────────────────────────
      const authEstatalRes = await fetch("/api/auth/estatal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: usuarioNormalizado, password }),
      });

      if (authEstatalRes.ok) {
        const estatalSession = await authEstatalRes.json();
        localStorage.setItem("maro:user", JSON.stringify(estatalSession));
        router.push("/estatal");
        return;
      }

      if (esIntentoEstatal) {
        const authError = await authEstatalRes.json().catch(() => null);
        throw new Error(authError?.message || "Credenciales estatales inválidas");
      }

      // ── Nivel 2: Regional ─────────────────────────────────────────
      const authRegionalRes = await fetch("/api/auth/regional", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: usuarioNormalizado, password }),
      });

      if (authRegionalRes.ok) {
        const regionalSession = await authRegionalRes.json();
        localStorage.setItem("maro:user", JSON.stringify(regionalSession));
        router.push("/region");
        return;
      }

      if (esIntentoRegional) {
        const authError = await authRegionalRes.json().catch(() => null);
        throw new Error(authError?.message || "Credenciales regionales inválidas");
      }

      // ── Nivel 1: Unidad (CLUES en catálogo) ──────────────────────
      const res = await fetch(`/api/unidades/${encodeURIComponent(usuarioNormalizado)}`);
      if (!res.ok) {
        if (res.status >= 500) {
          throw new Error("Error del servidor al validar CLUES");
        }
        throw new Error("No se encontró la CLUES en catálogo");
      }
      const data: UnitRecord = await res.json();

      const session = {
        clues: data.CLUES,
        unidad: data.UNIDAD,
        region: data.REGION,
        municipio: data.MUNICIPIO,
        nivel: data.NIVEL,
        displayName: data.UNIDAD,
      };

      localStorage.setItem("maro:user", JSON.stringify(session));
      // CLUES con NIVEL>=2 en catálogo también van a /region como fallback
      const destino = data.NIVEL >= 2 ? "/region" : "/dashboard";
      router.push(destino);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al validar acceso");
    } finally {
      setIsSubmitting(false);
    }
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
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/15 rounded-2xl mb-4 lg:hidden">
              <span className="text-emerald-400 font-bold text-3xl">M</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Acceso institucional</h1>
            <p className="text-slate-400 text-sm">Autentica tu cuenta para continuar</p>
          </header>

          {/* Card */}
          <div className="bg-slate-800/60 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-slate-700/60 space-y-6">
            {/* Usuario */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">Usuario</label>
              <input
                className="w-full p-3.5 bg-slate-900/80 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                placeholder="Clave de usuario"
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
            {error && (
              <div className="text-sm text-amber-100 bg-amber-500/15 border border-amber-500/30 rounded-lg p-3">
                {error}
              </div>
            )}

            <button
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 transition-all text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-emerald-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleContinuar}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Accediendo..." : "Acceder"}
            </button>
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
