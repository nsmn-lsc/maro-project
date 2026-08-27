"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`w-9 h-9 rounded-xl bg-white/5 border border-white/10 ${className}`} />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`group relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 cursor-pointer ${
        isDark
          ? "bg-slate-900/80 hover:bg-slate-800 border border-emerald-500/30 text-amber-300 shadow-lg shadow-black/40"
          : "bg-white/90 hover:bg-white border border-slate-300 text-indigo-600 shadow-md"
      } ${className}`}
      title={isDark ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
      aria-label="Cambiar tema"
    >
      <i
        className={`fa-solid ${
          isDark ? "fa-sun text-amber-300 group-hover:rotate-45" : "fa-moon text-indigo-600 group-hover:-rotate-12"
        } text-sm transition-transform duration-300`}
      />
    </button>
  );
}
