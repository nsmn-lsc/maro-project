"use client";

import React, { useEffect, useState } from "react";

/* =========================
   TIPOS
========================= */

type RutaRegional =
  | "R1_PRIMER_NIVEL"
  | "R2_SEGUNDO_NIVEL"
  | "R3_COLEGIACION";

type CasoGuardado = {
  idCaso: string;
  riesgo: {
    nivel: string;
    titulo: string;
    razones: string[];
  };
  estatus: string;
  rutaRegional?: RutaRegional;
  plan?: PlanRegional;
};

type PlanRegional = {
  responsableRegional?: string;

  r1?: {
    frecuencia?: Frecuencia;
    fechaSeguimiento?: string;
    acciones: AccionesPrimerNivel;
  };

  r2?: {
    hospitalReceptor?: string;
    servicio?: ServicioSegundoNivel;
    enlaceTipo?: EnlaceTipo;
    enlaceNombre?: string;
    fechaCita?: string;
    horaCita?: string;
    horaPresentacion?: string;
    motivos: MotivosSegundoNivel;
  };

  r3?: {
    urgencia?: UrgenciaColegiacion;
    preguntaClinica?: string;
    motivos: MotivosColegiacion;
  };
};

/* =========================
   ENUMS
========================= */

type Frecuencia =
  | "DIARIA_3_DIAS"
  | "DIARIA"
  | "SEMANAL"
  | "QUINCENAL"
  | "MENSUAL";

type ServicioSegundoNivel =
  | "GINECOLOGIA"
  | "MEDICINA_INTERNA"
  | "URGENCIAS"
  | "OTRO";

type EnlaceTipo =
  | "GINECOLOGIA"
  | "TRABAJO_SOCIAL"
  | "COORDINACION"
  | "OTRO";

type UrgenciaColegiacion = "HOY" | "24H" | "72H";

/* =========================
   MODELOS CHECKBOX
========================= */

type AccionesPrimerNivel = {
  vigilanciaTA: boolean;
  vigilanciaAlarma: boolean;
  busquedaIntencionada: boolean;
  accionComunitaria: boolean;
  educacionAlarma: boolean;
  otro: boolean;
  otroDetalle?: string;
};

type MotivosSegundoNivel = {
  sospechaPreeclampsia: boolean;
  hipertensionNoControlada: boolean;
  diabetesGestacional: boolean;
  obesidadGradoIII: boolean;
  comorbilidadGrave: boolean;
  fallaPrimerNivel: boolean;
  requiereEspecialista: boolean;
  otro: boolean;
  otroDetalle?: string;
};

type MotivosColegiacion = {
  riesgoMaterno: boolean;
  riesgoFetal: boolean;
  diagnosticoNoClaro: boolean;
  fallaTratamiento: boolean;
  comorbilidadCompleja: boolean;
  otro: boolean;
  otroDetalle?: string;
};

/* =========================
   KEYS BOOLEANAS
========================= */

const accionesPrimerNivelKeys: (keyof AccionesPrimerNivel)[] = [
  "vigilanciaTA",
  "vigilanciaAlarma",
  "busquedaIntencionada",
  "accionComunitaria",
  "educacionAlarma",
  "otro",
];

const motivosSegundoNivelKeys: (keyof MotivosSegundoNivel)[] = [
  "sospechaPreeclampsia",
  "hipertensionNoControlada",
  "diabetesGestacional",
  "obesidadGradoIII",
  "comorbilidadGrave",
  "fallaPrimerNivel",
  "requiereEspecialista",
  "otro",
];

const motivosColegiacionKeys: (keyof MotivosColegiacion)[] = [
  "riesgoMaterno",
  "riesgoFetal",
  "diagnosticoNoClaro",
  "fallaTratamiento",
  "comorbilidadCompleja",
  "otro",
];

/* =========================
   ESTADOS INICIALES
========================= */

const accionesPrimerNivelInicial: AccionesPrimerNivel = {
  vigilanciaTA: false,
  vigilanciaAlarma: false,
  busquedaIntencionada: false,
  accionComunitaria: false,
  educacionAlarma: false,
  otro: false,
};

const motivosSegundoNivelInicial: MotivosSegundoNivel = {
  sospechaPreeclampsia: false,
  hipertensionNoControlada: false,
  diabetesGestacional: false,
  obesidadGradoIII: false,
  comorbilidadGrave: false,
  fallaPrimerNivel: false,
  requiereEspecialista: false,
  otro: false,
};

