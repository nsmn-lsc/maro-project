// app/coordinacion/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CasoEstatal,
  Decision,
  IntervencionEstatal,
  PlanAccion,
  PlanReferencia,
  ResumenMARO,
  calcTiempoMin,
  evaluarCongruenciaMARO,
  evaluarRiesgoMARO,
  generarFolio,
  nowISO,
  obtenerCasosDemo,
  persistencia,
  reglasBloqueoCierre,
} from "@/lib/maroEngine";

/* =========================
   UI helpers (sin dependencias)
========================= */
function Badge({
  tone,
  children,
}: {
  tone: "rojo" | "naranja" | "gris" | "verde" | "amarillo";
  children: React.ReactNode;
}) {
  const cls =
    tone === "rojo"
      ? "bg-red-600 text-white"
      : tone === "naranja"
      ? "bg-orange-500 text-white"
      : tone === "verde"
      ? "bg-emerald-600 text-white"
      : tone === "amarillo"
      ? "bg-yellow-400 text-black"
      : "bg-slate-200 text-slate-800";
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-1 text-xs font-semibold ${cls}`}
    >
      {children}
    </span>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  tone = "primary",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "primary" | "danger" | "ghost";
}) {
  const base = "rounded px-3 py-2 text-sm font-semibold transition border";
  const cls =
    tone === "danger"
      ? "bg-red-600 text-white border-red-700 hover:bg-red-700"
      : tone === "ghost"
      ? "bg-white text-slate-800 border-slate-300 hover:bg-slate-50"
      : "bg-slate-900 text-white border-slate-900 hover:bg-slate-800";
  return (
    <button
      className={`${base} ${cls} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-xs font-semibold text-slate-600">{label}</div>
      <div className="text-sm text-slate-900">{value}</div>
    </div>
  );
}

function Section({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-bold text-slate-900">{title}</div>
        {right}
      </div>
      {children}
    </div>
  );
}

