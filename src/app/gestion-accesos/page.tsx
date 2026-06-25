"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Usuario = {
  id: number;
  username: string;
  nombre: string | null;
  nivel: string;
  clues_id: string | null;
  region: string | null;
  activo: number;
  last_login_at: string | null;
};

export default function GestionAccesosPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [filteredUsuarios, setFilteredUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [resettingId, setResettingId] = useState<number | null>(null);
  const [newPasswordData, setNewPasswordData] = useState<{ username: string, password: string } | null>(null);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  useEffect(() => {
    if (search.trim() === "") {
      setFilteredUsuarios(usuarios);
    } else {
      const s = search.toLowerCase();
      setFilteredUsuarios(
        usuarios.filter(
          (u) =>
            u.username.toLowerCase().includes(s) ||
            (u.nombre && u.nombre.toLowerCase().includes(s)) ||
            (u.clues_id && u.clues_id.toLowerCase().includes(s)) ||
            (u.region && u.region.toLowerCase().includes(s))
        )
      );
    }
  }, [search, usuarios]);

  const fetchUsuarios = async () => {
    try {
      const res = await fetch("/api/gestion-accesos");
      if (res.status === 401 || res.status === 403) {
        router.push("/");
        return;
      }
      if (!res.ok) throw new Error("Error al cargar usuarios");
      const data = await res.json();
      setUsuarios(data);
      setFilteredUsuarios(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text)
        .then(() => alert("Contraseña copiada al portapapeles"))
        .catch(err => console.error("Error al copiar al portapapeles:", err));
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand("copy");
        alert("Contraseña copiada al portapapeles");
      } catch (error) {
        console.error("Error al copiar al portapapeles con execCommand:", error);
      }
      textArea.remove();
    }
  };

  const handleResetPassword = async (user: Usuario) => {
    if (!confirm(`¿Estás seguro de que deseas resetear la contraseña para ${user.username}? Esta acción es irreversible.`)) {
      return;
    }

    setResettingId(user.id);
    try {
      const res = await fetch("/api/gestion-accesos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) throw new Error("Error al resetear contraseña");
      const data = await res.json();
      
      setNewPasswordData({ username: user.username, password: data.newPassword });
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setResettingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-200">
        <p className="animate-pulse">Cargando gestión de accesos...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-900 selection:text-cyan-50">
      <div className="max-w-6xl mx-auto p-6 lg:p-10 space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">Panel de Administración</p>
            <h1 className="text-3xl font-bold text-white">Gestión de Accesos</h1>
            <p className="text-slate-400 mt-1">Reseteo seguro de contraseñas para unidades y regiones.</p>
          </div>
          <Link
            href="/estatal"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors text-sm"
          >
            Volver al Panel
          </Link>
        </header>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl">
            {error}
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por CLUES, Región, Usuario o Nombre..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all placeholder:text-slate-600"
            />
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-950/50 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Usuario</th>
                  <th className="px-4 py-3 font-medium">Nivel</th>
                  <th className="px-4 py-3 font-medium">Ubicación</th>
                  <th className="px-4 py-3 font-medium">Último Acceso</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredUsuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{u.username}</div>
                      <div className="text-xs text-slate-500">{u.nombre || "Sin nombre"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                        u.nivel === 'REGION' ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'
                      }`}>
                        {u.nivel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {u.clues_id || u.region || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : "Nunca"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleResetPassword(u)}
                        disabled={resettingId === u.id}
                        className="px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        {resettingId === u.id ? "Generando..." : "Resetear Contraseña"}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsuarios.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No se encontraron usuarios coincidentes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de nueva contraseña */}
      {newPasswordData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6 transform animate-in fade-in zoom-in duration-200">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">¡Contraseña Reseteada!</h3>
              <p className="text-slate-400 text-sm">
                Entrega esta credencial temporal al usuario. El sistema le pedirá cambiarla al iniciar sesión.
              </p>
            </div>
            
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">Usuario</p>
                <p className="font-mono text-cyan-400 font-medium">{newPasswordData.username}</p>
              </div>
              <div className="h-px bg-slate-800 w-full" />
              <div>
                <p className="text-xs text-slate-500 mb-1">Nueva Contraseña Temporal</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-xl tracking-wider text-white select-all">{newPasswordData.password}</p>
                  <button 
                    onClick={() => copyToClipboard(newPasswordData.password)}
                    className="text-slate-400 hover:text-white p-1"
                    title="Copiar contraseña"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick={() => setNewPasswordData(null)}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-cyan-900/20"
            >
              Entendido, cerrar
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
