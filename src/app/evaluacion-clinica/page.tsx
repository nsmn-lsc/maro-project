// src/app/evaluacion-clinica/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  evaluarRiesgoObstetrico,
  EvaluacionClinica,
  NivelRiesgo,
} from "@/lib/riesgoObstetrico";
import { casosAPI, evaluacionesAPI, manejarErrorAPI } from "@/lib/api-client";

/* =========================
   Tipos / helpers
========================= */

type CasoBase = {
  folio?: string;
  createdAt?: string;
  region?: string;
  municipio?: string;
  unidad?: string;
  clues?: string;
};

type CasoCompleto = {
  base: CasoBase;
  clinica: EvaluacionClinica;
  riesgo: {
    nivel: NivelRiesgo;
    score: number;
    titulo: string;
    razones: string[];
    recomendaciones: string[];
  };
  estatus:
    | "BORRADOR"
    | "PENDIENTE_COLEGIACION"
    | "URGENCIA_REFERENCIA_2N";
  resumenClinico?: string;
  idCaso?: string;
};

function nowISO() {
  return new Date().toISOString();
}
function yyyymmdd() {
  const d = new Date();
  const y = String(d.getFullYear());
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}
function safeParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
function initials3FromUnidad(unidad?: string) {
  if (!unidad) return "UNI";
  const clean = unidad
    .replace(/—/g, "-")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  const take = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/[^A-Za-z0-9]/g, "")
      .toUpperCase();
  const picked =
    parts.length >= 3
      ? parts.slice(0, 3).map((p) => take(p)[0] || "").join("")
      : take(clean).slice(0, 3);
  return (picked || "UNI").padEnd(3, "X").slice(0, 3);
}
function normalizeInicialesPaciente(s: string) {
  const t = s
    .toUpperCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Z]/g, "")
    .slice(0, 4);
  return t;
}
function pad2(n: string) {
  const x = (n || "").replace(/\D/g, "").slice(0, 2);
  return (x || "1").padStart(2, "0");
}
function buildIdCaso(pacienteIni: string, unidadIni3: string, consec2: string) {
  // Ej: MG-HGJ-20251226-01
  const pi = pacienteIni || "XX";
  const ui = unidadIni3 || "UNI";
  const cc = consec2 || "01";
  return `${pi}-${ui}-${yyyymmdd()}-${cc}`;
}

function riesgoBadgeClasses(nivel: NivelRiesgo) {
  // Solo: AMARILLO / NARANJA / ROJO (sin verde)
  if (nivel === "ROJO") {
    return {
      chip: "bg-[#B10F2E] text-white border-white/10",
      card: "bg-gradient-to-br from-[#B10F2E] to-[#7A0A1F] text-white",
      title: "text-white",
      sub: "text-white/85",
    };
  }
  if (nivel === "NARANJA") {
    return {
      chip: "bg-[#F59E0B] text-black border-black/10",
      card: "bg-gradient-to-br from-[#F59E0B] to-[#FCD34D] text-black",
      title: "text-black",
      sub: "text-black/80",
    };
  }
  // AMARILLO default
  return {
    chip: "bg-[#FACC15] text-black border-black/10",
    card: "bg-gradient-to-br from-[#FACC15] to-[#FDE68A] text-black",
    title: "text-black",
    sub: "text-black/80",
  };
}

function isUrgenciaObstetrica(clinica: EvaluacionClinica) {
  // Triggers “CORRELE AL 2º NIVEL” (no colegiable)
  // Nota: conservador y claro (evita “yo avisé”).
  const sbp = clinica.sistolica ?? -1;
  const dbp = clinica.diastolica ?? -1;
  const sat = clinica.saturacionO2 ?? -1;

  const hipertensivaCritica = sbp >= 160 || dbp >= 110;
  const convulsiones = !!clinica.convulsiones; // eclampsia until proven otherwise
  const sangrado = !!clinica.sangradoVaginal;
  const alteracionMental = !!clinica.alteracionEstadoMental;
  const disnea = !!clinica.disnea;
  const satBaja = sat > 0 && sat < 92;
  const dolorToracico = !!clinica.dolorToracico;

  // “Salida de líquido” no siempre es urgencia, pero si el operador marca + síntomas, sí.
  // Aquí la dejamos como alarma clínica (no urgencia automática).
  return (
    hipertensivaCritica ||
    convulsiones ||
    sangrado ||
    alteracionMental ||
    (disnea && (satBaja || dolorToracico))
  );
}

