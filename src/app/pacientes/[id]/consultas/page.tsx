"use client";

import Link from "next/link";
import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";

interface Consulta {
  id: number;
  paciente_id: number;
  fecha_consulta: string | null;
  sdg: number | null;
  ta_sistolica: number | null;
  ta_diastolica: number | null;
  frecuencia_cardiaca: number | null;
  indice_choque: number | null;
  frecuencia_respiratoria: number | null;
  temperatura: number | null;
  fondo_uterino_acorde_sdg: 0 | 1;
  ivu_repeticion: 0 | 1;
  estado_conciencia: "alteraciones" | "conciente" | null;
  hemorragia: "visible o abundante" | "no visible o moderada" | "no visible o escasa" | "sin hemorragia" | null;
  respiracion: "alterada" | "normal" | null;
  color_piel: "cianotica" | "palida" | "normal" | null;
  puntaje_consulta_parametros: number | null;
  puntaje_total_consulta: number | null;
  riesgo_25_plus: 0 | 1;
  diagnostico: string | null;
  plan: string | null;
  fecha_referencia: string | null;
  area_referencia: string | null;
  notas: string | null;
  created_at?: string;
}

const initialForm = {
  fecha_consulta: "",
  ta_sistolica: "",
  ta_diastolica: "",
  frecuencia_cardiaca: "",
  indice_choque: "",
  frecuencia_respiratoria: "",
  temperatura: "",
  fondo_uterino_acorde_sdg: false,
  ivu_repeticion: false,
  estado_conciencia: "",
  hemorragia: "",
  respiracion: "",
  color_piel: "",
  diagnostico: "",
  plan: "",
  fecha_referencia: "",
  area_referencia: "",
  notas: "",
};