/* =========================
   Página Coordinación Estatal (MARO)
========================= */
export default function CoordinacionEstatalMAROPage() {
  const router = useRouter();
  const [casos, setCasos] = useState<CasoEstatal[]>([]);
  const [selectedFolio, setSelectedFolio] = useState<string | null>(null);
  const [umbralMin, setUmbralMin] = useState<number>(120);
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
        router.replace((session.nivel ?? 0) >= 2 ? "/region" : "/dashboard");
        return;
      }
      setAuthChecked(true);
    } catch {
      router.replace("/inicial");
    }
  }, [router]);

  // Carga inicial (localStorage -> demo)
  useEffect(() => {
    if (!authChecked) return;
    const loaded = persistencia.load();
    if (loaded.length > 0) {
      setCasos(loaded);
      setSelectedFolio(loaded[0]?.folio ?? null);
      return;
    }
    const seed = obtenerCasosDemo();
    setCasos(seed);
    setSelectedFolio(seed[0]?.folio ?? null);
    persistencia.save(seed);
  }, [authChecked]);

  // Persistencia
  useEffect(() => {
    persistencia.save(casos);
  }, [casos]);

  const selected = useMemo(
    () => casos.find((c) => c.folio === selectedFolio) ?? null,
    [casos, selectedFolio]
  );

  const bandeja = useMemo(() => {
    const now = nowISO();
    const enriched = casos.map((c) => {
      const tiempo = calcTiempoMin(c.created_at, now);
      const riesgo = evaluarRiesgoMARO(c.resumen);
      const congr = evaluarCongruenciaMARO(c.resumen, c);
      const banderaIncongruencia = congr.resultado === "INCONGRUENTE";
      const demora = tiempo > umbralMin;

      return {
        ...c,
        _tiempo: tiempo,
        _riesgo: riesgo,
        _congruencia: congr,
        _banderaIncongruencia: banderaIncongruencia,
        _demora: demora,
      };
    });

    enriched.sort((a, b) => {
      const pr = (x: string) => (x === "ROJO" ? 2 : x === "NARANJA" ? 1 : 0);
      const d = pr(b._riesgo) - pr(a._riesgo);
      if (d !== 0) return d;
      return b._tiempo - a._tiempo;
    });

    return enriched;
  }, [casos, umbralMin]);

  const contadores = useMemo(() => {
    let rojos = 0,
      naranjas = 0,
      alertas = 0;
    for (const c of bandeja) {
      if (c._riesgo === "ROJO") rojos++;
      if (c._riesgo === "NARANJA") naranjas++;
      if (c._banderaIncongruencia || c._demora) alertas++;
    }
    return { total: bandeja.length, rojos, naranjas, alertas };
  }, [bandeja]);

  function upsertCaso(next: CasoEstatal) {
    setCasos((prev) => prev.map((p) => (p.folio === next.folio ? next : p)));
  }

  function crearCasoNuevoDemo() {
    const folio = generarFolio("EST");
    const nuevo: CasoEstatal = {
      folio,
      unidad_origen: "UMF Demo",
      region: "Región Demo",
      nivel_actual: 1,
      created_at: nowISO(),
      estado: "SIN_CIERRE",
      resumen: {
        edad: 28,
        edad_gestacional: 22,
        imc: null,
        antecedentes_clave: ["Sin datos capturados"],
        signos_vitales: { ta: "140/90", fc: 96 },
        factores_riesgo: ["HTA + embarazo (sin precisar)", "IMC no capturado"],
      } as ResumenMARO,
      diagnosticos: ["Hipertensión + embarazo"],
      estudios_realizados: [],
      timeline: [
        { nivel: "PRIMER", decision: "Captura inicial", fecha: nowISO(), responsable: "UMF Demo" },
      ],
      estatal: { responsable_estatal: "Coordinación Estatal", intervenciones: [] },
    };

    setCasos((prev) => [nuevo, ...prev]);
    setSelectedFolio(folio);
  }

  // Estado derivado del seleccionado
  const selectedDerived = useMemo(() => {
    if (!selected) return null;

    const riesgo = evaluarRiesgoMARO(selected.resumen);
    const congr = evaluarCongruenciaMARO(selected.resumen, selected);
    const tiempo = calcTiempoMin(selected.created_at, nowISO());
    const bloqueo = reglasBloqueoCierre(riesgo, congr, selected);

    const habilitarInterv =
      riesgo === "ROJO" && (congr.resultado !== "OK" || tiempo > umbralMin);

    // decisión regional visible (lo acordado)
    const decisionRegional =
      selected.timeline.find((t: any) => String(t.nivel).toUpperCase() === "REGIONAL")
        ?.decision ?? null;

    const hayFallaProceso = congr.resultado !== "OK";

    return {
      riesgo,
      congr,
      tiempo,
      bloqueo,
      habilitarInterv,
      decisionRegional,
      hayFallaProceso,
    };
  }, [selected, umbralMin]);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-700">
        Validando acceso...
      </div>
    );
  }

  function agregarIntervencion(tipo: IntervencionEstatal["tipo"]) {
    if (!selected || !selectedDerived) return;

    if (!selectedDerived.habilitarInterv) return;

    const responsableEstatal =
      selected.estatal?.responsable_estatal ?? "Coordinación Estatal";

    const nueva: Decision = {
      nivel: "ESTATAL",
      decision: `INTERVENCIÓN ESTATAL: ${tipo}`,
      fecha: nowISO(),
      responsable: responsableEstatal,
      observaciones: "",
    };

    const intervencion: IntervencionEstatal = {
      tipo,
      instrucciones:
        tipo === "COLEGIACION_CLINICA"
          ? "Convocar colegiación clínica inmediata: Gine/Ob, Anestesia, MI/Intensivo según disponibilidad. Definir conducta, estudios faltantes y destino."
          : tipo === "REVALORACION_INMEDIATA"
          ? "Revaloración inmediata en sitio. Subir nota clínica estructurada y actualizar diagnósticos congruentes con criterios."
          : tipo === "ESCALAMIENTO_REFERENCIA"
          ? "Escalar referencia: confirmar aceptación, registrar enlace, medio de traslado y hora. No demorar por trámites."
          : "Abrir observación sistémica: fallo de proceso. Registrar causa raíz preliminar y acciones correctivas.",
      responsable_estatal: responsableEstatal,
      fecha: nowISO(),
    };

    const next: CasoEstatal = {
      ...selected,
      timeline: [...selected.timeline, nueva],
      estatal: {
        responsable_estatal: responsableEstatal, // ✅ FIX TS: obligatorio string
        intervenciones: [...(selected.estatal?.intervenciones ?? []), intervencion],
      },
      estado: "ESCALADO",
    };

    upsertCaso(next);
  }

  function agregarPlanAccionLocal() {
    if (!selected) return;
    const next: CasoEstatal = {
      ...selected,
      plan_accion: {
        tipo: "LOCAL",
        estudios_solicitados: [
          "Curva tolerancia (si aplica)",
          "Proteinuria",
          "Perfil tiroideo (si IMC alto/HTA o sospecha)",
        ],
        fecha_revaloracion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        interconsulta_programada: true,
      } as PlanAccion,
    };
    upsertCaso(next);
  }

  function agregarPlanReferencia() {
    if (!selected) return;
    const next: CasoEstatal = {
      ...selected,
      plan_referencia: {
        hospital_receptor: "HG Regional (definir)",
        enlace: "Enlace Regional (definir)",
        medio_traslado: "AMBULANCIA",
        hora_aceptacion: nowISO(),
      } as PlanReferencia,
    };
    upsertCaso(next);
  }

  function cerrarCaso() {
    if (!selected || !selectedDerived) return;
    if (selectedDerived.bloqueo.bloqueado) return;

    const next: CasoEstatal = {
      ...selected,
      estado: "CERRADO",
      closed_at: nowISO(),
    };
    upsertCaso(next);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex flex-col">
            <div className="text-base font-extrabold text-slate-900">
              Coordinación Estatal – MARO
            </div>
            <div className="text-xs text-slate-600">
              Auditoría clínica, congruencia, planes de acción, intervención y trazabilidad.
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge tone="gris">Casos: {contadores.total}</Badge>
            <Badge tone="rojo">Rojos: {contadores.rojos}</Badge>
            <Badge tone="naranja">Naranjas: {contadores.naranjas}</Badge>
            <Badge tone="amarillo">Alertas: {contadores.alertas}</Badge>

            <div className="ml-3 flex items-center gap-2">
              <div className="text-xs font-semibold text-slate-600">Umbral (min)</div>
              <input
                className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
                type="number"
                value={umbralMin}
                onChange={(e) => setUmbralMin(Number(e.target.value || 0))}
                min={0}
              />
            </div>

            <div className="ml-2 flex items-center gap-2">
              <Btn tone="ghost" onClick={crearCasoNuevoDemo}>
                + Caso demo
              </Btn>
            </div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 px-4 py-4 md:grid-cols-12">
        {/* BANDEJA */}
        <div className="md:col-span-4">
          <Section title="Bandeja estatal">
            <div className="mb-3 text-xs text-slate-600">
              Orden por riesgo/tiempo. ⚠️ = incongruencia o demora.
            </div>

            <div className="max-h-[72vh] overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-100 text-xs font-bold text-slate-700">
                  <tr>
                    <th className="px-2 py-2">Riesgo</th>
                    <th className="px-2 py-2">Folio</th>
                    <th className="px-2 py-2">Origen</th>
                    <th className="px-2 py-2">Min</th>
                    <th className="px-2 py-2">⚠️</th>
                  </tr>
                </thead>
                <tbody>
                  {bandeja.map((c) => {
                    const isSel = c.folio === selectedFolio;
                    const rowCls = isSel
                      ? "bg-slate-900 text-white"
                      : c._demora
                      ? "bg-red-50"
                      : "bg-white";

                    return (
                      <tr
                        key={c.folio}
                        className={`cursor-pointer border-t border-slate-200 ${rowCls}`}
                        onClick={() => setSelectedFolio(c.folio)}
                      >
                        <td className="px-2 py-2">
                          {c._riesgo === "ROJO" ? (
                            <Badge tone="rojo">ROJO</Badge>
                          ) : c._riesgo === "NARANJA" ? (
                            <Badge tone="naranja">NARANJA</Badge>
                          ) : (
                            <Badge tone="gris">—</Badge>
                          )}
                        </td>
                        <td className="px-2 py-2 font-semibold">{c.folio}</td>
                        <td className="px-2 py-2">{c.unidad_origen}</td>
                        <td className="px-2 py-2">{c._tiempo}</td>
                        <td className="px-2 py-2">
                          {(c._banderaIncongruencia || c._demora) && (
                            <span className={`${isSel ? "text-yellow-200" : "text-red-700"} font-extrabold`}>
                              ⚠️
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {bandeja.length === 0 && (
                    <tr>
                      <td className="px-2 py-6 text-center text-slate-600" colSpan={5}>
                        Sin casos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Section>
        </div>

        {/* DETALLE */}
        <div className="md:col-span-8">
          {!selected || !selectedDerived ? (
            <Section title="Detalle de caso">
              <div className="text-sm text-slate-600">Selecciona un caso de la bandeja.</div>
            </Section>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Resumen */}
              <Section title="Resumen clínico MARO (solo lectura)">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <Field label="Folio" value={<span className="font-bold">{selected.folio}</span>} />
                  <Field label="Unidad origen" value={selected.unidad_origen} />
                  <Field label="Región" value={selected.region} />
                  <Field label="Nivel actual" value={<Badge tone="gris">{selected.nivel_actual}°</Badge>} />

                  <Field
                    label="Riesgo MARO (calculado)"
                    value={
                      selectedDerived.riesgo === "ROJO" ? (
                        <Badge tone="rojo">ROJO</Badge>
                      ) : (
                        <Badge tone="naranja">NARANJA</Badge>
                      )
                    }
                  />
                  <Field label="Tiempo desde alerta" value={<span className="font-semibold">{selectedDerived.tiempo} min</span>} />
                  <Field
                    label="Congruencia"
                    value={
                      selectedDerived.congr.resultado === "OK" ? (
                        <Badge tone="verde">OK</Badge>
                      ) : selectedDerived.congr.resultado === "INCOMPLETO" ? (
                        <Badge tone="amarillo">INCOMPLETO</Badge>
                      ) : (
                        <Badge tone="rojo">INCONGRUENTE</Badge>
                      )
                    }
                  />
                  <Field label="Estado" value={<Badge tone="gris">{selected.estado}</Badge>} />
                </div>

                {/* ✅ Lo acordado: decisión regional visible */}
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="text-xs font-bold text-slate-700">Decisión regional (última registrada)</div>
                  <div className="mt-1 text-sm text-slate-900">
                    {selectedDerived.decisionRegional ? (
                      <span className="font-semibold">{selectedDerived.decisionRegional}</span>
                    ) : (
                      <span className="font-semibold text-red-700">NO REGISTRADA</span>
                    )}
                  </div>
                </div>

                {/* ✅ Lo acordado: banner “posible falla” sin culpar */}
                {selectedDerived.hayFallaProceso && (
                  <div className="mt-3 rounded bg-red-50 px-3 py-2 text-xs font-semibold text-red-800 border border-red-200">
                    ⚠️ Posible falla de proceso detectada (origen por determinar).
                  </div>
                )}

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 text-xs font-bold text-slate-700">Datos clave</div>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Edad" value={`${selected.resumen.edad} años`} />
                      <Field label="EG" value={`${selected.resumen.edad_gestacional} sem`} />
                      <Field
                        label="IMC"
                        value={
                          selected.resumen.imc == null ? (
                            <span className="font-bold text-red-700">NO CAPTURADO</span>
                          ) : (
                            <span className="font-semibold">{selected.resumen.imc}</span>
                          )
                        }
                      />
                      <Field
                        label="SV"
                        value={`${selected.resumen.signos_vitales.ta} | FC ${selected.resumen.signos_vitales.fc}`}
                      />
                    </div>

                    {selected.resumen.imc == null && (
                      <div className="mt-3 rounded bg-red-100 px-3 py-2 text-xs font-semibold text-red-800">
                        ALERTA: IMC NO CAPTURADO – riesgo puede estar subestimado.
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 text-xs font-bold text-slate-700">Factores / Diagnósticos</div>
                    <div className="flex flex-wrap gap-2">
                      {(selected.resumen.factores_riesgo ?? []).map((f: string, i: number) => (
                        <Badge key={`fr-${i}`} tone="gris">
                          {f}
                        </Badge>
                      ))}
                      {(selected.diagnosticos ?? []).map((d: string, i: number) => (
                        <Badge key={`dx-${i}`} tone="gris">
                          {d}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Section>

              {/* Congruencia */}
              <Section title="Motor de congruencia clínica (anti-fallas)">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="mb-2 text-xs font-bold text-slate-700">Estudios realizados</div>
                    {(selected.estudios_realizados ?? []).length === 0 ? (
                      <div className="text-sm text-slate-600">Sin estudios registrados.</div>
                    ) : (
                      <ul className="list-disc pl-5 text-sm text-slate-800">
                        {selected.estudios_realizados.map((e: string, i: number) => (
                          <li key={`er-${i}`}>{e}</li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="mb-2 text-xs font-bold text-slate-700">
                      Faltantes obligatorios (según riesgo)
                    </div>

                    {(selectedDerived.congr.estudios_obligatorios_faltantes ?? []).length === 0 ? (
                      <div className="text-sm text-emerald-700 font-semibold">
                        Sin faltantes obligatorios detectados.
                      </div>
                    ) : (
                      <ul className="list-disc pl-5 text-sm text-red-800">
                        {selectedDerived.congr.estudios_obligatorios_faltantes.map((e: string, i: number) => (
                          <li key={`falt-${i}`}>{e}</li>
                        ))}
                      </ul>
                    )}

                    {(selectedDerived.congr.notas ?? []).length > 0 && (
                      <div className="mt-3 rounded bg-slate-50 px-3 py-2 text-xs text-slate-700 border border-slate-200">
                        {selectedDerived.congr.notas.map((n: string, i: number) => (
                          <div key={`nota-${i}`}>• {n}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Section>

              {/* Timeline */}
              <Section title="Trazabilidad (línea de tiempo)">
                <div className="space-y-2">
                  {(selected.timeline ?? []).map((d: any, i: number) => (
                    <div key={`tl-${i}`} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge tone="gris">{d.nivel}</Badge>
                          <div className="text-sm font-bold text-slate-900">{d.decision}</div>
                        </div>
                        <div className="text-xs text-slate-600">
                          {d.fecha ? new Date(d.fecha).toLocaleString() : ""}
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        Responsable:{" "}
                        <span className="font-semibold text-slate-800">{d.responsable}</span>
                      </div>
                      {d.observaciones && (
                        <div className="mt-2 text-sm text-slate-800">{d.observaciones}</div>
                      )}
                    </div>
                  ))}
                  {(selected.timeline ?? []).length === 0 && (
                    <div className="text-sm text-slate-600">Sin registros.</div>
                  )}
                </div>
              </Section>

              {/* Planes de acción */}
              <Section
                title="Planes de acción (apoyo operativo estatal)"
                right={
                  <div className="flex items-center gap-2">
                    <Btn tone="ghost" onClick={agregarPlanAccionLocal}>
                      Auto-crear plan local
                    </Btn>
                    <Btn tone="ghost" onClick={agregarPlanReferencia}>
                      Auto-crear referencia
                    </Btn>
                  </div>
                }
              >
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="mb-2 text-xs font-bold text-slate-700">Plan local</div>
                    {selected.plan_accion?.tipo === "LOCAL" ? (
                      <div className="space-y-2 text-sm text-slate-800">
                        <div>
                          <span className="font-semibold">Interconsulta:</span>{" "}
                          {selected.plan_accion.interconsulta_programada ? "Sí" : "No"}
                        </div>
                        <div>
                          <span className="font-semibold">Revaloración:</span>{" "}
                          {selected.plan_accion.fecha_revaloracion
                            ? new Date(selected.plan_accion.fecha_revaloracion).toLocaleString()
                            : "—"}
                        </div>
                        <div className="font-semibold">Estudios solicitados:</div>
                        <ul className="list-disc pl-5">
                          {(selected.plan_accion.estudios_solicitados ?? []).map((e: string, i: number) => (
                            <li key={`sol-${i}`}>{e}</li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-600">No hay plan local registrado.</div>
                    )}
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="mb-2 text-xs font-bold text-slate-700">Plan de referencia</div>
                    {selected.plan_referencia ? (
                      <div className="space-y-2 text-sm text-slate-800">
                        <div>
                          <span className="font-semibold">Receptor:</span>{" "}
                          {selected.plan_referencia.hospital_receptor}
                        </div>
                        <div>
                          <span className="font-semibold">Enlace:</span>{" "}
                          {selected.plan_referencia.enlace}
                        </div>
                        <div>
                          <span className="font-semibold">Traslado:</span>{" "}
                          {selected.plan_referencia.medio_traslado}
                        </div>
                        <div>
                          <span className="font-semibold">Aceptación:</span>{" "}
                          {new Date(selected.plan_referencia.hora_aceptacion).toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-600">No hay plan de referencia registrado.</div>
                    )}
                  </div>
                </div>

                {/* ✅ Bloque de URGENCIA MARO ROJO (obligatorio) */}
                {selectedDerived.riesgo === "ROJO" && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
                    <div className="mb-2 text-sm font-extrabold text-red-800">
                      URGENCIA (MARO ROJO) – acciones obligatorias
                    </div>
                    <ol className="list-decimal pl-5 text-sm text-red-800">
                      <li>Instrucciones claras y precisas a la paciente.</li>
                      <li>Hoja de referencia enfocada a parámetros de urgencia.</li>
                      <li>Contacto enlace zonal/regional para alertamiento.</li>
                      <li>Traslado seguro documentado.</li>
                    </ol>
                  </div>
                )}
              </Section>

              {/* Intervención estatal */}
              <Section title="Intervención Estatal (solo si hay fallo)">
                <div className="mb-2 text-xs text-slate-600">
                  Se habilita únicamente en ROJO con incongruencia o demora.
                </div>

                <div className="flex flex-wrap gap-2">
                  <Btn
                    tone="primary"
                    disabled={!selectedDerived.habilitarInterv}
                    onClick={() => agregarIntervencion("REVALORACION_INMEDIATA")}
                  >
                    Revaloración inmediata
                  </Btn>
                  <Btn
                    tone="primary"
                    disabled={!selectedDerived.habilitarInterv}
                    onClick={() => agregarIntervencion("COLEGIACION_CLINICA")}
                  >
                    Colegiación clínica
                  </Btn>
                  <Btn
                    tone="primary"
                    disabled={!selectedDerived.habilitarInterv}
                    onClick={() => agregarIntervencion("ESCALAMIENTO_REFERENCIA")}
                  >
                    Escalar referencia
                  </Btn>
                  <Btn
                    tone="ghost"
                    disabled={!selectedDerived.habilitarInterv}
                    onClick={() => agregarIntervencion("OBSERVACION_SISTEMICA")}
                  >
                    Observación sistémica
                  </Btn>
                </div>

                {!selectedDerived.habilitarInterv && (
                  <div className="mt-3 rounded bg-slate-100 px-3 py-2 text-xs text-slate-700 border border-slate-200">
                    No habilitado: requiere <b>ROJO</b> y (incongruencia o demora).
                  </div>
                )}

                <div className="mt-4">
                  <div className="text-xs font-bold text-slate-700">Intervenciones registradas</div>
                  <div className="mt-2 space-y-2">
                    {(selected.estatal?.intervenciones ?? []).map((itv: any, i: number) => (
                      <div key={`itv-${i}`} className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <Badge tone="gris">{itv.tipo}</Badge>
                          <div className="text-xs text-slate-600">
                            {itv.fecha ? new Date(itv.fecha).toLocaleString() : ""}
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-slate-800">{itv.instrucciones}</div>
                        <div className="mt-2 text-xs text-slate-600">
                          Responsable estatal:{" "}
                          <span className="font-semibold text-slate-800">{itv.responsable_estatal}</span>
                        </div>
                      </div>
                    ))}
                    {(selected.estatal?.intervenciones ?? []).length === 0 && (
                      <div className="text-sm text-slate-600">Sin intervenciones.</div>
                    )}
                  </div>
                </div>
              </Section>

              {/* Cierre */}
              <Section title="Cierre (candados)">
                {selectedDerived.bloqueo.bloqueado ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <div className="text-sm font-extrabold text-red-800">Cierre bloqueado</div>
                    <ul className="mt-2 list-disc pl-5 text-sm text-red-800">
                      {selectedDerived.bloqueo.motivos.map((m: string, i: number) => (
                        <li key={`mot-${i}`}>{m}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <div className="text-sm font-extrabold text-emerald-800">Listo para cierre</div>
                    <div className="mt-2 text-sm text-emerald-800">Cumple candados mínimos.</div>
                  </div>
                )}

                <div className="mt-3 flex items-center gap-2">
                  <Btn
                    tone="danger"
                    disabled={selectedDerived.bloqueo.bloqueado || selected.estado === "CERRADO"}
                    onClick={cerrarCaso}
                  >
                    Cerrar caso
                  </Btn>

                  {selected.estado === "CERRADO" && (
                    <Badge tone="verde">
                      CERRADO{" "}
                      {selected.closed_at ? `(${new Date(selected.closed_at).toLocaleString()})` : ""}
                    </Badge>
                  )}
                </div>
              </Section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
