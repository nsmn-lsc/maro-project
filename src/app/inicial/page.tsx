"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function MaroVectorLogo({ size = 80, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`drop-shadow-[0_0_24px_rgba(16,185,129,0.45)] ${className}`}
    >
      <defs>
        <linearGradient id="maroEmeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6EE7B7" />
          <stop offset="45%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="maroTealGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#059669" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="maroShieldBg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#047857" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id="maroMotherGrad" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#A7F3D0" />
          <stop offset="50%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Halo de resplandor sutil */}
      <circle cx="60" cy="58" r="44" fill="url(#maroShieldBg)" />

      {/* Escudo de Protección Obstétrica */}
      <path
        d="M60 106 C33 93 20 70 20 38 L60 20 L100 38 C100 70 87 93 60 106 Z"
        fill="url(#maroShieldBg)"
        stroke="url(#maroEmeraldGrad)"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Órbitas concéntricas de monitoreo / red */}
      <circle
        cx="60"
        cy="58"
        r="44"
        stroke="url(#maroTealGrad)"
        strokeWidth="1.5"
        strokeDasharray="5 3.5"
        opacity="0.65"
      />
      <circle
        cx="60"
        cy="58"
        r="36"
        stroke="url(#maroEmeraldGrad)"
        strokeWidth="1"
        opacity="0.4"
      />

      {/* Nodos orbitales de vigilancia clínica */}
      <circle cx="60" cy="14" r="3.5" fill="#6EE7B7" filter="url(#softGlow)" />
      <circle cx="104" cy="58" r="3.5" fill="#38BDF8" filter="url(#softGlow)" />
      <circle cx="60" cy="102" r="3.5" fill="#10B981" filter="url(#softGlow)" />
      <circle cx="16" cy="58" r="3.5" fill="#6EE7B7" filter="url(#softGlow)" />
      <circle cx="28" cy="28" r="2.5" fill="#34D399" opacity="0.8" />
      <circle cx="92" cy="88" r="2.5" fill="#38BDF8" opacity="0.8" />

      {/* Silueta Materna Central en Perfil con Vientre Gestante */}
      {/* Cabeza y cuello */}
      <circle cx="60" cy="38" r="6.5" fill="#A7F3D0" />
      
      {/* Cabello estilizado envolvente */}
      <path
        d="M54 33 C54 27 66 27 67 34 C68 41 57 44 56 50"
        stroke="#6EE7B7"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Espalda y Vientre Gestante Curvilíneo */}
      <path
        d="M57 44 C52 49 50 56 51 64 C53 73 57 79 63 82 C69 85 74 81 75 74 C76 66 71 58 65 56 C61 54 60 49 57 44 Z"
        fill="url(#maroMotherGrad)"
      />

      {/* Brazo protector materno acariciando el vientre */}
      <path
        d="M55 52 C49 57 49 67 54 73 C58 77 64 78 68 76"
        stroke="#E0F2FE"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
        opacity="0.9"
      />

      {/* Punto de vida fetal radiante */}
      <circle cx="64" cy="69" r="3" fill="#FFFFFF" filter="url(#softGlow)" />
    </svg>
  );
}

