import Link from "next/link";

export default function EditarPaciente({ params }: { params: { id: string } }) {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-6 py-10 space-y-4">
        <p className="text-sm uppercase tracking-[0.25em] text-emerald-200/80">Editar paciente</p>
        <h1 className="text-3xl font-bold">Editar datos del paciente</h1>
        <p className="text-slate-200/80">Pantalla de edición pendiente. Aquí se podrán actualizar datos y consultas.</p>
        <Link
          href="/dashboard"
          className="inline-flex items-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-400"
        >
          Volver al dashboard
        </Link>
      </div>
    </main>
  );
}