/* =========================
   Página
========================= */

export default function EvaluacionClinicaPage() {
  const [base, setBase] = useState<CasoBase>({});
  const [clinica, setClinica] = useState<EvaluacionClinica>({});
  const [resumenClinico, setResumenClinico] = useState<string>("");

  // Identificación del caso (sin CURP)
  const [iniPaciente, setIniPaciente] = useState<string>("");
  const [consecutivo, setConsecutivo] = useState<string>("01");

  const [showConfirm, setShowConfirm] = useState(false);

  // Carga base desde P1
  useEffect(() => {
    // Intentar cargar de sesionActual (nuevo formato)
    const fromSessionActual = safeParse<CasoBase>(localStorage.getItem("sesionActual"));
    
    // Si no está, intentar cargar del formato antiguo
    const fromSession = safeParse<CasoBase>(sessionStorage.getItem("caso_base_p1"));
    const fromLocal = safeParse<CasoBase>(localStorage.getItem("caso_base_p1"));
    
    const b = fromSessionActual || fromSession || fromLocal || {};
    setBase(b);

    // si en P1 guardaste edad en base (a veces), empújala al motor
    // @ts-ignore (por si base trae edad)
    if (typeof (b as any).edad === "number") {
      // @ts-ignore
      const edad = (b as any).edad as number;
      setClinica((p) => ({ ...p, edad }));
    }
  }, []);

  // Riesgo (motor)
  const riesgo = useMemo(() => evaluarRiesgoObstetrico(clinica), [clinica]);
  const urgencia = useMemo(() => isUrgenciaObstetrica(clinica), [clinica]);

  // ID caso
  const unidadIni3 = useMemo(() => initials3FromUnidad(base.unidad), [base.unidad]);
  const iniPacNorm = useMemo(() => normalizeInicialesPaciente(iniPaciente), [iniPaciente]);
  const consec2 = useMemo(() => pad2(consecutivo), [consecutivo]);
  const idCaso = useMemo(
    () => buildIdCaso(iniPacNorm || "XX", unidadIni3, consec2),
    [iniPacNorm, unidadIni3, consec2]
  );

  // Pedagogía puntual (microexplicaciones)
  const microTips = useMemo(() => {
    const tips: string[] = [];
    const addTip = () => {
      if (!tips.includes("recomendacion")) tips.push("recomendacion");
    };
    const edad = clinica.edad;
    if (typeof edad === "number" && edad <= 16) {
      addTip();
    }
    if ((clinica.sistolica ?? 0) >= 160 || (clinica.diastolica ?? 0) >= 110) {
      addTip();
    }
    if (clinica.convulsiones) {
      addTip();
    }
    if (clinica.sangradoVaginal) {
      addTip();
    }
    return tips;
  }, [clinica]);

  // Setters tipados
  function setNum<K extends keyof EvaluacionClinica>(key: K, value: string) {
    const v = value.trim() === "" ? undefined : Number(value);
    setClinica((prev) => ({
      ...prev,
      [key]: Number.isNaN(v as number) ? undefined : (v as any),
    }));
  }
  function setBool<K extends keyof EvaluacionClinica>(key: K, checked: boolean) {
    setClinica((prev) => ({ ...prev, [key]: checked as any }));
  }

  // Guardado / envío con MySQL
  const [guardando, setGuardando] = useState(false);
  const [casoIdDB, setCasoIdDB] = useState<number | null>(null);

  async function persistCaso(estatus: CasoCompleto["estatus"]) {
    const payload: CasoCompleto = {
      base: { ...base, createdAt: base.createdAt || nowISO() },
      clinica,
      riesgo: {
        nivel: riesgo.nivel,
        score: riesgo.score,
        titulo: riesgo.titulo,
        razones: riesgo.razones,
        recomendaciones: riesgo.recomendaciones,
      },
      estatus,
      resumenClinico: resumenClinico.trim() || undefined,
      idCaso,
    };

    // Validar campos requeridos con mensajes detallados
    const camposFaltantes: string[] = [];
    
    if (!iniPaciente || iniPaciente.trim() === '') {
      camposFaltantes.push('• Iniciales del paciente');
    }
    if (!base.region || base.region.trim() === '') {
      camposFaltantes.push('• Región');
    }
    if (!base.municipio || base.municipio.trim() === '') {
      camposFaltantes.push('• Municipio');
    }
    if (!base.unidad || base.unidad.trim() === '') {
      camposFaltantes.push('• Unidad');
    }

    if (camposFaltantes.length > 0) {
      const mensaje = `Faltan los siguientes campos requeridos:\n\n${camposFaltantes.join('\n')}\n\n¿Iniciaste desde la pantalla de "Solicitud"? Los datos de región, municipio y unidad se cargan de allí.`;
      throw new Error(mensaje);
    }

    setGuardando(true);
    try {
      const region = (base.region ?? "").trim();
      const municipio = (base.municipio ?? "").trim();
      const unidad = (base.unidad ?? "").trim();

      // 1. Crear o actualizar caso
      let casoId = casoIdDB;
      if (!casoId) {
        const resultCaso = await casosAPI.crear({
          folio: idCaso,
          region,
          municipio,
          unidad,
          clues: base.clues?.trim(),
          nivelAtencion: 'Primer Nivel',
          pacienteIniciales: iniPaciente.trim(),
          edad: clinica.edad,
          semanasGestacion: clinica.semanasGestacion,
          gesta: clinica.gesta,
          partos: clinica.partos,
          cesareasPrevias: clinica.cesareasPrevias,
          estatus,
          nivelRiesgo: riesgo.nivel,
          scoreRiesgo: riesgo.score,
          resumenClinico: resumenClinico.trim() || undefined,
        });
        casoId = resultCaso.casoId;
        setCasoIdDB(casoId);
      } else {
        await casosAPI.actualizar({
          id: casoId,
          estatus,
          nivelRiesgo: riesgo.nivel,
          scoreRiesgo: riesgo.score,
          resumenClinico: resumenClinico.trim() || undefined,
        });
      }

      // 2. Guardar evaluación clínica
      await evaluacionesAPI.crear({
        casoId,
        ...clinica,
      });

      // También guardar en localStorage como backup
      localStorage.setItem(`maro_caso_${idCaso}`, JSON.stringify(payload));
      localStorage.setItem("maro_ultimo_idCaso", idCaso);
      
      return payload;
    } catch (error) {
      const errorMsg = manejarErrorAPI(error);
      console.error('Error al guardar caso:', errorMsg);
      throw new Error(errorMsg);
    } finally {
      setGuardando(false);
    }
  }


  function enviarAColegiacion() {
    // regla: si urgencia -> NO colegiable (otra tubería)
    if (urgencia) {
      alert(
        "recomendacion"
      );
      return;
    }
    (async () => {
      try {
        await persistCaso("PENDIENTE_COLEGIACION");
        setShowConfirm(false);
        alert(`✅ Caso enviado a colegiación y guardado en la base de datos.\nID: ${idCaso}\nEstatus: Pendiente de colegiación`);
      } catch (error) {
        const errorMsg = manejarErrorAPI(error);
        alert(`❌ ${errorMsg}`);
      }
    })();
  }

  function referenciaUrgente2N() {
    // Guardamos como “urgencia” para trazabilidad, pero NO es “yo avisé”: la UI te obliga a accionar.
    persistCaso("URGENCIA_REFERENCIA_2N");
    setShowConfirm(false);

    alert(
      [
        "recomendacion",
        "",
        `ID caso (trazabilidad): ${idCaso}`,
      ].join("\n")
    );
  }

  // Estilos para riesgo visible
  const badge = riesgoBadgeClasses(riesgo.nivel);

  return (
    <div className="min-h-screen text-white bg-[radial-gradient(1000px_700px_at_15%_10%,#6d1b7b_0%,rgba(109,27,123,0.6)_30%,rgba(19,9,33,1)_70%),linear-gradient(135deg,#2b0a3d_0%,#0b0820_55%,#07061a_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-7">
        {/* Header */}
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Evaluación clínica</h1>
            <p className="mt-1 text-sm text-white/70">
              Unidad: <span className="text-white">{base.unidad || "—"}</span>
              {base.municipio ? (
                <>
                  {" "}
                  · Municipio: <span className="text-white">{base.municipio}</span>
                </>
              ) : null}
            </p>
            <p className="mt-1 text-xs text-white/55">
              recomendacion
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/80">
              ID caso: <span className="font-mono text-white">{idCaso}</span>
            </span>
          </div>
        </div>

        {/* Banner urgencia */}
        {urgencia ? (
          <div className="mt-5 rounded-2xl border border-white/10 bg-gradient-to-r from-[#B10F2E] to-[#7A0A1F] p-4 text-white shadow-xl">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="text-sm font-semibold">🚨 URGENCIA OBSTÉTRICA (no colegiable)</div>
                <div className="mt-1 text-sm text-white/90">
                  recomendacion
                </div>
                <ul className="mt-2 list-disc pl-5 text-sm text-white/90 space-y-1">
                  <li>recomendacion</li>
                  <li>recomendacion</li>
                  <li>recomendacion</li>
                  <li>recomendacion</li>
                </ul>
              </div>
              <div className="shrink-0">
                <button
                  onClick={referenciaUrgente2N}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
                >
                  Activar referencia a 2º nivel
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {/* Layout */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Columna principal */}
          <div className="lg:col-span-8 space-y-6">
            {/* Identificación */}
            <Section title="Identificación del caso (sin CURP)">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Iniciales paciente (NO CURP)">
                  <input
                    value={iniPaciente}
                    onChange={(e) => setIniPaciente(e.target.value)}
                    className="input"
                    placeholder="Ej. MG"
                    inputMode="text"
                  />
                  <Hint text="Usa iniciales (p. ej. 2–4 letras). Evita datos sensibles." />
                </Field>

                <Field label="Consecutivo (2 dígitos)">
                  <input
                    value={consecutivo}
                    onChange={(e) => setConsecutivo(e.target.value)}
                    className="input"
                    placeholder="01"
                    inputMode="numeric"
                  />
                  <Hint text="Sugerencia: 01, 02, 03… por día en tu unidad." />
                </Field>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                <span className="text-white/75">ID generado: </span>
                <span className="font-mono text-white">{idCaso}</span>
                <span className="ml-2 text-xs text-white/55">
                  (PacienteIni–UnidadIni3–AAAAMMDD–##)
                </span>
              </div>
            </Section>

            {/* Datos obstétricos */}
            <Section title="Datos obstétricos mínimos (FM5)">
              <Grid2>
                <Field label="Edad (años)">
                  <input
                    value={clinica.edad ?? ""}
                    onChange={(e) => setNum("edad", e.target.value)}
                    type="number"
                    className="input"
                    placeholder="Ej. 16"
                  />
                  <Hint text="Edad extrema aumenta riesgo: el sistema te explicará el porqué." />
                </Field>

                <Field label="Semanas de gestación">
                  <input
                    value={clinica.semanasGestacion ?? ""}
                    onChange={(e) => setNum("semanasGestacion", e.target.value)}
                    type="number"
                    className="input"
                    placeholder="Ej. 34"
                  />
                </Field>

                <Field label="Gestas (G)">
                  <input
                    value={clinica.gesta ?? ""}
                    onChange={(e) => setNum("gesta", e.target.value)}
                    type="number"
                    className="input"
                    placeholder="Ej. 2"
                  />
                </Field>

                <Field label="Partos (P)">
                  <input
                    value={clinica.partos ?? ""}
                    onChange={(e) => setNum("partos", e.target.value)}
                    type="number"
                    className="input"
                    placeholder="Ej. 1"
                  />
                </Field>

                <Field label="Abortos (A)">
                  <input
                    // @ts-ignore si tu EvaluacionClinica usa otro nombre, ajusta aquí
                    value={(clinica as any).abortos ?? ""}
                    onChange={(e) =>
                      setClinica((p) => ({
                        ...p,
                        // @ts-ignore
                        abortos: e.target.value.trim() === "" ? undefined : Number(e.target.value),
                      }))
                    }
                    type="number"
                    className="input"
                    placeholder="Ej. 0"
                  />
                </Field>

                <Field label="Cesáreas previas">
                  <input
                    value={clinica.cesareasPrevias ?? ""}
                    onChange={(e) => setNum("cesareasPrevias", e.target.value)}
                    type="number"
                    className="input"
                    placeholder="Ej. 1"
                  />
                </Field>

                <Toggle
                  label="Embarazo múltiple"
                  checked={!!clinica.embarazoMultiple}
                  onChange={(v) => setBool("embarazoMultiple", v)}
                />
              </Grid2>

              {microTips.length ? (
                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs font-semibold text-white/80">Pedagogía (micro-explicaciones)</div>
                  <ul className="mt-2 space-y-1 text-sm text-white/85">
                    {microTips.slice(0, 3).map((t) => (
                      <li key={t}>• {t}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </Section>

            {/* Signos vitales */}
            <Section title="Signos vitales (si están disponibles)">
              <Grid2>
                <Field label="TA sistólica">
                  <input
                    value={clinica.sistolica ?? ""}
                    onChange={(e) => setNum("sistolica", e.target.value)}
                    type="number"
                    className="input"
                    placeholder="Ej. 140"
                  />
                </Field>

                <Field label="TA diastólica">
                  <input
                    value={clinica.diastolica ?? ""}
                    onChange={(e) => setNum("diastolica", e.target.value)}
                    type="number"
                    className="input"
                    placeholder="Ej. 90"
                  />
                </Field>

                <Field label="Frecuencia cardiaca (FC)">
                  <input
                    value={clinica.frecuenciaCardiaca ?? ""}
                    onChange={(e) => setNum("frecuenciaCardiaca", e.target.value)}
                    type="number"
                    className="input"
                    placeholder="Ej. 110"
                  />
                </Field>

                <Field label="Frecuencia respiratoria (FR)">
                  <input
                    value={clinica.frecuenciaRespiratoria ?? ""}
                    onChange={(e) => setNum("frecuenciaRespiratoria", e.target.value)}
                    type="number"
                    className="input"
                    placeholder="Ej. 24"
                  />
                </Field>

                <Field label="Sat O₂ (%)">
                  <input
                    value={clinica.saturacionO2 ?? ""}
                    onChange={(e) => setNum("saturacionO2", e.target.value)}
                    type="number"
                    className="input"
                    placeholder="Ej. 95"
                  />
                </Field>

                <Field label="Temperatura (°C)">
                  <input
                    value={clinica.temperatura ?? ""}
                    onChange={(e) => setNum("temperatura", e.target.value)}
                    type="number"
                    step="0.1"
                    className="input"
                    placeholder="Ej. 38.0"
                  />
                </Field>
              </Grid2>
            </Section>

            {/* Alarmas clínicas */}
            <Section title="Alarmas clínicas (checklist)">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Check label="Sangrado vaginal" v={!!clinica.sangradoVaginal} set={(x) => setBool("sangradoVaginal", x)} />
                <Check label="Salida de líquido" v={!!clinica.salidaLiquido} set={(x) => setBool("salidaLiquido", x)} />
                <Check label="Dolor abdominal intenso" v={!!clinica.dolorAbdominalIntenso} set={(x) => setBool("dolorAbdominalIntenso", x)} />
                <Check label="Cefalea severa" v={!!clinica.cefaleaSevera} set={(x) => setBool("cefaleaSevera", x)} />
                <Check label="Fosfenos" v={!!clinica.fosfenos} set={(x) => setBool("fosfenos", x)} />
                <Check label="Epigastralgia" v={!!clinica.epigastralgia} set={(x) => setBool("epigastralgia", x)} />
                <Check label="Convulsiones" v={!!clinica.convulsiones} set={(x) => setBool("convulsiones", x)} />
                <Check label="Disnea" v={!!clinica.disnea} set={(x) => setBool("disnea", x)} />
                <Check label="Dolor torácico" v={!!clinica.dolorToracico} set={(x) => setBool("dolorToracico", x)} />
                <Check label="Alteración del estado mental" v={!!clinica.alteracionEstadoMental} set={(x) => setBool("alteracionEstadoMental", x)} />
                <Check
                  label="Disminución de movimientos fetales"
                  v={!!clinica.disminucionMovimientosFetales}
                  set={(x) => setBool("disminucionMovimientosFetales", x)}
                />
                <Check label="Fiebre" v={!!clinica.fiebre} set={(x) => setBool("fiebre", x)} />
              </div>
            </Section>

            {/* Comorbilidades */}
            <Section title="Antecedentes / comorbilidades (checklist)">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Check label="Hipertensión crónica" v={!!clinica.hipertensionCronica} set={(x) => setBool("hipertensionCronica", x)} />
                <Check label="Diabetes pregestacional" v={!!clinica.diabetesPrevia} set={(x) => setBool("diabetesPrevia", x)} />
                <Check label="Diabetes gestacional" v={!!clinica.diabetesGestacional} set={(x) => setBool("diabetesGestacional", x)} />
                <Check label="Cardiopatía" v={!!clinica.cardiopatia} set={(x) => setBool("cardiopatia", x)} />
                <Check label="Nefropatía" v={!!clinica.nefropatia} set={(x) => setBool("nefropatia", x)} />
                <Check label="Epilepsia" v={!!clinica.epilepsia} set={(x) => setBool("epilepsia", x)} />
                <Check label="VIH" v={!!clinica.VIH} set={(x) => setBool("VIH", x)} />
                <Check
                  label="Antecedente de preeclampsia"
                  v={!!clinica.antecedentePreeclampsia}
                  set={(x) => setBool("antecedentePreeclampsia", x)}
                />
                <Check
                  label="Antecedente hemorragia posparto"
                  v={!!clinica.antecedenteHemorragiaPosparto}
                  set={(x) => setBool("antecedenteHemorragiaPosparto", x)}
                />
              </div>
            </Section>

            {/* Laboratorio (no obligatorio) */}
            <Section title="Laboratorio (si hay) — NO obligatorio (pero muy útil)">
              <Grid2>
                <Field label="Plaquetas (x10^3/µL)">
                  <input
                    value={clinica.plaquetas ?? ""}
                    onChange={(e) => setNum("plaquetas", e.target.value)}
                    type="number"
                    className="input"
                    placeholder="Ej. 120"
                  />
                </Field>

                <Field label="Creatinina (mg/dL)">
                  <input
                    value={clinica.creatinina ?? ""}
                    onChange={(e) => setNum("creatinina", e.target.value)}
                    type="number"
                    step="0.1"
                    className="input"
                    placeholder="Ej. 1.1"
                  />
                </Field>

                <Field label="AST (U/L)">
                  <input
                    value={clinica.ast ?? ""}
                    onChange={(e) => setNum("ast", e.target.value)}
                    type="number"
                    className="input"
                    placeholder="Ej. 70"
                  />
                </Field>

                <Field label="ALT (U/L)">
                  <input
                    value={clinica.alt ?? ""}
                    onChange={(e) => setNum("alt", e.target.value)}
                    type="number"
                    className="input"
                    placeholder="Ej. 70"
                  />
                </Field>

                <Field label="Proteinuria (tira reactiva)">
                  <select
                    value={(clinica.proteinuriaTira as any) ?? "NEG"}
                    onChange={(e) => setClinica((p) => ({ ...p, proteinuriaTira: e.target.value as any }))}
                    className="input"
                  >
                    <option value="NEG">NEG</option>
                    <option value="TRAZA">TRAZA</option>
                    <option value="1+">1+</option>
                    <option value="2+">2+</option>
                    <option value="3+">3+</option>
                    <option value="4+">4+</option>
                  </select>
                </Field>
              </Grid2>

              <div className="mt-2 text-xs text-white/60">
                Labs no obligatorios: ayudan a detectar severidad temprana (p. ej. HELLP) y reducen “sorpresas” en traslado.
              </div>
            </Section>

            {/* Resumen clínico */}
            <Section title="Resumen clínico breve (recomendado)">
              <textarea
                value={resumenClinico}
                onChange={(e) => setResumenClinico(e.target.value)}
                className="min-h-[120px] w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm outline-none focus:border-white/20"
                placeholder="Ej. 34 SDG, TA 150/95, cefalea, proteinuria 2+, sin sangrado, feto con movimientos…"
              />
              <div className="mt-2 text-xs text-white/60">
                “Quirúrgico”: suficiente para que el experto entienda el caso en 20 segundos.
              </div>
            </Section>

            {/* Acciones */}
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
              {!urgencia ? (
                <button
                  onClick={() => setShowConfirm(true)}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
                >
                  Ver riesgo y enviar
                </button>
              ) : (
                <button
                  onClick={referenciaUrgente2N}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
                >
                  Activar referencia a 2º nivel
                </button>
              )}
            </div>
          </div>

          {/* Sidebar sticky (riesgo + recomendaciones + normativa) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="lg:sticky lg:top-6 space-y-6">
              {/* Riesgo */}
              <aside className={`rounded-2xl border border-white/10 p-4 shadow-2xl ${badge.card}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${badge.chip}`}>
                    {riesgo.nivel} · {riesgo.titulo}
                  </div>
                  <div className={`text-xs ${badge.sub}`}>Score interno: {riesgo.score}</div>
                </div>

                <div className={`mt-3 text-sm font-semibold ${badge.title}`}>¿Por qué?</div>
                <ul className={`mt-2 space-y-1 text-sm ${badge.sub}`}>
                  {(riesgo.razones || []).slice(0, 6).map((r) => (
                    <li key={r}>• {r}</li>
                  ))}
                </ul>

                {urgencia ? (
                  <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white">
                    <div className="font-semibold">🚨 No colegiable</div>
                    <div className="mt-1 text-white/90">
                      recomendacion
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-black/10 bg-black/10 p-3 text-sm">
                    <div className="font-semibold">Enfoque MARO</div>
                    <div className="mt-1">
                      recomendacion
                    </div>
                  </div>
                )}
              </aside>

              {/* Recomendaciones */}
              <aside className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm font-semibold">Recomendaciones automáticas</div>
                <ul className="mt-3 space-y-2 text-sm text-white/85">
                  {(riesgo.recomendaciones || []).map((x) => (
                    <li key={x}>• {x}</li>
                  ))}
                </ul>

                {!urgencia ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-white/70">
                    <div className="font-semibold text-white/80">Control (operativo)</div>
                    <div className="mt-1">
                      Guardamos el caso con ID y estatus. Cuando conectemos backend: <b>pendiente / en revisión / colegiado / resuelto</b>.
                    </div>
                  </div>
                ) : null}
              </aside>

              {/* Normativa */}
              <aside className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm font-semibold">Referencias normativas (auditoría)</div>
                <ul className="mt-3 list-disc pl-4 text-xs text-white/70 space-y-1">
                  <li>NOM-007-SSA2-2016: atención del embarazo, parto y puerperio.</li>
                  <li>FM5 (IMSS): evaluación integral de riesgo obstétrico (factores acumulativos).</li>
                  <li>OMS/WHO: embarazo en adolescencia = mayor riesgo de complicaciones maternas y perinatales.</li>
                </ul>
              </aside>
            </div>
          </div>
        </div>
      </div>

      {/* Modal confirmación (solo colegiación, nunca urgencia) */}
      {showConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#140921] p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">Confirmar envío a colegiación</div>
                <div className="mt-1 text-sm text-white/70">
                  Antes de enviar, revisa el riesgo. Si algo no cuadra, corrige los datos.
                </div>
              </div>
              <button
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-sm hover:bg-white/10"
                onClick={() => setShowConfirm(false)}
              >
                Cerrar
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${badge.chip}`}>
                  {riesgo.nivel} · {riesgo.titulo}
                </span>
                <span className="text-xs text-white/70">
                  ID: <span className="font-mono text-white">{idCaso}</span>
                </span>
              </div>

              <div className="mt-4">
                <div className="text-sm font-semibold text-white/85">Razones</div>
                <ul className="mt-2 space-y-1 text-sm text-white/85">
                  {(riesgo.razones || []).map((r) => (
                    <li key={r}>• {r}</li>
                  ))}
                </ul>
              </div>

              {resumenClinico.trim() ? (
                <div className="mt-4">
                  <div className="text-sm font-semibold text-white/85">Resumen clínico</div>
                  <div className="mt-2 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/20 p-3 text-sm text-white/80">
                    {resumenClinico.trim()}
                  </div>
                </div>
              ) : (
                <div className="mt-4 text-sm text-white/70">
                  Nota: no pusiste resumen clínico. Se puede enviar así, pero ayuda muchísimo para lectura rápida.
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-3 md:flex-row md:justify-end">
              <button
                onClick={enviarAColegiacion}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-white/90"
              >
                Enviar a colegiación
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Inputs globales */}
      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.9rem;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.07);
          padding: 0.68rem 0.85rem;
          font-size: 0.92rem;
          outline: none;
        }
        .input:focus {
          border-color: rgba(255, 255, 255, 0.26);
        }
      `}</style>
    </div>
  );
}

/* =========================
   UI helpers (sellado)
========================= */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
      <h2 className="text-sm font-semibold text-white/90">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-white/75">{label}</div>
      {children}
    </label>
  );
}

function Hint({ text }: { text: string }) {
  return <div className="mt-2 text-xs text-white/60">{text}</div>;
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-3 md:col-span-2">
      <div className="text-sm text-white/85">{label}</div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`h-7 w-12 rounded-full border border-white/15 p-1 transition ${
          checked ? "bg-white" : "bg-white/10"
        }`}
        aria-pressed={checked}
      >
        <div
          className={`h-5 w-5 rounded-full transition ${
            checked ? "translate-x-5 bg-black" : "translate-x-0 bg-white"
          }`}
        />
      </button>
    </div>
  );
}

function Check({ label, v, set }: { label: string; v: boolean; set: (x: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3 hover:bg-black/25">
      <input
        type="checkbox"
        checked={v}
        onChange={(e) => set(e.target.checked)}
        className="h-4 w-4 accent-white"
      />
      <span className="text-sm text-white/85">{label}</span>
    </label>
  );
}