export default function AccesoInicial() {
  const router = useRouter();

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleContinuar() {
    if (!usuario || !password) {
      setError("Por favor completa los campos de usuario y contraseña");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const usuarioNormalizado = usuario.trim();

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: usuarioNormalizado, password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Credenciales inválidas o no autorizadas");
      }

      const session = await res.json();
      localStorage.setItem("maro:user", JSON.stringify(session));

      if (session.mustChangePassword) {
        router.push("/cambiar-password");
        return;
      }

      const rol: string = session.rol || "";
      if (rol === "estatal") {
        router.push("/estatal");
      } else if (rol === "regional") {
        router.push("/region");
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al validar acceso");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-slate-950">
      {/* Columna izquierda — Hero & Contexto Clínico (7/12 en lg) */}
      <section
        className="relative hidden lg:flex lg:col-span-7 flex-col justify-between p-10 xl:p-14 bg-cover bg-center overflow-hidden"
        style={{ backgroundImage: "url(/maro-hero.png)" }}
      >
        {/* Layer de gradientes oscuros para contraste perfecto */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-950/30" />
        <div className="absolute inset-0 bg-radial-at-t from-emerald-900/20 via-transparent to-transparent" />

        {/* Top Header Badge */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-slate-900/80 border border-emerald-500/30 text-emerald-300 text-xs font-semibold backdrop-blur-md shadow-lg shadow-black/40">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Sistema de Vigilancia</span>
          </div>
        </div>

        {/* Card Glassmorphic Inferior de Valor Clínico */}
        <div className="relative z-10 bg-slate-900/85 backdrop-blur-xl p-7 xl:p-8 rounded-3xl border border-white/15 shadow-2xl shadow-black/80 space-y-6 max-w-xl">
          {/* Logo & Identidad Institucional */}
          <div className="flex items-center gap-5 border-b border-white/10 pb-5">
            <div className="relative shrink-0 p-2 rounded-2xl bg-emerald-500/10 border border-emerald-400/25">
              <MaroVectorLogo size={80} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-3xl font-black tracking-tight text-white">MARO</h2>
                <span className="text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Salud Materna
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 font-medium mt-1">
                Modelo de Atención y Reducción del Riesgo Obstétrico
              </p>
            </div>
          </div>

          {/* Micro-indicadores de valor */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white/5 border border-white/5 rounded-2xl p-3.5 space-y-1">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 text-xs">
                <i className="fa-solid fa-heart-pulse"></i>
              </div>
              <span className="text-[11px] font-bold text-white block">Triage Materno</span>
              <p className="text-[10px] text-slate-400 leading-tight">Identificación oportuna y semaforización de riesgo.</p>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-2xl p-3.5 space-y-1">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 text-xs">
                <i className="fa-solid fa-user-doctor"></i>
              </div>
              <span className="text-[11px] font-bold text-white block">Atención Especializada</span>
              <p className="text-[10px] text-slate-400 leading-tight">Coordinación médica para casos prioritarios.</p>
            </div>

            <div className="bg-white/5 border border-white/5 rounded-2xl p-3.5 space-y-1">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300 text-xs">
                <i className="fa-solid fa-notes-medical"></i>
              </div>
              <span className="text-[11px] font-bold text-white block">Seguimiento Continuo</span>
              <p className="text-[10px] text-slate-400 leading-tight">Acompañamiento y control durante el embarazo.</p>
            </div>
          </div>

          {/* Status Bar */}
          <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="font-semibold text-slate-300">Servidor Activo</span>
            </div>
            <span className="text-[11px] text-slate-500">Módulos: Unidad · Región · Estatal</span>
          </div>
        </div>
      </section>

      {/* Columna derecha — Formulario de Acceso (5/12 en lg) */}
      <section className="relative lg:col-span-5 flex items-center justify-center p-6 sm:p-10 lg:p-12 overflow-hidden bg-slate-950">
        {/* Glow ambient background effects */}
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md space-y-6 relative z-10">
          
          {/* Header con Isotipo Vectorial SVG Imponente */}
          <header className="text-center space-y-3">
            <div className="flex justify-center mb-1">
              <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border-2 border-emerald-500/30 shadow-2xl shadow-emerald-950/70 inline-flex items-center justify-center hover:scale-105 transition-all duration-300">
                <MaroVectorLogo size={118} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">MARO</h1>
                <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Salud Materna
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-200">Acceso Institucional</h2>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
                Ingrese sus credenciales autorizadas para continuar
              </p>
            </div>
          </header>

          {/* Card Formulario */}
          <div className="bg-slate-900/80 backdrop-blur-xl p-7 sm:p-8 rounded-3xl shadow-2xl border border-white/10 space-y-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleContinuar();
              }}
              className="space-y-5"
            >
              {/* Campo Usuario */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Usuario Institucional
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <i className="fa-solid fa-id-badge text-sm"></i>
                  </div>
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-white/10 rounded-xl text-white text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400 transition-all"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    placeholder="Clave de usuario"
                    autoComplete="username"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Campo Contraseña */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <i className="fa-solid fa-lock text-sm"></i>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full pl-10 pr-11 py-3 bg-slate-950/80 border border-white/10 rounded-xl text-white text-xs sm:text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400 transition-all"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-emerald-300 transition-colors cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"} text-sm`}></i>
                  </button>
                </div>
              </div>

              {/* Banner de Error */}
              {error && (
                <div className="flex items-start gap-2.5 p-3 bg-rose-500/15 border border-rose-400/30 rounded-xl text-rose-200 text-xs font-semibold animate-in fade-in duration-150">
                  <i className="fa-solid fa-circle-exclamation text-rose-400 text-sm mt-0.5 shrink-0"></i>
                  <span className="leading-snug">{error}</span>
                </div>
              )}

              {/* Botón de Acceso */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 sm:h-12 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-950/60 hover:shadow-emerald-600/30 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin text-sm"></i>
                    <span>Verificando credenciales...</span>
                  </>
                ) : (
                  <>
                    <span>Ingresar al Sistema</span>
                    <i className="fa-solid fa-arrow-right text-xs"></i>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Footer Institucional */}
          <footer className="text-center text-[11px] text-slate-500 space-y-1">
            <p className="flex items-center justify-center gap-1.5">
              <i className="fa-solid fa-shield-halved text-emerald-500/70"></i>
              <span>Acceso institucional seguro</span>
            </p>
            <p>© 2026 Sistema MARO · Todos los derechos reservados</p>
          </footer>

        </div>
      </section>
    </main>
  );
}