const motivosColegiacionInicial: MotivosColegiacion = {
  riesgoMaterno: false,
  riesgoFetal: false,
  diagnosticoNoClaro: false,
  fallaTratamiento: false,
  comorbilidadCompleja: false,
  otro: false,
};

/* =========================
   PÁGINA
========================= */

export default function RegionPage() {
  const [casos, setCasos] = useState<CasoGuardado[]>([]);
  const [activo, setActivo] = useState<CasoGuardado | null>(null);
  const [ruta, setRuta] = useState<RutaRegional | "">("");
  const [plan, setPlan] = useState<PlanRegional>({});

  useEffect(() => {
    const keys = Object.keys(localStorage).filter(k =>
      k.startsWith("maro_caso_")
    );
    setCasos(keys.map(k => JSON.parse(localStorage.getItem(k) || "{}")));
  }, []);

  function guardarDecision() {
    if (!activo || !ruta || !plan.responsableRegional) {
      alert("Faltan datos obligatorios");
      return;
    }

    const actualizado: CasoGuardado = {
      ...activo,
      rutaRegional: ruta,
      plan,
      estatus:
        ruta === "R3_COLEGIACION"
          ? "ESCALADO_ESTATAL"
          : "EN_SEGUIMIENTO",
    };

    localStorage.setItem(
      `maro_caso_${activo.idCaso}`,
      JSON.stringify(actualizado)
    );

    setCasos(prev =>
      prev.map(c => (c.idCaso === actualizado.idCaso ? actualizado : c))
    );
    setActivo(actualizado);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-fuchsia-900 to-pink-900 text-white">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">

        {/* BANDEJA */}
        <aside className="lg:col-span-4 space-y-3">
          <h2 className="font-semibold">Bandeja Regional MARO</h2>
          {casos.map(c => (
            <button
              key={c.idCaso}
              onClick={() => {
                setActivo(c);
                setRuta(c.rutaRegional || "");
                setPlan(c.plan || {});
              }}
              className="w-full text-left bg-white/10 p-3 rounded-xl"
            >
              <div className="text-xs font-mono">{c.idCaso}</div>
              <div className="text-sm">
                {c.riesgo.nivel} · {c.riesgo.titulo}
              </div>
            </button>
          ))}
        </aside>

        {/* DETALLE */}
        <main className="lg:col-span-8 space-y-4">
          {!activo ? (
            <div className="text-white/70">Selecciona un caso</div>
          ) : (
            <>
              <section className="bg-white/10 rounded-xl p-4">
                <h3 className="font-semibold">
                  Caso {activo.idCaso}
                </h3>
                <ul className="list-disc ml-4 text-sm">
                  {activo.riesgo.razones.map(r => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </section>

              <section className="bg-white/10 rounded-xl p-4 space-y-3">
                <select
                  className="w-full bg-black/30 p-2 rounded-lg"
                  value={ruta}
                  onChange={e =>
                    setRuta(e.target.value as RutaRegional)
                  }
                >
                  <option value="">Selecciona ruta</option>
                  <option value="R1_PRIMER_NIVEL">
                    Seguimiento Primer Nivel
                  </option>
                  <option value="R2_SEGUNDO_NIVEL">
                    Referencia Segundo Nivel
                  </option>
                  <option value="R3_COLEGIACION">
                    Colegiación Estatal
                  </option>
                </select>

                <Input
                  label="Responsable regional"
                  value={plan.responsableRegional || ""}
                  onChange={v =>
                    setPlan(p => ({
                      ...p,
                      responsableRegional: v,
                    }))
                  }
                />

                {ruta === "R1_PRIMER_NIVEL" && (
                  <RutaPrimerNivel plan={plan} setPlan={setPlan} />
                )}
                {ruta === "R2_SEGUNDO_NIVEL" && (
                  <RutaSegundoNivel plan={plan} setPlan={setPlan} />
                )}
                {ruta === "R3_COLEGIACION" && (
                  <RutaColegiacion plan={plan} setPlan={setPlan} />
                )}

                <button
                  onClick={guardarDecision}
                  className="bg-white text-black px-4 py-2 rounded-xl font-semibold"
                >
                  Guardar decisión
                </button>
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/* =========================
   COMPONENTES RUTA
========================= */

function RutaPrimerNivel({ plan, setPlan }: any) {
  const acciones =
    plan.r1?.acciones || accionesPrimerNivelInicial;

  return (
    <div className="bg-black/20 p-4 rounded-xl space-y-3">
      <select
        className="w-full bg-black/30 p-2 rounded-lg"
        value={plan.r1?.frecuencia || ""}
        onChange={e =>
          setPlan((p: PlanRegional) => ({
            ...p,
            r1: {
              ...p.r1,
              frecuencia: e.target.value as Frecuencia,
              acciones,
            },
          }))
        }
      >
        <option value="">Frecuencia</option>
        <option value="DIARIA_3_DIAS">Diaria x3 días</option>
        <option value="DIARIA">Diaria</option>
        <option value="SEMANAL">Semanal</option>
        <option value="QUINCENAL">Quincenal</option>
        <option value="MENSUAL">Mensual</option>
      </select>

      <Input
        label="Fecha seguimiento"
        type="date"
        value={plan.r1?.fechaSeguimiento || ""}
        onChange={v =>
          setPlan((p: PlanRegional) => ({
            ...p,
            r1: { ...p.r1, fechaSeguimiento: v, acciones },
          }))
        }
      />

      {accionesPrimerNivelKeys.map(key => (
        <Check
          key={key}
          label={key}
          checked={acciones[key]}
          onChange={v =>
            setPlan((p: PlanRegional) => ({
              ...p,
              r1: {
                ...p.r1,
                acciones: { ...acciones, [key]: v },
              },
            }))
          }
        />
      ))}

      {acciones.otro && (
        <Input
          label="Otra acción"
          value={acciones.otroDetalle || ""}
          onChange={v =>
            setPlan((p: PlanRegional) => ({
              ...p,
              r1: {
                ...p.r1,
                acciones: {
                  ...acciones,
                  otroDetalle: v,
                },
              },
            }))
          }
        />
      )}
    </div>
  );
}

function RutaSegundoNivel({ plan, setPlan }: any) {
  const motivos =
    plan.r2?.motivos || motivosSegundoNivelInicial;

  return (
    <div className="bg-black/20 p-4 rounded-xl space-y-3">
      <Input
        label="Hospital"
        value={plan.r2?.hospitalReceptor || ""}
        onChange={v =>
          setPlan((p: PlanRegional) => ({
            ...p,
            r2: {
              ...p.r2,
              hospitalReceptor: v,
              motivos,
            },
          }))
        }
      />

      <SelectServicio
        value={plan.r2?.servicio}
        onChange={v =>
          setPlan((p: PlanRegional) => ({
            ...p,
            r2: { ...p.r2, servicio: v, motivos },
          }))
        }
      />

      <SelectEnlace
        value={plan.r2?.enlaceTipo}
        onChange={v =>
          setPlan((p: PlanRegional) => ({
            ...p,
            r2: { ...p.r2, enlaceTipo: v, motivos },
          }))
        }
      />

      <Input
        label="Nombre enlace"
        value={plan.r2?.enlaceNombre || ""}
        onChange={v =>
          setPlan((p: PlanRegional) => ({
            ...p,
            r2: { ...p.r2, enlaceNombre: v, motivos },
          }))
        }
      />

      <div className="grid grid-cols-3 gap-2">
        <Input
          label="Fecha cita"
          type="date"
          value={plan.r2?.fechaCita || ""}
          onChange={v =>
            setPlan((p: PlanRegional) => ({
              ...p,
              r2: { ...p.r2, fechaCita: v, motivos },
            }))
          }
        />
        <Input
          label="Hora cita"
          type="time"
          value={plan.r2?.horaCita || ""}
          onChange={v =>
            setPlan((p: PlanRegional) => ({
              ...p,
              r2: { ...p.r2, horaCita: v, motivos },
            }))
          }
        />
        <Input
          label="Hora llegada"
          type="time"
          value={plan.r2?.horaPresentacion || ""}
          onChange={v =>
            setPlan((p: PlanRegional) => ({
              ...p,
              r2: { ...p.r2, horaPresentacion: v, motivos },
            }))
          }
        />
      </div>

      {motivosSegundoNivelKeys.map(key => (
        <Check
          key={key}
          label={key}
          checked={motivos[key]}
          onChange={v =>
            setPlan((p: PlanRegional) => ({
              ...p,
              r2: {
                ...p.r2,
                motivos: { ...motivos, [key]: v },
              },
            }))
          }
        />
      ))}

      {motivos.otro && (
        <Input
          label="Otro motivo"
          value={motivos.otroDetalle || ""}
          onChange={v =>
            setPlan((p: PlanRegional) => ({
              ...p,
              r2: {
                ...p.r2,
                motivos: {
                  ...motivos,
                  otroDetalle: v,
                },
              },
            }))
          }
        />
      )}
    </div>
  );
}

function RutaColegiacion({ plan, setPlan }: any) {
  const motivos =
    plan.r3?.motivos || motivosColegiacionInicial;

  return (
    <div className="bg-black/20 p-4 rounded-xl space-y-3">
      <SelectUrgencia
        value={plan.r3?.urgencia}
        onChange={v =>
          setPlan((p: PlanRegional) => ({
            ...p,
            r3: { ...p.r3, urgencia: v, motivos },
          }))
        }
      />

      {motivosColegiacionKeys.map(key => (
        <Check
          key={key}
          label={key}
          checked={motivos[key]}
          onChange={v =>
            setPlan((p: PlanRegional) => ({
              ...p,
              r3: {
                ...p.r3,
                motivos: { ...motivos, [key]: v },
              },
            }))
          }
        />
      ))}

      {motivos.otro && (
        <Input
          label="Otro motivo"
          value={motivos.otroDetalle || ""}
          onChange={v =>
            setPlan((p: PlanRegional) => ({
              ...p,
              r3: {
                ...p.r3,
                motivos: {
                  ...motivos,
                  otroDetalle: v,
                },
              },
            }))
          }
        />
      )}

      <Input
        label="Pregunta clínica"
        value={plan.r3?.preguntaClinica || ""}
        onChange={v =>
          setPlan((p: PlanRegional) => ({
            ...p,
            r3: {
              ...p.r3,
              preguntaClinica: v,
              motivos,
            },
          }))
        }
      />
    </div>
  );
}

/* =========================
   UI HELPERS
========================= */

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value?: string;
  type?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <div className="text-xs mb-1">{label}</div>
      <input
        type={type}
        className="w-full bg-black/30 p-2 rounded-lg"
        value={value || ""}
        onChange={e => onChange(e.target.value)}
      />
    </label>
  );
}


function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 bg-black/30 p-2 rounded-lg">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
      />
      <span className="text-sm">{label}</span>
    </label>
  );
}

function SelectServicio({
  value,
  onChange,
}: {
  value?: ServicioSegundoNivel;
  onChange: (v: ServicioSegundoNivel) => void;
}) {
  return (
    <select
      className="w-full bg-black/30 p-2 rounded-lg"
      value={value || ""}
      onChange={e => onChange(e.target.value as ServicioSegundoNivel)}
    >
      <option value="">Servicio</option>
      <option value="GINECOLOGIA">Ginecología</option>
      <option value="MEDICINA_INTERNA">Medicina Interna</option>
      <option value="URGENCIAS">Urgencias</option>
      <option value="OTRO">Otro</option>
    </select>
  );
}

function SelectEnlace({
  value,
  onChange,
}: {
  value?: EnlaceTipo;
  onChange: (v: EnlaceTipo) => void;
}) {
  return (
    <select
      className="w-full bg-black/30 p-2 rounded-lg"
      value={value || ""}
      onChange={e => onChange(e.target.value as EnlaceTipo)}
    >
      <option value="">Enlace</option>
      <option value="GINECOLOGIA">Ginecología</option>
      <option value="TRABAJO_SOCIAL">Trabajo Social</option>
      <option value="COORDINACION">Coordinación</option>
      <option value="OTRO">Otro</option>
    </select>
  );
}

function SelectUrgencia({
  value,
  onChange,
}: {
  value?: UrgenciaColegiacion;
  onChange: (v: UrgenciaColegiacion) => void;
}) {
  return (
    <select
      className="w-full bg-black/30 p-2 rounded-lg"
      value={value || ""}
      onChange={e => onChange(e.target.value as UrgenciaColegiacion)}
    >
      <option value="">Urgencia</option>
      <option value="HOY">Hoy</option>
      <option value="24H">24 h</option>
      <option value="72H">72 h</option>
    </select>
  );
}
