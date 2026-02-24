"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type RiesgoMARO = "ROJO" | "NARANJA" | "AMARILLO";

export default function ExpertosClinicosMARO() {
  const router = useRouter();
  /* =========================
     MOCK MARO (luego se liga)
  ========================= */
  const riesgo: RiesgoMARO = "ROJO";
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("maro:user");
    if (!stored) {
      router.replace("/inicial");
      return;
    }

    try {
      const session = JSON.parse(stored) as { nivel?: number };
      if ((session.nivel ?? 0) < 3) {
        router.replace("/dashboard");
        return;
      }
      setAuthChecked(true);
    } catch {
      router.replace("/inicial");
    }
  }, [router]);

  const riesgoStyle =
    riesgo === "ROJO"
      ? "bg-rose-200 border-rose-400"
      : riesgo === "NARANJA"
      ? "bg-amber-200 border-amber-400"
      : "bg-stone-200 border-stone-400";

  /* =========================
     ESTADOS
  ========================= */
  const [sesion, setSesion] = useState({
    discusion: "",
    riesgos: "",
    criterios: "",
  });

  const [plan, setPlan] = useState({
    conducta: "",
    estudios: "",
    interconsultas: "",
  });

  const [conclusiones, setConclusiones] = useState("");
  const [fechaProxima, setFechaProxima] = useState("");

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-rose-50 text-stone-700">
        Validando acceso...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rose-50 p-6 text-stone-800">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* HEADER */}
        <header>
          <h1 className="text-lg font-extrabold">
            Expertos Clínicos – MARO
          </h1>
          <p className="text-sm text-stone-600">
            Sesión clínica colegiada · Normado de conducta · Devolución operativa
          </p>
        </header>

        {/* TARJETA MARO */}
        <section
          className={`border rounded-xl p-4 ${riesgoStyle}`}
        >
          <div className="flex justify-between items-center">
            <div>
              <div className="font-bold text-sm">Caso MARO</div>
              <div className="text-sm">
                Folio: <b>MARO-2026-001</b>
              </div>
              <div className="text-sm">
                Unidad: HG Regional · Región Huasteca
              </div>
            </div>
            <div className="text-lg font-extrabold">
              {riesgo}
            </div>
          </div>
          <div className="mt-2 text-sm">
            Factores clave: HTA + embarazo · IMC no capturado · EG 32 semanas
          </div>
        </section>

        {/* SESIÓN CLÍNICA */}
        <section className="bg-white border border-rose-200 rounded-xl p-4">
          <h2 className="text-sm font-bold mb-3">Sesión clínica</h2>

          <Textarea
            label="Discusión clínica del caso"
            value={sesion.discusion}
            onChange={(v) => setSesion({ ...sesion, discusion: v })}
          />
          <Textarea
            label="Análisis de riesgos"
            value={sesion.riesgos}
            onChange={(v) => setSesion({ ...sesion, riesgos: v })}
          />
          <Textarea
            label="Criterios utilizados"
            value={sesion.criterios}
            onChange={(v) => setSesion({ ...sesion, criterios: v })}
          />
        </section>

        {/* PLAN DE ACCIÓN */}
        <section className="bg-white border border-rose-200 rounded-xl p-4">
          <h2 className="text-sm font-bold mb-3">Plan de acción normado</h2>

          <Textarea
            label="Conducta médica acordada"
            value={plan.conducta}
            onChange={(v) => setPlan({ ...plan, conducta: v })}
          />
          <Textarea
            label="Estudios complementarios"
            value={plan.estudios}
            onChange={(v) => setPlan({ ...plan, estudios: v })}
          />
          <Textarea
            label="Interconsultas solicitadas"
            value={plan.interconsultas}
            onChange={(v) =>
              setPlan({ ...plan, interconsultas: v })
            }
          />
        </section>

        {/* CONCLUSIONES */}
        <section className="bg-white border border-rose-200 rounded-xl p-4">
          <h2 className="text-sm font-bold mb-3">Conclusiones</h2>

          <Textarea
            label="Conclusiones de la sesión"
            value={conclusiones}
            onChange={setConclusiones}
          />

          <div className="mt-3">
            <label className="text-xs font-semibold">
              Fecha de próxima colegiación
            </label>
            <input
              type="date"
              className="w-full mt-1 rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm"
              value={fechaProxima}
              onChange={(e) => setFechaProxima(e.target.value)}
            />
          </div>
        </section>

        {/* ACCIONES */}
        <div className="flex flex-wrap gap-3 justify-end">
          <button className="bg-stone-800 hover:bg-stone-700 text-white px-5 py-3 rounded-xl font-semibold">
            Enviar caso con plan normado
          </button>

          <button className="bg-stone-200 hover:bg-stone-300 text-stone-800 px-5 py-3 rounded-xl font-semibold">
            El médico tratante no acepta el colegiado
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================
   COMPONENTE TEXTAREA
========================= */
function Textarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-3">
      <label className="text-xs font-semibold text-stone-700">
        {label}
      </label>
      <textarea
        rows={4}
        className="w-full mt-1 rounded-lg border border-stone-300 bg-stone-50 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-rose-200"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
