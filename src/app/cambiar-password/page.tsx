"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type MaroUser = {
  userId?: number;
  displayName?: string;
  nivel?: number;
  rol?: string;
  mustChangePassword?: boolean;
};

const MIN_LENGTH = 10;

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const checks = [
    { label: "10 caracteres mínimo", ok: password.length >= MIN_LENGTH },
    { label: "Mayúscula", ok: /[A-Z]/.test(password) },
    { label: "Minúscula", ok: /[a-z]/.test(password) },
    { label: "Número", ok: /[0-9]/.test(password) },
    { label: "Símbolo (!@#$...)", ok: /[^A-Za-z0-9]/.test(password) },
  ];

  const score = checks.filter((c) => c.ok).length;
  const label = score <= 2 ? "Débil" : score <= 3 ? "Regular" : score === 4 ? "Buena" : "Fuerte";
  const color =
    score <= 2
      ? "bg-red-500"
      : score <= 3
      ? "bg-amber-400"
      : score === 4
      ? "bg-emerald-400"
      : "bg-emerald-500";

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${
              i <= score ? color : "bg-slate-700"
            }`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {checks.map((c) => (
          <span
            key={c.label}
            className={`text-xs flex items-center gap-1 ${
              c.ok ? "text-emerald-400" : "text-slate-500"
            }`}
          >
            <span>{c.ok ? "✓" : "○"}</span>
            {c.label}
          </span>
        ))}
      </div>
      <p className="text-xs text-slate-400">
        Seguridad: <span className={score >= 4 ? "text-emerald-400" : "text-amber-400"}>{label}</span>
      </p>
    </div>
  );
}

export default function CambiarPassword() {
  const router = useRouter();

  const [user, setUser] = useState<MaroUser | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("maro:user");
    if (!raw) {
      router.replace("/inicial");
      return;
    }
    try {
      const parsed: MaroUser = JSON.parse(raw);
      if (!parsed.userId) {
        router.replace("/inicial");
        return;
      }
      setUser(parsed);
    } catch {
      router.replace("/inicial");
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!newPassword || newPassword.length < MIN_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_LENGTH} caracteres`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (currentPassword === newPassword) {
      setError("La nueva contraseña debe ser diferente a la actual");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.userId,
          currentPassword,
          newPassword,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Error al actualizar contraseña");
      }

      // Actualizar sesión en localStorage — quitar mustChangePassword
      if (user) {
        const updated = { ...user, mustChangePassword: false };
        localStorage.setItem("maro:user", JSON.stringify(updated));
      }

      setSuccess(true);

      setTimeout(() => {
        const rol = user?.rol || "";
        if (rol === "estatal") router.replace("/estatal");
        else if (rol === "regional") router.replace("/region");
        else router.replace("/dashboard");
      }, 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!user) return null;

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Columna izquierda — decorativa */}
      <section className="relative hidden lg:block bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900">
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-sm space-y-6 text-center">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/30">
              <svg
                className="w-10 h-10 text-emerald-400"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Seguridad de cuenta</h2>
              <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                Tu contraseña temporal debe ser cambiada antes de continuar. Elige una contraseña segura que solo tú conozcas.
              </p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-left space-y-2 border border-slate-700/50">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Recomendaciones</p>
              {[
                "Mínimo 10 caracteres",
                "Combina mayúsculas y minúsculas",
                "Incluye números y símbolos",
                "No uses datos personales",
              ].map((tip) => (
                <p key={tip} className="text-xs text-slate-300 flex gap-2">
                  <span className="text-emerald-400">›</span> {tip}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Columna derecha — formulario */}
      <section className="flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 lg:p-10">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <header className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-500/15 rounded-2xl mb-3 lg:hidden border border-emerald-500/20">
              <svg
                className="w-7 h-7 text-emerald-400"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white">Cambiar contraseña</h1>
            <p className="text-slate-400 text-sm">
              Bienvenido,{" "}
              <span className="text-emerald-400 font-medium">
                {user.displayName || "usuario"}
              </span>
              . Establece tu contraseña permanente.
            </p>
          </header>

          {success ? (
            <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-2xl p-8 text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-7 h-7 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-emerald-300 font-semibold text-lg">¡Contraseña actualizada!</p>
              <p className="text-slate-400 text-sm">Redirigiendo al sistema...</p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-slate-800/60 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-slate-700/60 space-y-5"
              noValidate
            >
              {/* Contraseña actual */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Contraseña temporal (actual)
                </label>
                <div className="relative">
                  <input
                    className="w-full p-3.5 pr-12 bg-slate-900/80 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                    tabIndex={-1}
                    aria-label={showCurrent ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showCurrent ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Nueva contraseña */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    className="w-full p-3.5 pr-12 bg-slate-900/80 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                    tabIndex={-1}
                    aria-label={showNew ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showNew ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    )}
                  </button>
                </div>
                <PasswordStrength password={newPassword} />
              </div>

              {/* Confirmar contraseña */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Confirmar nueva contraseña
                </label>
                <div className="relative">
                  <input
                    className="w-full p-3.5 pr-12 bg-slate-900/80 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition"
                    tabIndex={-1}
                    aria-label={showConfirm ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showConfirm ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                    )}
                  </button>
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-400">Las contraseñas no coinciden</p>
                )}
                {confirmPassword && newPassword === confirmPassword && newPassword.length >= MIN_LENGTH && (
                  <p className="text-xs text-emerald-400">✓ Las contraseñas coinciden</p>
                )}
              </div>

              {error && (
                <div className="text-sm text-amber-100 bg-amber-500/15 border border-amber-500/30 rounded-lg p-3">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 transition-all text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-emerald-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isSubmitting || newPassword !== confirmPassword || newPassword.length < MIN_LENGTH}
              >
                {isSubmitting ? "Guardando..." : "Establecer contraseña"}
              </button>
            </form>
          )}

          <div className="text-center text-xs text-slate-500 space-y-1">
            <p>Sistema MARO</p>
            <p>© 2026 Todos los derechos reservados</p>
          </div>
        </div>
      </section>
    </main>
  );
}