export default function ConsultasPaciente() {
  const params = useParams();
  const router = useRouter();
  const pacienteId = params?.id as string;
  const [authChecked, setAuthChecked] = useState(false);

  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alertaRiesgoEstatal, setAlertaRiesgoEstatal] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [showPuerperioModal, setShowPuerperioModal] = useState(false);
  const [pendingPuerperioRedirect, setPendingPuerperioRedirect] = useState<string | null>(null);
  
  const [pacienteData, setPacienteData] = useState<{
    folio: string | null;
    nombre_completo: string | null;
    fum: string | null;
    fpp: string | null;
    sdg_ingreso: number | null;
    factor_riesgo_antecedentes: number;
    factor_riesgo_tamizajes: number;
    semanas_gestacion: number;
    edad: number | null;
    imc_inicial: number | null;
    factor_cardiopatia: number;
    factor_nefropatia: number;
    factor_hepatopatia: number;
    factor_coagulopatias: number;
  }>({
    folio: null,
    nombre_completo: null,
    fum: null,
    fpp: null,
    sdg_ingreso: null,
    factor_riesgo_antecedentes: 0,
    factor_riesgo_tamizajes: 0,
    semanas_gestacion: 0,
    edad: null,
    imc_inicial: null,
    factor_cardiopatia: 0,
    factor_nefropatia: 0,
    factor_hepatopatia: 0,
    factor_coagulopatias: 0,
  });

  useEffect(() => {
    const stored = localStorage.getItem("maro:user");
    if (!stored) {
      router.replace("/inicial");
      return;
    }

    try {
      const parsed = JSON.parse(stored) as { nivel?: number };
      const nivel = parsed.nivel ?? 0;
      if (nivel >= 3) {
        router.replace(`/estatal/pacientes/${pacienteId}`);
        return;
      }
      if (nivel >= 2) {
        router.replace(`/region/pacientes/${pacienteId}`);
        return;
      }
      setAuthChecked(true);
    } catch {
      router.replace("/inicial");
    }
  }, [pacienteId, router]);

  useEffect(() => {
    if (!alertaRiesgoEstatal) return;

    const timeoutId = window.setTimeout(() => {
      setAlertaRiesgoEstatal(null);
    }, 12000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [alertaRiesgoEstatal]);

  useEffect(() => {
    if (alertaRiesgoEstatal) return;
    if (!pendingPuerperioRedirect) return;
    if (showPuerperioModal) return;

    setShowPuerperioModal(true);
  }, [alertaRiesgoEstatal, pendingPuerperioRedirect, showPuerperioModal]);

  // Validaciones de signos vitales - ROJAS (críticas)
  const taSistolicaNumber = form.ta_sistolica === "" ? null : Number(form.ta_sistolica);
  const taSistolicaAlerta = taSistolicaNumber !== null && (taSistolicaNumber <= 89 || taSistolicaNumber >= 160);
  
  const taDiastolicaNumber = form.ta_diastolica === "" ? null : Number(form.ta_diastolica);
  const taDiastolicaAlerta = taDiastolicaNumber !== null && (taDiastolicaNumber <= 50 || taDiastolicaNumber >= 110);
  
  const frecuenciaCardiacaNumber = form.frecuencia_cardiaca === "" ? null : Number(form.frecuencia_cardiaca);
  const frecuenciaCardiacaAlerta = frecuenciaCardiacaNumber !== null && (frecuenciaCardiacaNumber < 60 || frecuenciaCardiacaNumber > 100);
  
  const indiceChoqueNumber = form.indice_choque === "" ? null : Number(form.indice_choque);
  const indiceChoqueAlerta = indiceChoqueNumber !== null && indiceChoqueNumber > 0.8;
  
  const frecuenciaRespiratoriaNumber = form.frecuencia_respiratoria === "" ? null : Number(form.frecuencia_respiratoria);
  const frecuenciaRespiratoriaAlerta = frecuenciaRespiratoriaNumber !== null && (frecuenciaRespiratoriaNumber < 16 || frecuenciaRespiratoriaNumber > 20);
  
  const temperaturaNumber = form.temperatura === "" ? null : Number(form.temperatura);
  const temperaturaAlerta = temperaturaNumber !== null && (temperaturaNumber < 36 || temperaturaNumber > 39);

  // Advertencias AMARILLAS
  const taSistolicaAdvertencia = taSistolicaNumber !== null && !taSistolicaAlerta && (taSistolicaNumber >= 140 && taSistolicaNumber <= 159);
  const taDiastolicaAdvertencia = taDiastolicaNumber !== null && !taDiastolicaAlerta && (taDiastolicaNumber >= 90 && taDiastolicaNumber <= 109);
  const indiceChoqueAdvertencia = indiceChoqueNumber !== null && !indiceChoqueAlerta && (indiceChoqueNumber >= 0.7 && indiceChoqueNumber <= 0.8);
  const temperaturaAdvertencia = temperaturaNumber !== null && !temperaturaAlerta && (temperaturaNumber >= 37.5 && temperaturaNumber <= 38.9);

  // Puntajes de parámetros de la consulta
  const puntajeTaSistolica = taSistolicaNumber === null
    ? 0
    : (taSistolicaNumber <= 89 || taSistolicaNumber >= 160)
      ? 4
      : (taSistolicaNumber >= 140 && taSistolicaNumber <= 159)
        ? 2
        : 0;

  const puntajeTaDiastolica = taDiastolicaNumber === null
    ? 0
    : (taDiastolicaNumber <= 50 || taDiastolicaNumber >= 110)
      ? 4
      : (taDiastolicaNumber >= 90 && taDiastolicaNumber <= 109)
        ? 2
        : 0;

  const puntajeFrecuenciaCardiaca = frecuenciaCardiacaNumber === null
    ? 0
    : (frecuenciaCardiacaNumber < 60 || frecuenciaCardiacaNumber > 100)
      ? 4
      : 0;

  const puntajeFrecuenciaRespiratoria = frecuenciaRespiratoriaNumber === null
    ? 0
    : (frecuenciaRespiratoriaNumber < 16 || frecuenciaRespiratoriaNumber > 20)
      ? 4
      : 0;

  const puntajeIndiceChoque = indiceChoqueNumber === null
    ? 0
    : indiceChoqueNumber > 0.8
      ? 4
      : (indiceChoqueNumber >= 0.7 && indiceChoqueNumber <= 0.8)
        ? 2
        : 0;

  const puntajeTemperatura = temperaturaNumber === null
    ? 0
    : (temperaturaNumber < 36 || temperaturaNumber > 39)
      ? 4
      : (temperaturaNumber >= 37.5 && temperaturaNumber <= 38.9)
        ? 2
        : 0;

  const puntajeFondoUterino = form.fondo_uterino_acorde_sdg ? 4 : 0;
  const puntajeIvu = form.ivu_repeticion ? 15 : 0;
  const puntajeColorPiel = form.color_piel === "cianotica" ? 4 : 0;

  const puntajeConsultaParametros =
    puntajeTaSistolica +
    puntajeTaDiastolica +
    puntajeFrecuenciaCardiaca +
    puntajeFrecuenciaRespiratoria +
    puntajeIndiceChoque +
    puntajeTemperatura +
    puntajeFondoUterino +
    puntajeIvu +
    puntajeColorPiel;

  const hallazgosConsulta = [
    {
      campo: "T/A Sistólica",
      valor: taSistolicaNumber ? `${taSistolicaNumber} mmHg` : null,
      puntos: puntajeTaSistolica,
      criterio: "≤89 o ≥160 = 4 pts · 140-159 = 2 pts",
      alerta: taSistolicaAlerta,
    },
    {
      campo: "T/A Diastólica",
      valor: taDiastolicaNumber ? `${taDiastolicaNumber} mmHg` : null,
      puntos: puntajeTaDiastolica,
      criterio: "≤50 o ≥110 = 4 pts · 90-109 = 2 pts",
      alerta: taDiastolicaAlerta,
    },
    {
      campo: "Frecuencia cardiaca",
      valor: frecuenciaCardiacaNumber ? `${frecuenciaCardiacaNumber} lpm` : null,
      puntos: puntajeFrecuenciaCardiaca,
      criterio: "<60 o >100 = 4 pts",
      alerta: frecuenciaCardiacaAlerta,
    },
    {
      campo: "Frecuencia respiratoria",
      valor: frecuenciaRespiratoriaNumber ? `${frecuenciaRespiratoriaNumber} rpm` : null,
      puntos: puntajeFrecuenciaRespiratoria,
      criterio: "<16 o >20 = 4 pts (Emergencia Obstétrica)",
      alerta: frecuenciaRespiratoriaAlerta,
    },
    {
      campo: "Índice de choque",
      valor: indiceChoqueNumber,
      puntos: puntajeIndiceChoque,
      criterio: ">0.8 = 4 pts · 0.7-0.8 = 2 pts",
      alerta: indiceChoqueAlerta,
    },
    {
      campo: "Temperatura",
      valor: temperaturaNumber ? `${temperaturaNumber} °C` : null,
      puntos: puntajeTemperatura,
      criterio: "<36 o >39 = 4 pts · 37.5-38.9 = 2 pts",
      alerta: temperaturaAlerta,
    },
    {
      campo: "Fondo uterino",
      valor: form.fondo_uterino_acorde_sdg ? "No acorde a SDG" : null,
      puntos: puntajeFondoUterino,
      criterio: "No acorde = 4 pts",
      alerta: form.fondo_uterino_acorde_sdg,
    },
    {
      campo: "IVU / Cervicovaginitis de repetición",
      valor: form.ivu_repeticion ? "Detectada" : null,
      puntos: puntajeIvu,
      criterio: "Envío inmediato a 2º Nivel (urocultivo/cultivo con antibiograma) · Riesgo parto pretérmino",
      alerta: form.ivu_repeticion,
    },
    {
      campo: "Color de piel",
      valor: form.color_piel === "cianotica" ? "Cianótica" : null,
      puntos: puntajeColorPiel,
      criterio: "Cianótica = 4 pts",
      alerta: form.color_piel === "cianotica",
    },
  ].filter((item) => item.puntos > 0);

  const puntajeRiesgoTotal =
    (pacienteData.factor_riesgo_antecedentes || 0) +
    (pacienteData.factor_riesgo_tamizajes || 0) +
    puntajeConsultaParametros;

  const factoresRiesgoMayorActivos = [
    { activo: Number(pacienteData.factor_cardiopatia) === 1, label: "Cardiopatía" },
    { activo: Number(pacienteData.factor_nefropatia) === 1, label: "Nefropatía" },
    { activo: Number(pacienteData.factor_hepatopatia) === 1, label: "Hepatopatía" },
    { activo: Number(pacienteData.factor_coagulopatias) === 1, label: "Coagulopatías" },
  ]
    .filter((item) => item.activo)
    .map((item) => item.label);

  const edadPaciente = Number(pacienteData.edad);
  const tieneEdadCritica = Number.isFinite(edadPaciente) && edadPaciente >= 10 && edadPaciente <= 14;
  const imcPaciente = Number(pacienteData.imc_inicial);
  const tieneImcCritico = Number.isFinite(imcPaciente) && imcPaciente >= 31;

  const criteriosEscalamientoActivos = [
    ...(tieneEdadCritica ? [`Edad crítica (${edadPaciente} años)`] : []),
    ...(tieneImcCritico ? [`IMC crítico (${imcPaciente.toFixed(1)})`] : []),
    ...factoresRiesgoMayorActivos,
  ];

  const tieneEscalamientoForzado = criteriosEscalamientoActivos.length > 0;

  useEffect(() => {
    if (!authChecked) return;

    const loadPaciente = async () => {
      try {
        const res = await fetch(`/api/pacientes?id=${pacienteId}`);
        if (res.ok) {
          const data = await res.json();
          setPacienteData({
            folio: data.folio || null,
            nombre_completo: data.nombre_completo || null,
            fum: data.fum || null,
            fpp: data.fpp || null,
            sdg_ingreso: data.sdg_ingreso ?? null,
            factor_riesgo_antecedentes: data.factor_riesgo_antecedentes || 0,
            factor_riesgo_tamizajes: data.factor_riesgo_tamizajes || 0,
            semanas_gestacion: data.semanas_gestacion || 0,
            edad: data.edad === null || data.edad === undefined || data.edad === "" ? null : Number(data.edad),
            imc_inicial: data.imc_inicial === null || data.imc_inicial === undefined || data.imc_inicial === "" ? null : Number(data.imc_inicial),
            factor_cardiopatia: data.factor_cardiopatia || 0,
            factor_nefropatia: data.factor_nefropatia || 0,
            factor_hepatopatia: data.factor_hepatopatia || 0,
            factor_coagulopatias: data.factor_coagulopatias || 0,
          });
        }
      } catch (err) {
        console.error("Error cargando datos del paciente", err);
      }
    };
    if (pacienteId) loadPaciente();
  }, [authChecked, pacienteId]);

  const loadConsultas = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/consultas?paciente_id=${pacienteId}`);
      if (!res.ok) throw new Error("No se pudieron cargar las consultas");
      const data = await res.json();
      setConsultas(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authChecked) return;
    if (pacienteId) loadConsultas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, pacienteId]);

  // Cálculo de SDG actual dinámico en tiempo real
  const sdgActualCalculada = useMemo(() => {
    if (!pacienteData.fum) return null;
    const base = new Date(`${pacienteData.fum}T00:00:00Z`);
    if (Number.isNaN(base.getTime())) return null;
    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const totalDays = Math.max(0, Math.floor((todayUtc.getTime() - base.getTime()) / (1000 * 60 * 60 * 24)));
    const weeks = Math.floor(totalDays / 7);
    const days = totalDays % 7;
    return `${weeks}.${days} SDG`;
  }, [pacienteData.fum]);

  if (!authChecked) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Validando acceso...
      </main>
    );
  }

  const formatDate = (value: string | null) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  const formatDiagnostico = (value: string | null) => {
    if (!value) return "—";
    const diagnosticos: Record<string, string> = {
      seguimiento_embarazo: "Seguimiento de embarazo",
      puerperio: "Puerperio",
    };
    return diagnosticos[value] || value;
  };

  const handleChange = (field: string, value: string | boolean) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      
      // Auto-cálculo de Índice de Choque si se tiene FC y TAS
      if (field === "ta_sistolica" || field === "frecuencia_cardiaca") {
        const tas = field === "ta_sistolica" ? Number(value) : Number(next.ta_sistolica);
        const fc = field === "frecuencia_cardiaca" ? Number(value) : Number(next.frecuencia_cardiaca);
        if (tas > 0 && fc > 0 && Number.isFinite(tas) && Number.isFinite(fc)) {
          next.indice_choque = (fc / tas).toFixed(2);
        }
      }

      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setAlertaRiesgoEstatal(null);
    setShowConfirmModal(true);
  };

  const executeSave = async () => {
    setShowConfirmModal(false);
    setSaving(true);
    setError(null);
    setAlertaRiesgoEstatal(null);

    try {
      const numOrNull = (val: string) => (val === "" ? null : Number(val));
      const payload = {
        paciente_id: Number(pacienteId),
        fecha_consulta: form.fecha_consulta || null,
        ta_sistolica: numOrNull(form.ta_sistolica),
        ta_diastolica: numOrNull(form.ta_diastolica),
        frecuencia_cardiaca: numOrNull(form.frecuencia_cardiaca),
        indice_choque: numOrNull(form.indice_choque),
        frecuencia_respiratoria: numOrNull(form.frecuencia_respiratoria),
        temperatura: numOrNull(form.temperatura),
        fondo_uterino_acorde_sdg: form.fondo_uterino_acorde_sdg,
        ivu_repeticion: form.ivu_repeticion,
        estado_conciencia: form.estado_conciencia || null,
        hemorragia: form.hemorragia || null,
        respiracion: form.respiracion || null,
        color_piel: form.color_piel || null,
        diagnostico: form.diagnostico || null,
        plan: form.plan || null,
        fecha_referencia: form.fecha_referencia || null,
        area_referencia: form.area_referencia || null,
        notas: form.notas || null,
        created_by: 1,
        updated_by: 1,
      };

      const res = await fetch("/api/consultas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = (await res.json().catch(() => ({}))).message || "No se pudo guardar la consulta";
        throw new Error(message);
      }

      const savedConsulta = await res.json().catch(() => null);
      const puntajeGuardado = Number(savedConsulta?.puntaje_total_consulta ?? puntajeRiesgoTotal);
      const riesgo25 = Number(savedConsulta?.riesgo_25_plus ?? 0) === 1 || puntajeGuardado >= 25;

      if (riesgo25) {
        const syncStamp = String(Date.now());
        localStorage.setItem("maro:estatal-riesgo-updated", syncStamp);
        window.dispatchEvent(new CustomEvent("maro:estatal-riesgo-updated", { detail: syncStamp }));

        setAlertaRiesgoEstatal(
          "Caso en riesgo alto: el puntaje total es mayor o igual a 25. Este caso pasó automáticamente a nivel estatal y está pendiente la determinación de colegiarse."
        );
      }

      // Si el diagnóstico es puerperio, preparar redirección
      if (form.diagnostico === "puerperio") {
        const pacienteRes = await fetch(`/api/pacientes?id=${pacienteId}`);
        if (pacienteRes.ok) {
          const pData = await pacienteRes.json();
          setPendingPuerperioRedirect(`/puerperio/nuevo?paciente_id=${pacienteId}&folio=${pData.folio}`);
        } else {
          setPendingPuerperioRedirect(`/puerperio/nuevo?paciente_id=${pacienteId}`);
        }

        if (!riesgo25) {
          setShowPuerperioModal(true);
        }
        return;
      }

      setForm(initialForm);
      await loadConsultas();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main
      className="min-h-screen relative text-white"
      style={{
        backgroundImage: "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(15,118,110,0.65)), url(/maro-hero.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-black/40 mix-blend-multiply" aria-hidden />

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* ENCABEZADO SUPERIOR */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase tracking-[0.2em] font-semibold text-emerald-300">
                Seguimiento Prenatal
              </span>
              {pacienteData.folio && (
                <span className="text-xs bg-white/10 border border-white/10 text-slate-200 px-2.5 py-0.5 rounded-full font-mono">
                  Folio: {pacienteData.folio}
                </span>
              )}
              {sdgActualCalculada && (
                <span className="text-xs bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <i className="fa-solid fa-person-pregnant text-emerald-300"></i>
                  <span>{sdgActualCalculada}</span>
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <i className="fa-solid fa-stethoscope text-emerald-400"></i>
              <span>Consultas y Seguimiento Clínico</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              {pacienteData.nombre_completo ? `Paciente: ${pacienteData.nombre_completo}` : "Captura y monitoreo de parámetros clínicos"}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              href={`/pacientes/${pacienteId}`}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition-colors"
            >
              <i className="fa-solid fa-user"></i>
              <span>Detalle de Paciente</span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition-colors"
            >
              <i className="fa-solid fa-table-columns"></i>
              <span>Dashboard</span>
            </Link>
          </div>
        </header>

        {error && (
          <div className="rounded-xl border border-rose-500/50 bg-rose-500/20 p-4 text-sm text-rose-200 flex items-center gap-3 animate-in fade-in">
            <i className="fa-solid fa-triangle-exclamation text-rose-400 text-lg"></i>
            <span>{error}</span>
          </div>
        )}

        {/* LAYOUT PRINCIPAL DE 2 COLUMNAS (8 / 4) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUMNA PRINCIPAL (8/12) - FORMULARIO E HISTORIAL */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* FORMULARIO DE NUEVA CONSULTA */}
            <section className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md p-6 space-y-5 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-file-medical text-emerald-400 text-lg"></i>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Registro de Nueva Consulta</h2>
                    <p className="text-xs text-slate-300">Captura de signos vitales, parámetros somáticos y triage de alarma</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* BLOQUE 1: SIGNOS VITALES Y SOMÁTICOS */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-2">
                    <i className="fa-solid fa-heart-pulse text-emerald-400"></i>
                    <span>1. Signos Vitales y Parámetros Somáticos</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Fecha de Consulta */}
                    <label className="space-y-1 text-xs">
                      <span className="text-slate-200 font-medium">Fecha de Consulta *</span>
                      <input
                        type="date"
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-xs focus:ring-2 focus:ring-emerald-500/50"
                        value={form.fecha_consulta}
                        onChange={(e) => handleChange("fecha_consulta", e.target.value)}
                        required
                      />
                    </label>

                    {/* T/A Sistólica */}
                    <label className="space-y-1 text-xs">
                      <span className="text-slate-200 font-medium">T/A Sistólica (mmHg)</span>
                      <input
                        type="number"
                        className={`w-full rounded-lg px-3 py-2 text-white text-xs transition-all ${
                          taSistolicaAlerta
                            ? "border-2 border-rose-400 bg-rose-500/25 ring-2 ring-rose-500/40"
                            : taSistolicaAdvertencia
                            ? "border-2 border-amber-400 bg-amber-500/25 ring-2 ring-amber-500/40"
                            : "border border-white/10 bg-white/5"
                        }`}
                        value={form.ta_sistolica}
                        onChange={(e) => handleChange("ta_sistolica", e.target.value)}
                        placeholder="Ej. 110"
                      />
                      {taSistolicaAlerta && (
                        <p className="text-[10px] text-rose-300 font-semibold">⚠️ T/A Sistólica Crítica</p>
                      )}
                    </label>

                    {/* T/A Diastólica */}
                    <label className="space-y-1 text-xs">
                      <span className="text-slate-200 font-medium">T/A Diastólica (mmHg)</span>
                      <input
                        type="number"
                        className={`w-full rounded-lg px-3 py-2 text-white text-xs transition-all ${
                          taDiastolicaAlerta
                            ? "border-2 border-rose-400 bg-rose-500/25 ring-2 ring-rose-500/40"
                            : taDiastolicaAdvertencia
                            ? "border-2 border-amber-400 bg-amber-500/25 ring-2 ring-amber-500/40"
                            : "border border-white/10 bg-white/5"
                        }`}
                        value={form.ta_diastolica}
                        onChange={(e) => handleChange("ta_diastolica", e.target.value)}
                        placeholder="Ej. 70"
                      />
                      {taDiastolicaAlerta && (
                        <p className="text-[10px] text-rose-300 font-semibold">⚠️ T/A Diastólica Crítica</p>
                      )}
                    </label>

                    {/* Frecuencia Cardíaca */}
                    <label className="space-y-1 text-xs">
                      <span className="text-slate-200 font-medium">FC (lpm)</span>
                      <input
                        type="number"
                        className={`w-full rounded-lg px-3 py-2 text-white text-xs transition-all ${
                          frecuenciaCardiacaAlerta
                            ? "border-2 border-rose-400 bg-rose-500/25 ring-2 ring-rose-500/40"
                            : "border border-white/10 bg-white/5"
                        }`}
                        value={form.frecuencia_cardiaca}
                        onChange={(e) => handleChange("frecuencia_cardiaca", e.target.value)}
                        placeholder="Ej. 80"
                      />
                      {frecuenciaCardiacaAlerta && (
                        <p className="text-[10px] text-rose-300 font-semibold">⚠️ FC fuera de rango</p>
                      )}
                    </label>

                    {/* Frecuencia Respiratoria */}
                    <label className="space-y-1 text-xs">
                      <span className="text-slate-200 font-medium">FR (rpm)</span>
                      <input
                        type="number"
                        className={`w-full rounded-lg px-3 py-2 text-white text-xs transition-all ${
                          frecuenciaRespiratoriaAlerta
                            ? "!bg-red-600 !border-red-400 border-2 font-bold ring-2 ring-red-500/50 shadow-lg shadow-red-950/50"
                            : "border border-white/10 bg-white/5"
                        }`}
                        value={form.frecuencia_respiratoria}
                        onChange={(e) => handleChange("frecuencia_respiratoria", e.target.value)}
                        placeholder="Ej. 18"
                      />
                      {frecuenciaRespiratoriaAlerta && (
                        <p className="text-[10px] text-red-400 font-bold">🚨 &lt; 16 o &gt; 20 FR = 4 Pts (Emergencia Obstétrica)</p>
                      )}
                    </label>

                    {/* Temperatura */}
                    <label className="space-y-1 text-xs">
                      <span className="text-slate-200 font-medium">Temperatura (°C)</span>
                      <input
                        type="number"
                        step="0.1"
                        className={`w-full rounded-lg px-3 py-2 text-white text-xs transition-all ${
                          temperaturaAlerta
                            ? "border-2 border-rose-400 bg-rose-500/25 ring-2 ring-rose-500/40"
                            : temperaturaAdvertencia
                            ? "border-2 border-amber-400 bg-amber-500/25 ring-2 ring-amber-500/40"
                            : "border border-white/10 bg-white/5"
                        }`}
                        value={form.temperatura}
                        onChange={(e) => handleChange("temperatura", e.target.value)}
                        placeholder="Ej. 36.5"
                      />
                      {temperaturaAlerta && (
                        <p className="text-[10px] text-rose-300 font-semibold">⚠️ Temperatura Crítica</p>
                      )}
                    </label>

                    {/* Índice de Choque */}
                    <label className="space-y-1 text-xs">
                      <span className="text-slate-200 font-medium">Índice Choque (FC/TAS)</span>
                      <input
                        type="number"
                        step="0.01"
                        className={`w-full rounded-lg px-3 py-2 text-white text-xs transition-all ${
                          indiceChoqueAlerta
                            ? "border-2 border-rose-400 bg-rose-500/25 ring-2 ring-rose-500/40 font-bold"
                            : indiceChoqueAdvertencia
                            ? "border-2 border-amber-400 bg-amber-500/25 ring-2 ring-amber-500/40 font-bold"
                            : "border border-white/10 bg-white/5"
                        }`}
                        value={form.indice_choque}
                        onChange={(e) => handleChange("indice_choque", e.target.value)}
                        placeholder="Auto o manual"
                      />
                      {indiceChoqueAlerta && (
                        <p className="text-[10px] text-rose-300 font-semibold">⚠️ Choque &gt; 0.8 (+4 pts)</p>
                      )}
                    </label>

                    {/* Mini Switches de Parámetros en la línea de abajo */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1.5 sm:col-span-2 lg:col-span-4">
                      <button
                        type="button"
                        onClick={() => handleChange("fondo_uterino_acorde_sdg", !form.fondo_uterino_acorde_sdg)}
                        className={`group flex items-center gap-3 h-10 rounded-xl px-3.5 text-xs font-medium transition-all duration-150 border cursor-pointer ${
                          form.fondo_uterino_acorde_sdg
                            ? "bg-rose-500/20 border-rose-400/60 text-white shadow-sm ring-1 ring-rose-400/30"
                            : "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        <div
                          className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
                            form.fondo_uterino_acorde_sdg
                              ? "bg-rose-500 shadow-sm shadow-rose-500/40"
                              : "bg-white/15 border border-white/20 group-hover:bg-white/25 group-hover:border-white/30"
                          }`}
                        >
                          <div
                            className={`w-3 h-3 rounded-full shadow-sm transform transition-transform duration-200 ${
                              form.fondo_uterino_acorde_sdg ? "translate-x-3 bg-white" : "translate-x-0 bg-white/70 group-hover:bg-white"
                            }`}
                          />
                        </div>
                        <i className={`fa-solid fa-ruler-vertical text-sm ${form.fondo_uterino_acorde_sdg ? "text-rose-300" : "text-slate-400"}`}></i>
                        <span className="font-semibold">Fondo uterino no acorde a SDG (+4 pts)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleChange("ivu_repeticion", !form.ivu_repeticion)}
                        className={`group flex flex-col gap-1.5 min-h-[40px] rounded-xl p-2.5 text-xs font-medium transition-all duration-150 border cursor-pointer ${
                          form.ivu_repeticion
                            ? "!bg-red-600 !border-red-400 border-2 text-white font-bold ring-2 ring-red-500/50 shadow-lg shadow-red-950/50"
                            : "bg-white/5 border-white/10 text-slate-200 hover:bg-white/10 hover:border-white/20 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-3 w-full">
                          <div
                            className={`w-7 h-4 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0 ${
                              form.ivu_repeticion
                                ? "bg-white shadow-sm shadow-black/40"
                                : "bg-white/15 border border-white/20 group-hover:bg-white/25 group-hover:border-white/30"
                            }`}
                          >
                            <div
                              className={`w-3 h-3 rounded-full shadow-sm transform transition-transform duration-200 ${
                                form.ivu_repeticion ? "translate-x-3 bg-red-600" : "translate-x-0 bg-white/70 group-hover:bg-white"
                              }`}
                            />
                          </div>
                          <i className={`fa-solid fa-bacteria text-sm ${form.ivu_repeticion ? "text-white" : "text-slate-400"}`}></i>
                          <span className="font-semibold flex-1 text-left">
                            IVU o Cervicovaginitis de repetición (+15 pts)
                          </span>
                        </div>
                        {form.ivu_repeticion && (
                          <div className="w-full text-left text-[11px] text-white font-normal bg-red-700/80 p-2 rounded-lg border border-red-300/40 leading-snug">
                            ⚠️ (Envio inmediato a Segundo Nivel de Atencion con urocultivo, cultivo vaginal con antibiograma, Riesgo de parto pretermino)
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* BLOQUE 2: TRIAGE OBSTÉTRICO (SIGNOS DE ALARMA MARO) */}
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                    <i className="fa-solid fa-triangle-exclamation text-amber-400"></i>
                    <span>2. Triage Obstétrico (Signos de Alarma)</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Estado de Conciencia */}
                    <label className="space-y-1 text-xs">
                      <span className="text-slate-200 font-medium">Estado de Conciencia</span>
                      <select
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-xs focus:ring-2 focus:ring-emerald-500/50"
                        value={form.estado_conciencia}
                        onChange={(e) => handleChange("estado_conciencia", e.target.value)}
                      >
                        <option value="" className="bg-slate-900">Seleccione</option>
                        <option value="conciente" className="bg-slate-900">Consciente</option>
                        <option value="alteraciones" className="bg-slate-900 text-amber-300 font-semibold">Alteraciones</option>
                      </select>
                    </label>

                    {/* Hemorragia */}
                    <label className="space-y-1 text-xs">
                      <span className="text-slate-200 font-medium">Hemorragia</span>
                      <select
                        className={`w-full rounded-lg px-3 py-2 text-xs transition-all ${
                          form.hemorragia === "visible o abundante"
                            ? "!bg-red-600 !border-red-400 border-2 text-white font-bold ring-2 ring-red-500/50 shadow-lg shadow-red-950/50"
                            : form.hemorragia === "no visible o moderada" || form.hemorragia === "no visible o escasa"
                            ? "border-2 border-amber-400 bg-amber-500/25 text-amber-100 font-semibold ring-2 ring-amber-500/30"
                            : "bg-white/5 border border-white/10 text-white"
                        }`}
                        value={form.hemorragia}
                        onChange={(e) => handleChange("hemorragia", e.target.value)}
                      >
                        <option value="" className="bg-slate-900 text-white font-normal">Seleccione</option>
                        <option value="sin hemorragia" className="bg-slate-900 text-white font-normal">Sin hemorragia</option>
                        <option value="visible o abundante" className="bg-red-600 text-white font-bold">Visible o abundante (Emergencia)</option>
                        <option value="no visible o moderada" className="bg-slate-900 text-white font-normal">No visible o moderada</option>
                        <option value="no visible o escasa" className="bg-slate-900 text-white font-normal">No visible o escasa</option>
                      </select>
                      {form.hemorragia === "visible o abundante" && (
                        <p className="text-[10px] text-red-400 font-bold">🚨 ¡Emergencia Obstétrica Activa!</p>
                      )}
                    </label>

                    {/* Respiración */}
                    <label className="space-y-1 text-xs">
                      <span className="text-slate-200 font-medium">Respiración</span>
                      <select
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-xs focus:ring-2 focus:ring-emerald-500/50"
                        value={form.respiracion}
                        onChange={(e) => handleChange("respiracion", e.target.value)}
                      >
                        <option value="" className="bg-slate-900">Seleccione</option>
                        <option value="normal" className="bg-slate-900">Normal</option>
                        <option value="alterada" className="bg-slate-900 text-amber-300 font-semibold">Alterada</option>
                      </select>
                    </label>

                    {/* Color de Piel */}
                    <label className="space-y-1 text-xs">
                      <span className="text-slate-200 font-medium">Color de Piel</span>
                      <select
                        className={`w-full rounded-lg px-3 py-2 text-xs transition-all ${
                          form.color_piel === "cianotica"
                            ? "!bg-red-600 !border-red-400 border-2 text-white font-bold ring-2 ring-red-500/50 shadow-lg shadow-red-950/50"
                            : form.color_piel === "palida"
                            ? "border-2 border-amber-400 bg-amber-500/25 text-amber-100 font-semibold ring-2 ring-amber-500/30"
                            : "bg-white/5 border border-white/10 text-white"
                        }`}
                        value={form.color_piel}
                        onChange={(e) => handleChange("color_piel", e.target.value)}
                      >
                        <option value="" className="bg-slate-900 text-white font-normal">Seleccione</option>
                        <option value="normal" className="bg-slate-900 text-white font-normal">Normal</option>
                        <option value="palida" className="bg-slate-900 text-amber-200">Pálida</option>
                        <option value="cianotica" className="bg-red-600 text-white font-bold">Cianótica (+4 pts)</option>
                      </select>
                      {form.color_piel === "cianotica" && (
                        <p className="text-[10px] text-red-400 font-bold">🚨 ¡Cianótica! (+4 pts - Emergencia)</p>
                      )}
                    </label>
                  </div>
                </div>

                {/* BLOQUE 3: DIAGNÓSTICO, PLAN Y REFERENCIA */}
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                    <i className="fa-solid fa-clipboard-user text-cyan-400"></i>
                    <span>3. Diagnóstico, Plan y Referencia</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Diagnóstico */}
                    <label className="space-y-1 text-xs">
                      <span className="text-slate-200 font-medium">Diagnóstico</span>
                      <select
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-xs focus:ring-2 focus:ring-cyan-500/50"
                        value={form.diagnostico}
                        onChange={(e) => handleChange("diagnostico", e.target.value)}
                      >
                        <option value="" className="bg-slate-900">Seleccione un diagnóstico</option>
                        <option value="seguimiento_embarazo" className="bg-slate-900">Seguimiento de embarazo</option>
                        <option value="puerperio" className="bg-slate-900 font-semibold text-purple-300">Puerperio (Requiere formulario específico)</option>
                      </select>
                    </label>

                    {/* Fecha de Referencia */}
                    <label className="space-y-1 text-xs">
                      <span className="text-slate-200 font-medium">Fecha de referencia a 2º o 3º nivel</span>
                      <input
                        type="date"
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-xs focus:ring-2 focus:ring-cyan-500/50"
                        value={form.fecha_referencia}
                        onChange={(e) => handleChange("fecha_referencia", e.target.value)}
                      />
                    </label>

                    {/* Área de Referencia */}
                    <label className="space-y-1 text-xs">
                      <span className="text-slate-200 font-medium">Área o Especialidad de referencia</span>
                      <input
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-xs focus:ring-2 focus:ring-cyan-500/50"
                        value={form.area_referencia}
                        onChange={(e) => handleChange("area_referencia", e.target.value)}
                        placeholder="Ej. Gineco-obstetricia / Medicina Materno-Fetal"
                      />
                    </label>

                    {/* Plan de manejo */}
                    <label className="space-y-1 text-xs">
                      <span className="text-slate-200 font-medium">Plan de Manejo</span>
                      <textarea
                        rows={2}
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-xs focus:ring-2 focus:ring-cyan-500/50"
                        value={form.plan}
                        onChange={(e) => handleChange("plan", e.target.value)}
                        placeholder="Indicaciones terapéuticas, fármacos, citas..."
                      />
                    </label>

                    {/* Notas adicionales */}
                    <label className="space-y-1 text-xs sm:col-span-2">
                      <span className="text-slate-200 font-medium">Notas clínicas adicionales</span>
                      <textarea
                        rows={2}
                        className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white text-xs focus:ring-2 focus:ring-cyan-500/50"
                        value={form.notas}
                        onChange={(e) => handleChange("notas", e.target.value)}
                        placeholder="Observaciones de enfermería o evolución médica..."
                      />
                    </label>
                  </div>
                </div>

                {/* BOTONES DE ACCIÓN */}
                <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-6 py-2.5 text-sm font-bold text-slate-950 transition-all shadow-lg shadow-emerald-950/40 cursor-pointer disabled:opacity-60"
                    disabled={saving}
                  >
                    <i className="fa-solid fa-floppy-disk"></i>
                    <span>{saving ? "Guardando consulta..." : "Guardar Consulta"}</span>
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 hover:bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-all cursor-pointer"
                    onClick={() => setForm(initialForm)}
                  >
                    <i className="fa-solid fa-rotate-left"></i>
                    <span>Limpiar</span>
                  </button>
                </div>

              </form>
            </section>

            {/* HISTORIAL DE CONSULTAS PREVIAS */}
            <section className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center shrink-0">
                    <i className="fa-solid fa-clock-rotate-left text-cyan-300"></i>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Historial de Consultas</h2>
                    <p className="text-xs text-slate-300">Evolución cronológica de la paciente</p>
                  </div>
                </div>
                <span className="text-xs text-emerald-200 bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 rounded-full font-bold">
                  {consultas.length} consulta(s) registrada(s)
                </span>
              </div>

              {loading ? (
                <div className="py-8 text-center text-slate-300 text-sm flex items-center justify-center gap-2">
                  <i className="fa-solid fa-spinner fa-spin text-emerald-400"></i>
                  <span>Cargando consultas...</span>
                </div>
              ) : consultas.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs italic bg-white/5 rounded-xl border border-white/5">
                  Aún no hay consultas registradas para esta paciente.
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto rounded-xl border border-white/10">
                  <table className="min-w-full text-xs text-left">
                    <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10 border-b border-white/10 text-slate-300">
                      <tr>
                        <th className="py-2.5 px-3">Fecha</th>
                        <th className="py-2.5 px-3">SDG</th>
                        <th className="py-2.5 px-3">T/A</th>
                        <th className="py-2.5 px-3">FC</th>
                        <th className="py-2.5 px-3">FR</th>
                        <th className="py-2.5 px-3">Temp</th>
                        <th className="py-2.5 px-3">Choque</th>
                        <th className="py-2.5 px-3">Puntaje Total</th>
                        <th className="py-2.5 px-3">Hemorragia</th>
                        <th className="py-2.5 px-3">Color</th>
                        <th className="py-2.5 px-3">Diagnóstico</th>
                        <th className="py-2.5 px-3">Plan / Notas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {consultas.map((c) => {
                        const totalScore = c.puntaje_total_consulta ?? 0;
                        return (
                          <tr key={c.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-2 px-3 text-white font-medium whitespace-nowrap">{formatDate(c.fecha_consulta)}</td>
                            <td className="py-2 px-3 text-white font-bold">{c.sdg != null ? `${c.sdg} sem` : "—"}</td>
                            <td className="py-2 px-3 text-slate-200 whitespace-nowrap">
                              {c.ta_sistolica ?? "—"}/{c.ta_diastolica ?? "—"}
                            </td>
                            <td className="py-2 px-3 text-slate-200">{c.frecuencia_cardiaca ?? "—"}</td>
                            <td className="py-2 px-3 text-slate-200">{c.frecuencia_respiratoria ?? "—"}</td>
                            <td className="py-2 px-3 text-slate-200">{c.temperatura != null ? `${c.temperatura}°C` : "—"}</td>
                            <td className="py-2 px-3 text-slate-200">{c.indice_choque ?? "—"}</td>
                            <td className="py-2 px-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                                totalScore >= 25
                                  ? "bg-rose-500/25 text-rose-200 border border-rose-400/40"
                                  : totalScore >= 10
                                  ? "bg-orange-500/25 text-orange-200 border border-orange-400/40"
                                  : totalScore >= 4
                                  ? "bg-amber-500/25 text-amber-200 border border-amber-400/40"
                                  : "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40"
                              }`}>
                                {totalScore} pts
                              </span>
                            </td>
                            <td className="py-2 px-3 text-slate-300 max-w-[120px] truncate">{c.hemorragia || "—"}</td>
                            <td className="py-2 px-3 text-slate-300">{c.color_piel || "—"}</td>
                            <td className="py-2 px-3 text-slate-300 whitespace-nowrap">{formatDiagnostico(c.diagnostico)}</td>
                            <td className="py-2 px-3 text-slate-300 max-w-[160px] truncate" title={c.plan || c.notas || ""}>
                              {c.plan || c.notas || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

          </div>

          {/* COLUMNA LATERAL STICKY (4/12) - SEMÁFORO EN TIEMPO REAL Y HALLAZGOS */}
          <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-6">
            
            {/* SEMÁFORO DE RIESGO TOTAL COMBINADO EN TIEMPO REAL */}
            <div className={`rounded-2xl border-2 p-5 shadow-2xl backdrop-blur-md transition-all duration-200 ${
              puntajeRiesgoTotal >= 25
                ? 'bg-rose-500/20 border-rose-500/70 shadow-rose-950/40'
                : puntajeRiesgoTotal >= 10
                ? 'bg-orange-500/20 border-orange-400/70 shadow-orange-950/40'
                : puntajeRiesgoTotal >= 4
                ? 'bg-amber-500/20 border-amber-400/70 shadow-amber-950/40'
                : 'bg-emerald-500/20 border-emerald-400/70 shadow-emerald-950/40'
            }`}>
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
                  Semáforo de Riesgo en Vivo
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-black tracking-wider ${
                  puntajeRiesgoTotal >= 25
                    ? 'bg-rose-500 text-white animate-pulse'
                    : puntajeRiesgoTotal >= 10
                    ? 'bg-orange-500 text-slate-950'
                    : puntajeRiesgoTotal >= 4
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-emerald-400 text-slate-950'
                }`}>
                  {puntajeRiesgoTotal >= 25 ? 'CRÍTICO' :
                   puntajeRiesgoTotal >= 10 ? 'MUY ALTO' :
                   puntajeRiesgoTotal >= 4 ? 'ALTO' : 'BAJO'}
                </span>
              </div>

              <div className="pt-3 flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-slate-300 block font-medium">Puntaje Total MARO</span>
                  <div className="flex items-baseline gap-1.5 mt-0.5">
                    <span className="text-4xl font-black text-white">{puntajeRiesgoTotal}</span>
                    <span className="text-xs font-semibold text-slate-300">puntos</span>
                  </div>
                </div>

                <div className="text-right space-y-1 text-xs">
                  <div className="text-slate-300">
                    Antecedentes: <strong className="text-white">{pacienteData.factor_riesgo_antecedentes || 0} pts</strong>
                  </div>
                  <div className="text-slate-300">
                    Tamizajes: <strong className="text-white">{pacienteData.factor_riesgo_tamizajes || 0} pts</strong>
                  </div>
                  <div className="text-slate-300">
                    Cita Actual: <strong className="text-emerald-300">+{puntajeConsultaParametros} pts</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* HALLAZGOS ACTIVOS EN LA CAPTURA */}
            <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md p-5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-list-check text-cyan-400 text-sm"></i>
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Hallazgos en Consulta</span>
                </div>
                <span className="text-xs font-bold text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded-md">
                  +{puntajeConsultaParametros} pts
                </span>
              </div>

              {hallazgosConsulta.length > 0 ? (
                <div className="space-y-2 pt-1">
                  {hallazgosConsulta.map((h, i) => (
                    <div key={i} className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl p-2.5 text-xs">
                      <div>
                        <span className="text-white font-semibold block">{h.campo}</span>
                        <span className="text-[10px] text-slate-300 block">{h.criterio}</span>
                      </div>
                      <span className="font-extrabold text-amber-300 text-sm">+{h.puntos} pts</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/20 p-3 text-xs text-emerald-200 text-center flex items-center justify-center gap-2">
                  <i className="fa-solid fa-circle-check text-emerald-400"></i>
                  <span>Sin hallazgos de riesgo en los parámetros capturados</span>
                </div>
              )}
            </div>

              {/* ALERTA DE IVU O CERVICOVAGINITIS DE REPETICIÓN */}
              {form.ivu_repeticion && (
                <div className="rounded-2xl border-2 border-red-400 bg-red-600/30 backdrop-blur-md p-4 space-y-2.5 shadow-xl animate-in fade-in duration-200">
                  <div className="flex items-center justify-between gap-2 border-b border-red-300/20 pb-2">
                    <div className="flex items-center gap-2 text-white font-extrabold text-xs uppercase tracking-wider">
                      <i className="fa-solid fa-triangle-exclamation text-red-300 text-sm animate-pulse"></i>
                      <span>Alerta: IVU de Repetición</span>
                    </div>
                    <span className="text-xs font-black bg-red-500 text-white px-2 py-0.5 rounded-full border border-red-300/40">
                      +15 pts
                    </span>
                  </div>
                  <p className="text-xs font-bold text-red-100 leading-snug">
                    Envío inmediato a Segundo Nivel de Atención con urocultivo, cultivo vaginal con antibiograma.
                  </p>
                  <div className="text-[11px] text-red-200/90 font-medium bg-red-950/40 p-2 rounded-lg border border-red-400/30 flex items-center gap-2">
                    <i className="fa-solid fa-person-pregnant text-red-300"></i>
                    <span>Alto riesgo de parto pretérmino asociado.</span>
                  </div>
                </div>
              )}

              {/* ALERTA DE ESCALAMIENTO / RIESGO MAYOR */}
            {(tieneEscalamientoForzado || puntajeRiesgoTotal >= 25) && (
              <div className="rounded-2xl border-2 border-rose-400/80 bg-rose-500/25 p-4 space-y-2.5 shadow-xl animate-in fade-in duration-200">
                <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wider">
                  <i className="fa-solid fa-triangle-exclamation text-rose-400 text-sm"></i>
                  <span>Aviso de Escalamiento Estatal</span>
                </div>
                <p className="text-xs font-semibold text-rose-100 leading-snug">
                  {puntajeRiesgoTotal >= 25 
                    ? "Puntaje total ≥ 25 puntos. Al guardar esta consulta, el caso pasará automáticamente a nivel estatal para determinación colegiada."
                    : "Paciente con antecedentes mayores de alto riesgo. Notificación automática activa."
                  }
                </p>
                {criteriosEscalamientoActivos.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {criteriosEscalamientoActivos.map((crit, idx) => (
                      <span key={idx} className="text-[10px] bg-rose-400/20 border border-rose-300/40 text-rose-200 font-medium px-2 py-0.5 rounded-full">
                        {crit}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* RESUMEN DE PERFIL DE LA PACIENTE */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 space-y-3 shadow-xl text-xs">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block border-b border-white/10 pb-2">
                Datos Clínicos del Expediente
              </span>
              <div className="grid grid-cols-2 gap-2 text-slate-300">
                <div className="bg-white/5 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">FUM</span>
                  <span className="font-semibold text-white">{formatDate(pacienteData.fum)}</span>
                </div>
                <div className="bg-white/5 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">FPP</span>
                  <span className="font-semibold text-white">{formatDate(pacienteData.fpp)}</span>
                </div>
                <div className="bg-white/5 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">SDG Ingreso</span>
                  <span className="font-semibold text-white">{pacienteData.sdg_ingreso != null ? `${pacienteData.sdg_ingreso} sem` : "—"}</span>
                </div>
                <div className="bg-white/5 p-2 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">IMC Inicial</span>
                  <span className="font-semibold text-white">{pacienteData.imc_inicial ? `${pacienteData.imc_inicial} kg/m²` : "—"}</span>
                </div>
              </div>
            </div>

          </aside>

        </div>
      </div>

      {/* MODAL DE CONFIRMACIÓN PARA PUERPERIO */}
      {showPuerperioModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-purple-900/95 to-purple-800/95 backdrop-blur-lg border border-purple-300/30 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-purple-400/20 flex items-center justify-center text-purple-200 text-2xl">
                🤰
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Diagnóstico: Puerperio</h3>
                <p className="text-sm text-purple-100/80">Captura adicional requerida</p>
              </div>
            </div>
            
            <div className="bg-purple-950/30 border border-purple-300/20 rounded-lg p-4">
              <p className="text-white/90 text-sm leading-relaxed">
                Has registrado un diagnóstico de <strong className="text-purple-200">Puerperio</strong>. 
                Serás redirigido a un formulario específico para capturar los datos adicionales 
                requeridos para el seguimiento de puerperio.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setShowPuerperioModal(false);
                  setPendingPuerperioRedirect(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (pendingPuerperioRedirect) {
                    router.push(pendingPuerperioRedirect);
                  }
                }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-medium shadow-lg shadow-purple-500/30 transition-colors"
              >
                Continuar →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE GUARDADO */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-emerald-300/30 bg-slate-900/95 shadow-2xl">
            <div className="border-b border-white/10 px-6 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/85">Confirmación</p>
              <h3 className="mt-1 text-xl font-semibold text-white">¿Guardar esta consulta prenatal?</h3>
              <p className="mt-1 text-sm text-slate-300/80">
                Revisa los datos clave antes de continuar.
              </p>
            </div>

            <div className="px-6 py-4">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-slate-400 text-xs uppercase tracking-wide">Folio</dt>
                  <dd className="text-white mt-0.5">{pacienteData.folio || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-xs uppercase tracking-wide">Fecha consulta</dt>
                  <dd className="text-white mt-0.5">{form.fecha_consulta || "No capturada"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-xs uppercase tracking-wide">T/A</dt>
                  <dd className="text-white mt-0.5">{form.ta_sistolica || "—"}/{form.ta_diastolica || "—"} mmHg</dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-xs uppercase tracking-wide">Frecuencia cardiaca</dt>
                  <dd className="text-white mt-0.5">{form.frecuencia_cardiaca || "—"} lpm</dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-xs uppercase tracking-wide">Índice choque</dt>
                  <dd className="text-white mt-0.5">{form.indice_choque || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-xs uppercase tracking-wide">Temperatura</dt>
                  <dd className="text-white mt-0.5">{form.temperatura || "—"} °C</dd>
                </div>
                <div className="col-span-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2">
                  <dt className="text-amber-200 text-xs uppercase tracking-wide">Riesgo MARO estimado</dt>
                  <dd className="text-amber-100 mt-0.5">
                    Total estimado: <strong>{puntajeRiesgoTotal}</strong> puntos
                    {puntajeRiesgoTotal >= 25 ? " (posible alerta estatal)" : ""}
                  </dd>
                </div>
                {tieneEscalamientoForzado && (
                  <div className="col-span-2 rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2">
                    <dt className="text-red-200 text-xs uppercase tracking-wide">Advertencia de escalamiento</dt>
                    <dd className="text-red-100 mt-0.5">
                      Criterios activos: <strong>{criteriosEscalamientoActivos.join(", ")}</strong>. Este caso será enviado a nivel estatal al guardar la consulta.
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="flex gap-3 border-t border-white/10 px-6 py-4">
              <button
                type="button"
                onClick={executeSave}
                className="flex-1 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-400"
                disabled={saving}
              >
                {saving ? "Guardando..." : "Guardar consulta"}
              </button>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 rounded-lg border border-white/20 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
                disabled={saving}
              >
                Revisar captura
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE ALERTA DE RIESGO ALTO PARA ESCALAMIENTO ESTATAL */}
      {alertaRiesgoEstatal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-2xl border-2 border-red-400/70 bg-gradient-to-br from-red-900/95 to-red-800/95 p-6 shadow-2xl shadow-red-900/70" role="alert" aria-live="assertive">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-red-500 text-white text-2xl animate-pulse">!</span>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-red-100/90">Alerta prioritaria</p>
                  <h3 className="text-xl font-bold text-white">Escalamiento automático a nivel estatal</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAlertaRiesgoEstatal(null)}
                className="rounded-lg border border-white/25 px-3 py-1.5 text-sm font-semibold text-white hover:bg-white/10"
              >
                Cerrar
              </button>
            </div>

            <p className="mt-4 text-base font-semibold text-red-50 leading-relaxed">
              {alertaRiesgoEstatal}
            </p>

            {tieneEscalamientoForzado && (
              <div className="mt-3 rounded-lg border border-red-300/35 bg-red-950/35 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.18em] text-red-100/80">Criterios activos</p>
                <p className="mt-1 text-sm text-red-50">
                  {criteriosEscalamientoActivos.join(", ")}
                </p>
              </div>
            )}

            <p className="mt-3 text-sm text-red-100/85">
              Por favor, contacte al equipo regional de salud correspondiente para seguimiento.
            </p>

            <p className="mt-4 text-xs text-red-100/70">
              Este aviso se cerrará automáticamente en 12 segundos.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
